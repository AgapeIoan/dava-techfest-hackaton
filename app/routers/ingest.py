import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Patient
from ..schemas import IngestResponse

router = APIRouter(prefix="/ingest", tags=["ingest"])

EXPECTED = [
    "record_id","original_record_id","first_name","last_name","gender","date_of_birth",
    "address","city","county","ssn","phone_number","email"
]

@router.post("/patients-csv", response_model=IngestResponse)
def ingest_patients_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    df = pd.read_csv(file.file, dtype=str).fillna("")
    missing = set(EXPECTED) - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns in CSV: {missing}")

    # simple upsert by record_id
    #existing = {rid for (rid,) in session.exec(select(Patient.record_id)).all()}
    inserted = 0
    updated = 0

    for _, r in df.iterrows():
        rid = str(r["record_id"])
        obj = session.exec(select(Patient).where(Patient.record_id == rid)).first()
        if obj:
            # update
            for col in EXPECTED:
                setattr(obj, col if col != "record_id" else "record_id", str(r[col]))
            updated += 1
        else:
            session.add(Patient(
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
            ))
            inserted += 1

    session.commit()
    return IngestResponse(inserted=inserted, updated=updated)
