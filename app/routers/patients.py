from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func

from ..db import get_session
from ..models import Patient, Link, ClusterAssignment
from ..schemas import PatientOut, DuplicateCandidate, PatientWithDuplicates

router = APIRouter(prefix="/patients", tags=["patients"])

def _patient_to_out(p: Patient, cluster_id: Optional[str]) -> PatientOut:
    return PatientOut(
        record_id=p.record_id,
        original_record_id=p.original_record_id,
        first_name=p.first_name,
        last_name=p.last_name,
        gender=p.gender,
        date_of_birth=p.date_of_birth,
        street=p.street,
        street_number=p.street_number,
        city=p.city,
        county=p.county,
        ssn=p.ssn,
        phone_number=p.phone_number,
        email=p.email,
        cluster_id=cluster_id
    )

@router.get("/search", response_model=List[PatientWithDuplicates])
@router.get("/search", response_model=List[PatientWithDuplicates])
def search_by_name(
    name: str = Query(..., description="Numele căutat (parțial sau complet; ex: 'Ion Pop')"),
    run_id: int = Query(..., description="run_id din care vrei clusterele și link-urile"),
    limit_patients: int = 50,
    session: Session = Depends(get_session),
):
    """
    Returnează o singură intrare per cluster_id (sau per record_id dacă nu există cluster),
    cu duplicatele unificate din toate recordurile din acel cluster.
    """
    name_norm = name.strip().lower()
    name_q = f"%{name_norm}%"

    full_name_expr = func.lower(func.concat(Patient.first_name, " ", Patient.last_name))
    q = (
        select(Patient)
        .where(
            (func.lower(Patient.first_name).like(name_q)) |
            (func.lower(Patient.last_name).like(name_q)) |
            (full_name_expr.like(name_q))
        )
        .limit(limit_patients)
    )
    patients = session.exec(q).all()
    if not patients:
        return []

    # cluster pentru toți candidații
    record_ids = [p.record_id for p in patients]
    assigns = session.exec(
        select(ClusterAssignment).where(
            ClusterAssignment.run_id == run_id,
            ClusterAssignment.record_id.in_(record_ids)
        )
    ).all()
    rid_to_cluster = {a.record_id: a.patient_id for a in assigns}

    # --- group by cluster_id (fallback: record_id if no cluster) ---
    groups: dict[str, list[Patient]] = {}
    for p in patients:
        cid = rid_to_cluster.get(p.record_id) or f"RID::{p.record_id}"
        groups.setdefault(cid, []).append(p)

    results: List[PatientWithDuplicates] = []

    # helper: simple relevance score for the searched text
    def relevance_score(p: Patient) -> int:
        # exact match last, first last etc. to choose the most "natural" representative
        fn = (p.first_name or "").lower()
        ln = (p.last_name or "").lower()
        full = f"{fn} {ln}".strip()
        score = 0
        if name_norm == full: score += 100
        if name_norm in full: score += 10
        if name_norm in fn: score += 5
        if name_norm in ln: score += 5
        return score

    for cluster_key, members in groups.items():
        # choose representative
        rep = sorted(members, key=lambda x: (-relevance_score(x), x.record_id))[0]
        cluster_id = None if cluster_key.startswith("RID::") else cluster_key
        patient_out = _patient_to_out(rep, cluster_id)

        # --- gather links for ALL group members ---
        member_ids = [m.record_id for m in members]
        links = session.exec(
            select(Link)
            .where(
                Link.run_id == run_id,
                Link.decision.in_(('match', 'review')),
                (Link.record_id1.in_(member_ids)) | (Link.record_id2.in_(member_ids))
            )
        ).all()

        # remove internal pairs (within the same cluster)
        # 1) need cluster for "others"
        other_ids = set()
        for l in links:
            other_ids.add(l.record_id1)
            other_ids.add(l.record_id2)
        other_ids -= set(member_ids)

        if other_ids:
            others_assigns = session.exec(
                select(ClusterAssignment).where(
                    ClusterAssignment.run_id == run_id,
                    ClusterAssignment.record_id.in_(list(other_ids))
                )
            ).all()
            rid_to_cluster_other = {a.record_id: a.patient_id for a in others_assigns}
        else:
            rid_to_cluster_other = {}

        # build unique map other_record_id -> best link (by decision, then score)
        def rank(l: Link) -> tuple:
            # match > review, score descending
            return (0 if l.decision == 'match' else 1, -(l.score or 0.0))

        best_by_other: dict[str, Link] = {}

        for l in links:
            if l.record_id1 in member_ids:
                other_id = l.record_id2
            else:
                other_id = l.record_id1

            cur_best = best_by_other.get(other_id)
            if (cur_best is None) or (rank(l) < rank(cur_best)):
                best_by_other[other_id] = l

        # get details for "other"
        others_pat = []
        if best_by_other:
            others_pat = session.exec(
                select(Patient).where(Patient.record_id.in_(list(best_by_other.keys())))
            ).all()
        rid_to_patient = {op.record_id: op for op in others_pat}

        dups: List[DuplicateCandidate] = []
        # order: first match, then review; score descending
        for other_id, l in sorted(best_by_other.items(), key=lambda kv: (kv[1].decision != 'match', -(kv[1].score or 0.0))):
            op = rid_to_patient.get(other_id)
            other_cluster = rid_to_cluster_other.get(other_id)
            op_out = _patient_to_out(op, other_cluster) if op else None

            dups.append(DuplicateCandidate(
                other_record_id=other_id,
                decision=l.decision,
                score=l.score or 0.0,
                s_name=l.s_name, s_dob=l.s_dob, s_email=l.s_email, s_phone=l.s_phone,
                s_address=l.s_address, s_gender=l.s_gender, s_ssn_hard_match=l.s_ssn_hard_match,
                reason=l.reason,
                other_patient=op_out
            ))

        results.append(PatientWithDuplicates(patient=patient_out, duplicates=dups))

    return results


