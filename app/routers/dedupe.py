from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..db import get_session
from ..models import DedupeRun, Link, ClusterAssignment
from ..schemas import RunRequest
from ..utils import df_from_patients_table, links_df_to_models, clusters_to_assignments
from ..services.dedupe import run_pipeline

router = APIRouter(prefix="/dedupe", tags=["dedupe"])

@router.post("/run")
def run_dedupe(req: RunRequest, session: Session = Depends(get_session)):
    # 1) create run
    run = DedupeRun(model_version=req.model_version, strategy=req.strategy)
    session.add(run)
    session.commit()
    session.refresh(run)

    # 2) get patients from DB
    df_pat = df_from_patients_table(session)

    # 3) run pipeline
    canonical_df, links_df, clusters = run_pipeline(df_pat)

    # 4) persist links
    link_models = links_df_to_models(links_df, run_id=run.id)
    session.add_all(link_models)

    # 5) persist cluster assignments (includes singletons)
    assignments = clusters_to_assignments(clusters, run_id=run.id)
    session.add_all(assignments)

    session.commit()
    return {"run_id": run.id, "links_inserted": len(link_models), "clusters": len(clusters)}
