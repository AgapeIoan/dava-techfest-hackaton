from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class RunRequest(BaseModel):
    model_version: Optional[str] = "v1"
    strategy: Optional[str] = "full"

class LinkOut(BaseModel):
    id: int
    run_id: int
    record_id1: str
    record_id2: str
    score: Optional[float]
    decision: str
    s_name: Optional[float]
    s_dob: Optional[float]
    s_email: Optional[float]
    s_phone: Optional[float]
    s_address: Optional[float]
    s_gender: Optional[float]
    s_ssn_hard_match: Optional[float]
    reason: Optional[str]
    patient_id1: Optional[str]
    patient_id2: Optional[str]

class ClusterItem(BaseModel):
    cluster_id: str
    records: List[str]

class ClustersResponse(BaseModel):
    clusters: List[ClusterItem]

class IngestResponse(BaseModel):
    inserted: int
    updated: int = 0

class PatientOut(BaseModel):
    record_id: str
    original_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    street: Optional[str] = None
    street_number: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    ssn: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    cluster_id: Optional[str] = None

class DuplicateCandidate(BaseModel):
    other_record_id: str
    decision: str          # match | review
    score: float
    s_name: float | None = None
    s_dob: float | None = None
    s_email: float | None = None
    s_phone: float | None = None
    s_address: float | None = None
    s_gender: float | None = None
    s_ssn_hard_match: float | None = None
    reason: str | None = None
    other_patient: PatientOut | None = None

class PatientWithDuplicates(BaseModel):
    patient: PatientOut
    duplicates: List[DuplicateCandidate] = []