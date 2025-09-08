from fastapi import FastAPI
from .db import init_db
from .routers import ingest, dedupe, links, export, patients

def create_app() -> FastAPI:
    app = FastAPI(title="Patients Dedupe API", version="1.0.0")
    app.include_router(ingest.router)
    app.include_router(dedupe.router)
    app.include_router(links.router)
    app.include_router(export.router)
    app.include_router(patients.router)
    return app

init_db()
app = create_app()

#uvicorn app.main:app --reload