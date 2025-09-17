
# Duplicate Profile Detector — Unified Documentation

This project provides a complete solution for detecting and merging duplicate patient profiles, including synthetic data generation, a FastAPI backend for deduplication, and a modern React + MUI + Zustand UI.

---

## Table of Contents
- [Overview](#overview)
- [Synthetic Data Generator](#synthetic-data-generator)
- [Frontend (React + MUI + Zustand)](#frontend-react--mui--zustand)
- [Backend (FastAPI) — Quickstart & API Contract](#backend-fastapi--quickstart--api-contract)
- [Patient Deduplication API Guide](#patient-deduplication-api-guide)
- [Roadmap & Extensions](#roadmap--extensions)

---

## Overview
- **Purpose:** Automated detection and merging of duplicate patient profiles using synthetic data, ML algorithms, and a modern UI.
- **Stack:**
  - Frontend: React, TypeScript, MUI, Zustand, Vite
  - Backend: FastAPI, Pydantic, Uvicorn, Jellyfish
  - Data: Python Generator (Faker)


## Features
- **Automated Duplicate Detection:** Uses advanced algorithms to scan patient records and flag potential duplicates.
- **Manual Review & Merge:** Intuitive UI for users to review and merge duplicate profiles.
- **Reasoning & Audit Trail:** Shows reasoning for detected duplicates and logs merge actions for compliance.
- **Data Export:** Export cleaned patient data for further analysis or integration.
- **Security:** Authentication and role-based access to protect sensitive patient information.

---

## User Roles
- **Receptionist:**
  - Add new patient profiles
  - Edit existing profiles
  - Search for duplicate patient profiles by first and last name
- **Admin:**
  - Import patient data from CSV files
  - Run the duplicate detection algorithm
  - View the list of detected duplicate profiles
  - Manually merge duplicate profiles
  - Auto-merge duplicates using AI (LLM provides similarity reasoning and highlights conflicts for human intervention)


## Synthetic Data Generator

### Why this approach?
- **Fast & reproducible:** Uses Faker with deterministic seed for consistent results.
- **Flexible:** Schema includes demographics and identifiers (street_number, ssn, phone_number, etc).
- **Safe:** 100% synthetic data, no privacy risks.
- **Benchmark-ready:** Useful for testing deduplication systems.

### Scalability
- Linear generation time (O(n)), efficient for thousands/millions of rows.
- Simple CSV output, easy to use in Python, SQL, Spark, ML.

### Limitations
- Distributions are synthetic, do not reflect real-world correlations.
- SSN/phone look valid but are not country-specific.
- Duplicates are generated randomly (1-5 per patient).

### Possible Extensions
- More locales, country rules, clinical data, etc.

#### Usage
1. Generate the base dataset:
  ```bash
  python data_gen/healthcare_data_generation.py
  ```
2. Create duplicates and errors:
  ```bash
  python data_gen/introduce_errors.py
  ```
  Output: `synthetic_patient_records_with_duplicates.csv`

---


## Frontend (React + MUI + Zustand)

UI for detecting and merging duplicate profiles. Runs 100% in the browser (mock DB + scoring), but ready for FastAPI + ML backend.

### Project Structure
- `src/`
  - `main.tsx` — mounts MUI theme + router
  - `App.tsx` — defines `/duplicates` and `/merge` routes
  - `theme.ts`, `index.css` — theme and global CSS
  - `layout/`, `pages/`, `store/` — components, pages, Zustand store

### UI Features
- Search by First Name + Last Name
- List of duplicates with scores and reasons
- Export CSV, merge, undo, activity feed
- Dialogs for editing/deleting patients
- Quick switch to real API (FastAPI)

### Quick Start
```bash
cd frontend_ui
npm install
npm run dev
```
### Accessing the Application
- Open your browser and go to the frontend URL (usually http://localhost:5173).
- Log in as Receptionist (username: reception@demo.local, password: receptionpass) or Admin (username: admin@demo.local, password: adminpass) for role-specific features.

#### PowerShell Issues:
If npm.ps1 is blocked:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---


## Backend (FastAPI) — Quickstart & API Contract

### Quick Setup
```bash
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn pydantic[dotenv] jellyfish
```

### Start
```bash
uvicorn app.main:app --reload --port 8000
```

### API Contract (examples)
- `POST /match/candidates` — find duplicates
- `POST /merge/approve` — approve merge
- `POST /ingest/patients-csv` — import patients from CSV
- `POST /dedupe/run` — run deduplication
- `GET /links/clusters` — list duplicate clusters
- `GET /export/links.csv` — export links CSV
- `GET /patients/search` — search patient by name
- `GET /patients/{record_id}` — patient details
- `PATCH /patients/{record_id}` — edit patient
- `DELETE /patients/{record_id}` — soft delete patient

#### Example request/response
```json
{
  "record": {
    "first_name": "Raymond", "last_name": "Bell",
    "date_of_birth": "2007-07-10", "ssn": "1200659479",
    "phone_number": "530989292", "email": "raymond.bell@yahoo.com",
    "street": "Melinda Highway", "street_number": "441",
    "city": "West Miguel", "county": "Alabama"
  },
  "threshold": 0.7,
  "top_k": 50
}
```

---


## Patient Deduplication API Guide

### Main Endpoints
- `POST /ingest/patients-csv` — import patients from CSV
- `POST /dedupe/run` — run deduplication
- `GET /links/clusters` — list duplicate clusters
- `GET /export/links.csv` — export links CSV
- `GET /patients/search?name=Kim%20Carter` — search patient
- `GET /patients/{record_id}` — patient details
- `POST /patients/merge` — manual merge
- `PATCH /patients/{record_id}` — edit patient
- `DELETE /patients/{record_id}` — soft delete patient
- `GET /patients/all` — all patients with duplicate info

---


## Roadmap & Extensions
- International support (locales, SSN/phone rules)
- Advanced ML integration for matching
- Audit trail and rollback
- UI/UX polish, advanced exports

---

**License:** MIT

**Contact:** 
Ioan Agape / https://github.com/AgapeIoan
Irina Morosanu / https://github.com/chrnosnow
Serafim Uliuliuc / https://github.com/Serafimuli
Andrei Socoteala / https://github.com/Andreii1414
Daniela Munteanu / https://github.com/DanaMt13
Bogdan Moga / https://github.com/MogaB-x
Alexandru Baba / https://github.com/Alex-Baba