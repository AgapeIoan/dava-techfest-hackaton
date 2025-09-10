from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routers import ingest, dedupe, links, export, patients, auth, patients_intake

def create_app() -> FastAPI:
    app = FastAPI(title="Patients Dedupe API", version="1.0.0")
    app.include_router(ingest.router)
    app.include_router(dedupe.router)
    app.include_router(links.router)
    app.include_router(export.router)
    app.include_router(patients.router)
    app.include_router(auth.router)
    app.include_router(patients_intake.router)
    return app

init_db()
app = create_app()

# Add CORS middleware to allow frontend requests
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#uvicorn app.main:app --reload