from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy import or_, and_
from sqlmodel import Session, select, func
from ..db import get_session
from ..models import Patient, Link, ClusterAssignment, DedupeRun
from ..schemas import PatientCreate, IntakeResult, DuplicateHit, PatientOut
from ..services.auth_service import get_current_user
from ..utils import resolve_run_id

from ..services.dedupe import (
    LINK_T, REVIEW_T, prepare_input, rec_to_text, Embedder,
    pair_features, pair_score_heuristic, digits_only, email_domain
)

import os, pickle
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import cast, Integer

def _next_record_id(session: Session) -> str:
    last: Optional[int] = session.exec(
        select(func.max(cast(Patient.record_id, Integer)))
    ).first()
    if last:
        return str(last + 1)
    return "1"



def _patient_to_out_basic(p: Patient, cluster_id: Optional[str]) -> PatientOut:
    return PatientOut(
        record_id=p.record_id,
        original_record_id=p.original_record_id,
        first_name=p.first_name,
        last_name=p.last_name,
        gender=p.gender,
        date_of_birth=p.date_of_birth,
        address=p.address,
        city=p.city,
        county=p.county,
        ssn=p.ssn,
        phone_number=p.phone_number,
        email=p.email,
        cluster_id=cluster_id,
        is_deleted=p.is_deleted,
        merged_into=p.merged_into
    )

router = APIRouter(prefix="/intake", tags=["patients"])

VEC_PATH = os.getenv("DEDUP_TFIDF_PATH", "models/latest_tfidf.pkl")

def _load_vectorizer() -> Optional[Embedder]:
    try:
        with open(VEC_PATH, "rb") as f:
            vec = pickle.load(f)
        emb = Embedder()
        emb.vec = vec
        return emb
    except Exception:
        return None

def _block_candidates(session: Session, p: PatientCreate, limit: int = 500) -> List[Patient]:
    q = select(Patient).where(Patient.is_deleted == False)

    conds = []

    # exact email
    if p.email:
        conds.append(func.lower(Patient.email) == func.lower(p.email))

        # same domain
        dom = email_domain(p.email)
        if dom:
            conds.append(func.lower(Patient.email).like(f"%@{dom}"))

    # exact SSN
    if p.ssn:
        conds.append(Patient.ssn == p.ssn)

    # phone (last 4)
    if p.phone_number:
        last4 = digits_only(p.phone_number)[-4:]
        if last4:
            normalized_phone = func.replace(
                func.replace(
                    func.replace(Patient.phone_number, "-", ""),
                    " ", ""
                ),
                "+", ""
            )
            conds.append(normalized_phone.like(f"%{last4}"))

    # dob
    if p.date_of_birth:
        conds.append(Patient.date_of_birth == p.date_of_birth)

    # name – fallback
    name_like = []
    fn = (p.first_name or "").strip().lower()
    ln = (p.last_name or "").strip().lower()
    full = (fn + " " + ln).strip()

    if fn:
        name_like.append(func.lower(Patient.first_name).like(f"%{fn}%"))
    if ln:
        name_like.append(func.lower(Patient.last_name).like(f"%{ln}%"))
    if full:
        full_name_expr = Patient.first_name + " " + Patient.last_name  # => SQLite "||"
        name_like.append(func.lower(full_name_expr).like(f"%{full}%"))

    # apply filters
    if conds or name_like:
        q = q.where(or_(*conds, *name_like))
    else:
        return []

    return session.exec(q.limit(limit)).all()