@router.get("/{record_id}", response_model=PatientWithDuplicates)
def get_patient_with_dups(
    record_id: str,
    run_id: int = Query(..., description="run_id din care vrei clusterele și link-urile"),
    session: Session = Depends(get_session),
):
    p = session.exec(select(Patient).where(Patient.record_id == record_id)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pacientul nu există")

    cluster = session.exec(
        select(ClusterAssignment).where(
            ClusterAssignment.run_id == run_id,
            ClusterAssignment.record_id == record_id
        )
    ).first()
    patient_out = _patient_to_out(p, cluster.patient_id if cluster else None)

    links = session.exec(
        select(Link)
        .where(
            Link.run_id == run_id,
            Link.decision.in_(("match", "review")),
            ((Link.record_id1 == record_id) | (Link.record_id2 == record_id))
        )
        .order_by(Link.decision.desc(), Link.score.desc())
    ).all()

    dups: List[DuplicateCandidate] = []
    if links:
        others = [ (l.record_id2 if l.record_id1 == record_id else l.record_id1) for l in links ]
        others_pat = session.exec(select(Patient).where(Patient.record_id.in_(others))).all()
        rid_to_patient = {op.record_id: op for op in others_pat}
        others_assigns = session.exec(
            select(ClusterAssignment).where(
                ClusterAssignment.run_id == run_id,
                ClusterAssignment.record_id.in_(others)
            )
        ).all()
        rid_to_cluster_other = {a.record_id: a.patient_id for a in others_assigns}

        for l in links:
            other_id = l.record_id2 if l.record_id1 == record_id else l.record_id1
            op = rid_to_patient.get(other_id)
            op_out = _patient_to_out(op, rid_to_cluster_other.get(other_id)) if op else None

            dups.append(DuplicateCandidate(
                other_record_id=other_id,
                decision=l.decision,
                score=l.score or 0.0,
                s_name=l.s_name, s_dob=l.s_dob, s_email=l.s_email, s_phone=l.s_phone,
                s_address=l.s_address, s_gender=l.s_gender, s_ssn_hard_match=l.s_ssn_hard_match,
                reason=l.reason,
                other_patient=op_out
            ))

    return PatientWithDuplicates(patient=patient_out, duplicates=dups)
