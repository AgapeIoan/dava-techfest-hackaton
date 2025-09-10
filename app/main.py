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
# Allow common localhost hosts on any port (Vite may use 5173, 5174, etc.)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    # Open CORS for local development across any port/host
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

#uvicorn app.main:app --reload