def _best_hits_for_new(new_row: dict,
                       candidates: List[Patient],
                       embedder: Optional[Embedder]) -> List[Tuple[Patient, float, dict, str]]:
    """
    Returns a hit list of (candidate, score, features, reason), sorted by score desc.
    """
    # pregătește "r1" (noul)
    import pandas as pd
    df_new = pd.DataFrame([{
        "record_id": new_row["record_id"],
        "first_name": new_row.get("first_name",""),
        "last_name": new_row.get("last_name",""),
        "gender": new_row.get("gender",""),
        "date_of_birth": new_row.get("date_of_birth",""),
        "address": new_row.get("address",""),
        "city": new_row.get("city",""),
        "county": new_row.get("county",""),
        "ssn": new_row.get("ssn",""),
        "phone_number": new_row.get("phone_number",""),
        "email": new_row.get("email",""),
        "original_record_id": new_row.get("original_record_id",""),
    }])
    df_new = prepare_input(df_new)

    # for candidates, construct a small DataFrame
    rows = []
    for c in candidates:
        rows.append({
            "record_id": c.record_id,
            "first_name": c.first_name, "last_name": c.last_name,
            "gender": c.gender, "date_of_birth": c.date_of_birth,
            "address": c.address, "city": c.city, "county": c.county,
            "ssn": c.ssn, "phone_number": c.phone_number, "email": c.email,
            "original_record_id": c.original_record_id,
        })
    import pandas as pd
    df_c = pd.DataFrame(rows) if rows else pd.DataFrame(columns=df_new.columns)
    if df_c.empty:
        return []

    df_c = prepare_input(df_c)

    if embedder is not None:
        emb_new = embedder.transform([rec_to_text(df_new.iloc[0])])
        emb_c   = embedder.transform([rec_to_text(r) for _, r in df_c.iterrows()])
    else:
        emb_new, emb_c = None, None

    hits = []
    for i, cand in enumerate(candidates):
        # prepare features
        r1 = df_new.iloc[0]
        r2 = df_c.iloc[i]
        if emb_new is not None and emb_c is not None:
            cos = float(cosine_similarity(emb_new, emb_c[i]).ravel()[0])
        else:
            cos = 0.0

        feats = pair_features(r1, r2, emb_new if emb_new is not None else [[0]],
                              emb_c[i] if emb_c is not None else [[0]])
        feats["cos_emb"] = cos

        if feats.get("ssn_hard", 0.0) == 1.0:
            score = 1.0
            decision = "match"
            reason = "ssn_hard"
        else:
            score = pair_score_heuristic(feats)
            if score >= LINK_T:
                decision = "match"; reason = "heur_link"
            elif score >= REVIEW_T:
                decision = "review"; reason = "heur_review"
            else:
                decision = "non-match"; reason = "heur_below"

        if decision in ("match", "review"):
            hits.append((cand, score, feats, reason))

    hits.sort(key=lambda x: (-x[1], x[0].record_id))
    return hits

def _attach_to_cluster_without_recluster(session: Session, run_id: int,
                                         new_record_id: str,
                                         attach_to_record_id: str) -> str:
    """
    Mapping the new_record_id to the patient_id of attach_to_record_id in the given run_id.
    """
    target_assign = session.exec(
        select(ClusterAssignment).where(
            ClusterAssignment.run_id == run_id,
            ClusterAssignment.record_id == attach_to_record_id
        )
    ).first()

    if target_assign:
        pid = target_assign.patient_id
        session.add(ClusterAssignment(run_id=run_id, record_id=new_record_id, patient_id=pid))
        session.commit()
        return pid

    last = session.exec(
        select(ClusterAssignment.patient_id)
        .where(ClusterAssignment.run_id == run_id)
        .order_by(ClusterAssignment.patient_id.desc())
        .limit(1)
    ).first()
    if last:
        try:
            n = int(last[1:]) + 1
        except:
            n = 1
    else:
        n = 1
    pid = f"P{n:05d}"

    session.add(ClusterAssignment(run_id=run_id, record_id=attach_to_record_id, patient_id=pid))
    session.add(ClusterAssignment(run_id=run_id, record_id=new_record_id, patient_id=pid))
    session.commit()
    return pid

