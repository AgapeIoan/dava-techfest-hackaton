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
    restored: int = 0
    soft_deleted: int = 0
    unchanged: int = 0
    batch_id: Optional[int] = None

class PatientOut(BaseModel):
    record_id: str
    original_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    ssn: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    cluster_id: Optional[str] = None
    is_deleted: Optional[bool] = None
    merged_into: Optional[str] = None

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


class PatientUpdate(BaseModel):
    original_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    ssn: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class MergeRequest(BaseModel):
    master_record_id: str
    duplicate_record_ids: List[str]
    updates: Optional[PatientUpdate] = None
    reason: Optional[str] = None
    hard_delete_duplicates: Optional[bool] = False

class MergeResponse(BaseModel):
    master: str
    merged: List[str]
    updated_links: int
    updated_clusters: int
    master_after: Optional["PatientOut"] = None

class PatientRecordInput(PatientOut):
    pass

class AIFieldResolution(BaseModel):
    field_name: str
    value_A: Any
    value_B: Any
    chosen_value: Any
    justification: str

class AIMergeSuggestionResponse(BaseModel):
    suggested_golden_record: PatientOut
    human_review_required: bool
    conflicts_resolved: List[AIFieldResolution]
    processing_log: List[str]

class PatientCreate(BaseModel):
    record_id: Optional[str] = None
    original_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    ssn: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class DuplicateHit(BaseModel):
    other_record_id: str
    decision: str  # match | review
    score: float
    reason: Optional[str] = None
    other_patient: Optional[PatientOut] = None

class IntakeResult(BaseModel):
    created: bool
    record_id: str
    decision: str                 # created | attached_to_cluster | review_required
    patient_id: Optional[str] = None
    duplicates: List[DuplicateHit] = Field(default_factory=list)
    message: Optional[str] = None