import pandas as pd
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..db import get_session
from ..models import Patient
from ..schemas import IngestResponse
from ..services.auth_service import require_role

router = APIRouter(prefix="/ingest", tags=["ingest"])

EXPECTED = [
    "record_id","original_record_id","first_name","last_name","gender","date_of_birth",
    "address","city","county","ssn","phone_number","email"
]

@router.post(
    "/patients-csv",
    response_model=IngestResponse,
    dependencies=[Depends(require_role("admin"))],
)
def ingest_patients_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    restore_deleted: bool = Query(True, description="If a soft-deleted record reappears, restore it"),
    reject_merged: bool = Query(True, description="If record was merged into another, reject updates (409)"),
    source: str | None = Query(None, description="Optional logical source label"),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    try:
        df = pd.read_csv(file.file, dtype=str).fillna("")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV read error: {e}")

    missing = set(EXPECTED) - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns in CSV: {missing}")

    inserted = updated = 0
    now = datetime.utcnow()
    src = source or file.filename

    try:
        for _, r in df.iterrows():
            rid = str(r["record_id"])
            obj = session.exec(select(Patient).where(Patient.record_id == rid)).first()

            if obj:
                # dacă recordul a fost merge-uit într-un master, protejează-l
                if obj.merged_into:
                    if reject_merged:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Record {rid} was merged into {obj.merged_into}; update rejected."
                        )
                    else:
                        # policy alternativă: propagă actualizarea către master
                        master = session.exec(
                            select(Patient).where(Patient.record_id == obj.merged_into)
                        ).first()
                        if not master:
                            raise HTTPException(
                                status_code=409,
                                detail=f"Record {rid} references missing master {obj.merged_into}."
                            )
                        target = master
                else:
                    target = obj

                # dacă era soft-deleted și apare din nou -> restore (dacă e permis)
                if target.is_deleted and restore_deleted:
                    target.is_deleted = False
                    target.deleted_at = None

                # update câmpuri
                target.original_record_id = str(r["original_record_id"])
                target.first_name = str(r["first_name"])
                target.last_name  = str(r["last_name"])
                target.gender     = str(r["gender"])
                target.date_of_birth = str(r["date_of_birth"])
                target.address    = str(r["address"])
                target.city       = str(r["city"])
                target.county     = str(r["county"])
                target.ssn        = str(r["ssn"])
                target.phone_number = str(r["phone_number"])
                target.email      = str(r["email"])
                # audit opțional
                if hasattr(target, "source"):
                    target.source = src
                if hasattr(target, "updated_at"):
                    target.updated_at = now

                updated += 1

            else:
                # insert nou
                newp = Patient(
                    record_id=rid,
                    original_record_id=str(r["original_record_id"]),
                    first_name=str(r["first_name"]),
                    last_name=str(r["last_name"]),
                    gender=str(r["gender"]),
                    date_of_birth=str(r["date_of_birth"]),
                    address=str(r["address"]),
                    city=str(r["city"]),
                    county=str(r["county"]),
                    ssn=str(r["ssn"]),
                    phone_number=str(r["phone_number"]),
                    email=str(r["email"]),
                )
                if hasattr(newp, "is_deleted"):
                    newp.is_deleted = False
                if hasattr(newp, "deleted_at"):
                    newp.deleted_at = None
                if hasattr(newp, "merged_into"):
                    newp.merged_into = None
                if hasattr(newp, "source"):
                    newp.source = src
                if hasattr(newp, "updated_at"):
                    newp.updated_at = now

                session.add(newp)
                inserted += 1

        session.commit()

    except HTTPException:
        session.rollback()
        raise
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(status_code=409, detail=f"Integrity error: {e.orig}")  # de ex. duplicate key
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Ingest error: {e}")

    return IngestResponse(inserted=inserted, updated=updated)
