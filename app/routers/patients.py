from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session, select, func
from ..utils import resolve_run_id
from ..db import get_session
from ..models import Patient, Link, ClusterAssignment, PatientMergeHistory
from ..schemas import PatientOut, DuplicateCandidate, PatientWithDuplicates, MergeRequest, MergeResponse, PatientUpdate
from ..utils import resolve_run_id
from ..services.auth_service import get_current_user
from datetime import datetime

router = APIRouter(prefix="/patients", tags=["patients"])

def _patient_to_out(p: Patient, cluster_id: Optional[str]) -> PatientOut:
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

@router.get("/search", response_model=List[PatientWithDuplicates], dependencies=[Depends(get_current_user)])
def search_by_name(
    name: str = Query(..., description="Searched name (partial or full; e.g. 'Ion Pop')"),
    run_id: Optional[int] = Query(None, description="If omitted, latest run will be used"),
    limit_patients: int = 50,
    session: Session = Depends(get_session),
):
    """
    Returns a single entry per cluster_id (or per record_id if there is no cluster),
    with duplicates unified from all records in that cluster.
    """
    run_id = resolve_run_id(session, run_id)
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

    # --- fetch cluster assignments for those patients ---
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

@router.get("/matches", response_model=List[PatientWithDuplicates], tags=["patients"], dependencies=[Depends(get_current_user)])
def list_all_matches_grouped(
    run_id: Optional[int] = Query(None, description="If omitted, latest run will be used"),
    group_by_cluster: bool = Query(True, description="If true, one entry per cluster; else per record"),
    limit_groups: int = Query(200, description="Max number of groups to return"),
    session: Session = Depends(get_session),
):
    """
    Return all 'match' links formatted like in patients.py:
      [
        {
          "patient": { ... },           # representative patient
          "duplicates": [               # only 'match' links
            { "other_record_id": ..., "decision": "match", "score": ..., "other_patient": {...} },
            ...
          ]
        },
        ...
      ]

    By default we group per cluster (one item per Pxxxxx); set group_by_cluster=false for one item per record.
    """
    run_id = resolve_run_id(session, run_id)
    # 1) collect all match links for the run
    links = session.exec(
        select(Link)
        .where(Link.run_id == run_id, Link.decision == "match")
        .order_by(Link.score.desc())
    ).all()
    if not links:
        return []

    # all record ids that appear in matches
    all_rids: set[str] = set()
    for l in links:
        all_rids.add(l.record_id1)
        all_rids.add(l.record_id2)

    # fetch patients for those ids
    pats = session.exec(select(Patient).where(Patient.record_id.in_(list(all_rids)))).all()
    rid_to_pat: Dict[str, Patient] = {p.record_id: p for p in pats}

    # cluster assignments for those ids
    assigns = session.exec(
        select(ClusterAssignment).where(
            ClusterAssignment.run_id == run_id,
            ClusterAssignment.record_id.in_(list(all_rids))
        )
    ).all()
    rid_to_cluster: Dict[str, str] = {a.record_id: a.patient_id for a in assigns}

    # group keys: cluster_id or record_id
    groups: Dict[str, List[str]] = {}
    for rid in all_rids:
        key = rid_to_cluster.get(rid) if group_by_cluster else f"RID::{rid}"
        key = key or f"RID::{rid}"  # fallback if no cluster
        groups.setdefault(key, []).append(rid)

    results: List[PatientWithDuplicates] = []

    # rank representative: pick the lexicographically smallest record_id
    def _representative(rids: List[str]) -> str:
        # you can change this to a "most connected" node if needed
        return sorted(rids)[0]

    # index links by both directions for quick lookup
    links_by_rid: Dict[str, List[Link]] = {}
    for l in links:
        links_by_rid.setdefault(l.record_id1, []).append(l)
        links_by_rid.setdefault(l.record_id2, []).append(l)

    for idx, (group_key, member_ids) in enumerate(sorted(groups.items())[:limit_groups]):
        rep_rid = _representative(member_ids)
        rep_patient = _patient_to_out(rid_to_pat.get(rep_rid), rid_to_cluster.get(rep_rid))

        # gather all links touching any member (only 'match' links already)
        best_by_other: Dict[str, Link] = {}
        for rid in member_ids:
            for l in links_by_rid.get(rid, []):
                other = l.record_id2 if l.record_id1 == rid else l.record_id1
                # keep best (highest score) per other
                cur = best_by_other.get(other)
                if (cur is None) or ((l.score or 0) > (cur.score or 0)):
                    best_by_other[other] = l

        # build duplicates list (exclude the representative itself if present)
        dups: List[DuplicateCandidate] = []
        for other_id, l in sorted(best_by_other.items(), key=lambda kv: -(kv[1].score or 0.0)):
            if other_id == rep_rid:
                continue
            other_p = rid_to_pat.get(other_id)
            dups.append(DuplicateCandidate(
                other_record_id=other_id,
                decision="match",
                score=l.score or 0.0,
                s_name=l.s_name, s_dob=l.s_dob, s_email=l.s_email, s_phone=l.s_phone,
                s_address=l.s_address, s_gender=l.s_gender, s_ssn_hard_match=l.s_ssn_hard_match,
                reason=l.reason,
                other_patient=_patient_to_out(other_p, rid_to_cluster.get(other_id)) if other_p else None,
            ))

        results.append(PatientWithDuplicates(patient=rep_patient, duplicates=dups))

    return results

