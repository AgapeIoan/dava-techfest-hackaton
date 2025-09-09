from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import CheckConstraint

# Patients imported - CSV
class Patient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    record_id: str = Field(index=True, nullable=False, unique=True)
    original_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    ssn: Optional[str] = Field(default=None, index=True)
    phone_number: Optional[str] = None
    email: Optional[str] = Field(default=None, index=True)
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: Optional[datetime] = None
    merged_into: Optional[str] = Field(default=None, index=True)

# Dedupe runs metadata
class DedupeRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: Optional[str] = Field(default="v1")
    strategy: Optional[str] = Field(default="full")

# Links (pairs) results
class Link(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint("record_id1 <> record_id2", name="ck_links_no_self_loop"),
    )
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(index=True)
    record_id1: str
    record_id2: str
    score: Optional[float] = None
    decision: str  # match | review | non-match

    s_name: Optional[float] = None
    s_dob: Optional[float] = None
    s_email: Optional[float] = None
    s_phone: Optional[float] = None
    s_address: Optional[float] = None
    s_gender: Optional[float] = None
    s_ssn_hard_match: Optional[float] = None  # keep as float (0/1) as in output

    reason: Optional[str] = None
    patient_id1: Optional[str] = None
    patient_id2: Optional[str] = None

# Cluster assignments for ALL records (includes singletons)
class ClusterAssignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(index=True)
    record_id: str = Field(index=True)
    patient_id: str = Field(index=True)  # P00001 etc.

class PatientMergeHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source_record: str
    target_record: str
    run_id: Optional[int] = None
    reason: Optional[str] = None

