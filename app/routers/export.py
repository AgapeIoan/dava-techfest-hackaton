from io import StringIO
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from ..utils import resolve_run_id
from ..db import get_session
from ..models import Link
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/links.csv",  dependencies=[Depends(get_current_user)])
def export_links_csv(
    run_id: int | None = Query(None, description="If omitted, latest run will be used"),
    session: Session = Depends(get_session),
):
    run_id = resolve_run_id(session, run_id)
    rows = session.exec(select(Link).where(Link.run_id == run_id)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Nu există link-uri pentru run_id")
    df = pd.DataFrame([{
        "record_id1": r.record_id1,
        "record_id2": r.record_id2,
        "score": r.score,
        "decision": r.decision,
        "s_name": r.s_name,
        "s_dob": r.s_dob,
        "s_email": r.s_email,
        "s_phone": r.s_phone,
        "s_address": r.s_address,
        "s_gender": r.s_gender,
        "s_ssn_hard_match": r.s_ssn_hard_match,
        "reason": r.reason,
        "patient_id1": r.patient_id1,
        "patient_id2": r.patient_id2
    } for r in rows])
    f = StringIO()
    df.to_csv(f, index=False)
    f.seek(0)
    return StreamingResponse(
        f, media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=patients_links_run_{run_id}.csv"}
    )