@router.post("/add_or_check", response_model=IntakeResult, dependencies=[Depends(get_current_user)])
def add_or_check_patient(
    payload: PatientCreate = Body(...),
    run_id: Optional[int] = Query(None, description="If omitted, the latest run is used"),
    force_create_on_review: bool = Query(False, description="If review hits are found, create anyway"),
    session: Session = Depends(get_session),
):
    """
    Add a patient after checking for duplicates.
    """
    rid = payload.record_id
    if not rid:
        rid = _next_record_id(session)
        payload.record_id = rid

    existing = session.exec(
        select(Patient).where(Patient.record_id == payload.record_id, Patient.is_deleted == False)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="record_id deja există")

    run_id = resolve_run_id(session, run_id)

    # 1) blocking
    candidates = _block_candidates(session, payload, limit=500)

    # 2) local scoring
    emb = _load_vectorizer()
    new_row = payload.model_dump()
    hits = _best_hits_for_new(new_row, candidates, emb)

    # 3) decision
    match_hits = [h for h in hits if h[1] >= LINK_T]
    review_hits = [h for h in hits if (REVIEW_T <= h[1] < LINK_T)]

    if match_hits:
        # choose the best match
        best = match_hits[0]
        best_rec: Patient = best[0]
        best_score = best[1]
        best_reason = best[3]

        target_assign = session.exec(
            select(ClusterAssignment).where(
                ClusterAssignment.run_id == run_id,
                ClusterAssignment.record_id == best_rec.record_id
            )
        ).first()
        existing_pid = target_assign.patient_id if target_assign else None

        best_out = _patient_to_out_basic(best_rec, existing_pid)

        top_hits = []
        for cand, sc, _fe, rs in match_hits[:3]:
            ta = session.exec(
                select(ClusterAssignment).where(
                    ClusterAssignment.run_id == run_id,
                    ClusterAssignment.record_id == cand.record_id
                )
            ).first()
            cid = ta.patient_id if ta else None
            top_hits.append(DuplicateHit(
                other_record_id=cand.record_id,
                decision="match",
                score=float(sc),
                reason=rs,
                other_patient=_patient_to_out_basic(cand, cid)
            ))

        return IntakeResult(
            created=False,
            record_id=payload.record_id,
            decision="duplicate_found",
            patient_id=existing_pid,
            duplicates=top_hits,
            message=(
                "This profile appears to be a duplicate of an existing patient."
                " A profile was not created."
            )
        )

    if review_hits and not force_create_on_review:
        dups = [DuplicateHit(other_record_id=h[0].record_id, decision="review", score=float(h[1]), reason=h[3])
                for h in review_hits[:10]]
        return IntakeResult(
            created=False,
            record_id=payload.record_id,
            decision="review_required",
            patient_id=None,
            duplicates=dups
        )

    p = Patient(**new_row, is_deleted=False)
    session.add(p)
    session.commit()

    pid = _attach_to_cluster_without_recluster(session, run_id, payload.record_id, attach_to_record_id=payload.record_id)

    return IntakeResult(
        created=True,
        record_id=payload.record_id,
        decision="created",
        patient_id=pid,
        duplicates=[]
    )

@router.post("/force_add", response_model=PatientOut, dependencies=[Depends(get_current_user)])
def force_add_patient(
    payload: PatientCreate = Body(...),
    run_id: Optional[int] = Query(None, description="If omitted, the latest run is used"),
    session: Session = Depends(get_session),
):
    """
    Add a patient without any duplicate checks.
    """
    run_id = resolve_run_id(session, run_id)

    new_rid = payload.record_id
    if not new_rid:
        new_rid = _next_record_id(session)

    p = Patient(
        record_id=new_rid,
        original_record_id=payload.original_record_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
        city=payload.city,
        county=payload.county,
        ssn=payload.ssn,
        phone_number=payload.phone_number,
        email=payload.email,
        is_deleted=False,
    )
    session.add(p)
    session.commit()
    session.refresh(p)

    pid = _attach_to_cluster_without_recluster(
        session=session,
        run_id=run_id,
        new_record_id=new_rid,
        attach_to_record_id=new_rid,
    )

    out = _patient_to_out_basic(p, pid)
    return out