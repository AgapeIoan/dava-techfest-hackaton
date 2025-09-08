import pandas as pd
from fastapi import HTTPException
from sqlmodel import Session, select
from .models import Patient, Link, ClusterAssignment

PATIENTS_COLUMNS = [
    "record_id","original_record_id","first_name","last_name","gender","date_of_birth",
    "street","street_number","city","county","ssn","phone_number","email"
]

def df_from_patients_table(session: Session) -> pd.DataFrame:
    rows = session.exec(select(Patient)).all()
    if not rows:
        return pd.DataFrame(columns=PATIENTS_COLUMNS)
    df = pd.DataFrame([r.__dict__ for r in rows])
    return df[PATIENTS_COLUMNS]

def links_df_to_models(df: pd.DataFrame, run_id: int) -> list[Link]:
    needed = {
        "record_id1","record_id2","score","decision","s_name","s_dob","s_email","s_phone",
        "s_address","s_gender","s_ssn_hard_match","reason","patient_id1","patient_id2"
    }

    if "reason" not in df.columns and "reson" in df.columns:
        df = df.rename(columns={"reson": "reason"})
    missing = needed - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Lipsesc coloane în links DF: {missing}")

    out = []
    for _, r in df.iterrows():
        out.append(Link(
            run_id=run_id,
            record_id1=str(r["record_id1"]),
            record_id2=str(r["record_id2"]),
            score=float(r["score"]) if pd.notnull(r["score"]) else None,
            decision=str(r["decision"]),
            s_name=float(r["s_name"]) if pd.notnull(r["s_name"]) else None,
            s_dob=float(r["s_dob"]) if pd.notnull(r["s_dob"]) else None,
            s_email=float(r["s_email"]) if pd.notnull(r["s_email"]) else None,
            s_phone=float(r["s_phone"]) if pd.notnull(r["s_phone"]) else None,
            s_address=float(r["s_address"]) if pd.notnull(r["s_address"]) else None,
            s_gender=float(r["s_gender"]) if pd.notnull(r["s_gender"]) else None,
            s_ssn_hard_match=float(r["s_ssn_hard_match"]) if pd.notnull(r["s_ssn_hard_match"]) else None,
            reason=str(r["reason"]) if pd.notnull(r["reason"]) else None,
            patient_id1=str(r["patient_id1"]) if pd.notnull(r["patient_id1"]) else None,
            patient_id2=str(r["patient_id2"]) if pd.notnull(r["patient_id2"]) else None,
        ))
    return out

def clusters_to_assignments(clusters: list[list[str]], run_id: int) -> list[ClusterAssignment]:
    assignments: list[ClusterAssignment] = []
    for idx, members in enumerate(clusters, start=1):
        pid = f"P{idx:05d}"
        for rid in members:
            assignments.append(ClusterAssignment(run_id=run_id, record_id=str(rid), patient_id=pid))
    return assignments