@router.get("/{record_id}", response_model=PatientWithDuplicates, dependencies=[Depends(get_current_user)])
def get_patient_with_dups(
    record_id: str,
    run_id: Optional[int] = Query(None, description="If omitted, latest run will be used"),
    session: Session = Depends(get_session),
):
    run_id = resolve_run_id(session, run_id)
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

MERGE_MUTABLE_FIELDS = {
    "original_record_id", "first_name", "last_name", "gender", "date_of_birth",
    "address", "city", "county", "ssn", "phone_number", "email"
}
@router.post("/merge", response_model=MergeResponse, dependencies=[Depends(get_current_user)])
def merge_patients(
    req: MergeRequest = Body(...),
    session: Session = Depends(get_session),
):
    # 0) find master (active)
    master = session.exec(
        select(Patient).where(Patient.record_id == req.master_record_id, Patient.is_deleted == False)
    ).first()
    if not master:
        raise HTTPException(status_code=404, detail=f"Master patient {req.master_record_id} not found or deleted")

    merged_ids: List[str] = []
    now = datetime.utcnow()

    # 1) mark duplicates as deleted (soft delete) and log in history
    for dup_id in req.duplicate_record_ids:
        dup = session.exec(
            select(Patient).where(Patient.record_id == dup_id, Patient.is_deleted == False)
        ).first()
        if not dup:
            continue

        if req.hard_delete_duplicates:
            # Hard delete
            session.delete(dup)
        else:
            dup.is_deleted = True
            dup.deleted_at = now
            dup.merged_into = master.record_id
            session.add(dup)

        merged_ids.append(dup_id)

        session.add(PatientMergeHistory(
            source_record=dup_id,
            target_record=master.record_id,
            reason=req.reason
        ))

    # 2) remap links from duplicates to master
    if merged_ids:
        # all links touching any of the merged_ids
        links_touched = session.exec(
            select(Link).where((Link.record_id1.in_(merged_ids)) | (Link.record_id2.in_(merged_ids)))
        ).all()

        # remap to master
        for l in links_touched:
            if l.record_id1 in merged_ids:
                l.record_id1 = master.record_id
            if l.record_id2 in merged_ids:
                l.record_id2 = master.record_id
            session.add(l)

        # 2.a) remove self-links (record_id1 == record_id2)
        for l in list(links_touched):
            if l.record_id1 == l.record_id2:
                session.delete(l)

        # 2.b) canonize pairs (record_id1 < record_id2)
        def _canon_pair(a: str, b: str) -> tuple[str, str, bool]:
            if a <= b:
                return a, b, False
            else:
                return b, a, True

        links_with_master = session.exec(
            select(Link).where((Link.record_id1 == master.record_id) | (Link.record_id2 == master.record_id))
        ).all()

        for l in links_with_master:
            a, b, swapped = _canon_pair(l.record_id1, l.record_id2)
            if swapped:
                l.record_id1, l.record_id2 = a, b
                session.add(l)

        # 2.c) dedup: keep only the best link per (record_id1, record_id2, decision)
        best_by_key: Dict[tuple[int, str, str, str], Link] = {}

        links_with_master = session.exec(
            select(Link).where((Link.record_id1 == master.record_id) | (Link.record_id2 == master.record_id))
        ).all()

        for l in links_with_master:
            key = (l.run_id, l.record_id1, l.record_id2, l.decision)
            keep = best_by_key.get(key)
            if (keep is None) or ((l.score or 0.0) > (keep.score or 0.0)):
                best_by_key[key] = l

        # remove non-best
        best_ids = {link.id for link in best_by_key.values() if link.id is not None}
        for l in links_with_master:
            if l.id is not None and l.id not in best_ids:
                session.delete(l)

        updated_links_count = len(best_by_key)
    else:
        updated_links_count = 0

    # 3) move cluster assignments from duplicates to master
    if merged_ids:
        assigns = session.exec(
            select(ClusterAssignment).where(ClusterAssignment.record_id.in_(merged_ids))
        ).all()
        for a in assigns:
            a.record_id = master.record_id
            session.add(a)
        updated_clusters_count = len(assigns)
    else:
        updated_clusters_count = 0

    # 4) survivorship - update master with provided fields
    if req.updates:
        payload = req.updates.model_dump(exclude_unset=True)
        for field, value in payload.items():
            if field in MERGE_MUTABLE_FIELDS:
                setattr(master, field, value)

    session.add(master)
    session.commit()

    # 5) return info about the merged master
    session.refresh(master)
    master_cluster = session.exec(
        select(ClusterAssignment).where(ClusterAssignment.record_id == master.record_id)
    ).first()
    master_out = _patient_to_out(master, master_cluster.patient_id if master_cluster else None)

    return MergeResponse(
        master=master.record_id,
        merged=merged_ids,
        updated_links=updated_links_count,
        updated_clusters=updated_clusters_count,
        master_after=master_out
    )
