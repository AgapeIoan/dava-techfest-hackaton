from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from ..db import get_session
from ..models import DedupeRun, Link, ClusterAssignment
from ..schemas import RunRequest
from ..utils import df_from_patients_table, links_df_to_models, clusters_to_assignments
from ..services.dedupe import run_pipeline 
from ..services.auth_service import require_role
from ..schemas import PatientRecordInput, AIMergeSuggestionResponse
from ..services.dedupe import suggest_ai_merge

router = APIRouter(prefix="/dedupe", tags=["dedupe"])

@router.post("/run", dependencies=[Depends(require_role("admin"))])
def run_dedupe(session: Session = Depends(get_session)):
    # 1) create run
    run = DedupeRun(model_version="v1", strategy="full")
    session.add(run)
    session.commit()
    session.refresh(run)

    # 2) get patients from DB
    df_pat = df_from_patients_table(session)

    # 3) run pipeline
    links_df, clusters = run_pipeline(df_pat)

    # 4) persist links
    link_models = links_df_to_models(links_df, run_id=run.id)
    session.add_all(link_models)

    # 5) persist cluster assignments (includes singletons)
    assignments = clusters_to_assignments(clusters, run_id=run.id)
    session.add_all(assignments)

    session.commit()
    return {"run_id": run.id, "links_inserted": len(link_models), "clusters": len(clusters)}


@router.post("/suggest_merge", response_model=AIMergeSuggestionResponse, tags=["AI Steward"])
def ai_powered_merge_suggestion(records: List[PatientRecordInput]):
    """
    Primeste un cluster de inregistrari (N > 1) si foloseste AI-ul pentru a
    sugera un Golden Record. Acest endpoint este ideal pentru a asista
    un operator uman in decizia de fuziune a inregistrarilor marcate pentru 'review'.
    """
    if len(records) < 2:
        raise HTTPException(status_code=400,
                            detail="Este necesar un minim de 2 inregistrari pentru o sugestie de fuziune.")

    # Convertim modelele Pydantic in dictionare simple
    records_as_dicts = [rec.model_dump() for rec in records]

    # Apelam serviciul care contine logica AI
    suggestion = suggest_ai_merge(records_as_dicts)

    if not suggestion or not suggestion.get("suggested_golden_record"):
        raise HTTPException(status_code=500, detail="A aparut o eroare in timpul generarii sugestiei AI.")

    return suggestion