from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Link, ClusterAssignment
from ..schemas import LinkOut, ClustersResponse, ClusterItem

router = APIRouter(prefix="/links", tags=["links"])

@router.get("", response_model=List[LinkOut])
def list_links(
    run_id: Optional[int] = None,
    decision: Optional[str] = Query(None, pattern="^(match|review|non-match)$"),
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    q = select(Link)
    if run_id is not None:
        q = q.where(Link.run_id == run_id)
    if decision:
        q = q.where(Link.decision == decision)
    q = q.offset(offset).limit(limit)
    rows = session.exec(q).all()
    return [LinkOut.model_validate(r.__dict__) for r in rows]

@router.get("/clusters", response_model=ClustersResponse)
def get_clusters(
    run_id: int,
    session: Session = Depends(get_session)
):
    rows = session.exec(select(ClusterAssignment).where(ClusterAssignment.run_id == run_id)).all()
    if not rows:
        return ClustersResponse(clusters=[])

    # cluster_id -> [record_id]
    clusters: Dict[str, List[str]] = {}
    for a in rows:
        clusters.setdefault(a.patient_id, []).append(a.record_id)
    for k in clusters:
        clusters[k] = sorted(clusters[k])

    items = [ClusterItem(cluster_id=k, records=v) for k, v in sorted(clusters.items())]
    return ClustersResponse(clusters=items)
