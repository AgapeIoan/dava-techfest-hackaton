# Duplicate Profile Detector — Documentație Unificată

Acest proiect oferă o soluție completă pentru detectarea și unirea (merge) profilurilor duplicate de pacienți, incluzând generarea de date sintetice, backend FastAPI pentru deduplicare și un UI modern React + MUI + Zustand.

---

## Cuprins
- [Prezentare generală](#prezentare-generală)
- [Generator de date sintetice](#generator-de-date-sintetice)
- [Frontend (React + MUI + Zustand)](#frontend-react--mui--zustand)
- [Backend (FastAPI) — Quickstart & contract API](#backend-fastapi--quickstart--contract-api)
- [Ghid API deduplicare pacienți](#ghid-api-deduplicare-pacienți)
- [Roadmap & extensii](#roadmap--extensii)

---

## Prezentare generală
- **Scop:** Detectarea și unirea automată a profilurilor duplicate de pacienți folosind date sintetice, algoritmi ML și UI modern.
- **Stack:**
  - Frontend: React, TypeScript, MUI, Zustand, Vite
  - Backend: FastAPI, Pydantic, Uvicorn, Jellyfish
  - Data: Generator Python (Faker)

---

## Generator de date sintetice

### De ce această abordare?
- **Rapid & reproductibil:** Folosește Faker cu seed determinist pentru rezultate consistente.
- **Flexibil:** Schema include demografice și identificatori (street_number, ssn, phone_number etc).
- **Sigur:** 100% date sintetice, fără riscuri de confidențialitate.
- **Benchmark-ready:** Util pentru testarea sistemelor de deduplicare.

### Scalabilitate
- Timp de generare liniar (O(n)), eficient pentru mii/milioane de rânduri.
- Output CSV simplu, ușor de folosit în Python, SQL, Spark, ML.

### Limitări
- Distribuțiile sunt sintetice, nu reflectă corelații reale.
- SSN/phone arată valid dar nu sunt country-specific.
- Duplicatele sunt generate random (1-5 per pacient).

### Extensii posibile
- Mai multe locale, reguli pe țară, date clinice, etc.

#### Utilizare
1. Generează baza de date:
   ```bash
   python data_gen/healthcare_data_generation.py
   ```
2. Creează duplicate și erori:
   ```bash
   python data_gen/introduce_errors.py
   ```
   Output: `synthetic_patient_records_with_duplicates.csv`

---

## Frontend (React + MUI + Zustand)

UI pentru detectarea și unirea profilurilor duplicate. Rulează 100% în browser (mock DB + scoring), dar e pregătit pentru backend FastAPI + ML.

### Structură proiect
- `src/`
  - `main.tsx` — montează tema MUI + router
  - `App.tsx` — definește rutele `/duplicates` și `/merge`
  - `theme.ts`, `index.css` — temă și CSS global
  - `layout/`, `pages/`, `store/` — componente, pagini, Zustand store

### Funcționalități UI
- Search după First Name + Last Name
- Listă de duplicate cu scoruri și motive
- Export CSV, merge, undo, activity feed
- Dialoguri pentru editare/ștergere pacient
- Comutare rapidă pe API real (FastAPI)

### Pornire rapidă
```bash
cd frontend_ui
npm install
npm run dev
```
Rulează pe http://localhost:5173

#### Probleme PowerShell:
Dacă npm.ps1 e blocat:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Backend (FastAPI) — Quickstart & contract API

### Setup rapid
```bash
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn pydantic[dotenv] jellyfish
```

### Pornire
```bash
uvicorn app.main:app --reload --port 8000
```

### Contract API (exemple)
- `POST /match/candidates` — găsește duplicate
- `POST /merge/approve` — aprobă merge
- `POST /ingest/patients-csv` — importă pacienți din CSV
- `POST /dedupe/run` — rulează deduplicare
- `GET /links/clusters` — listează clustere duplicate
- `GET /export/links.csv` — exportă links CSV
- `GET /patients/search` — caută pacient după nume
- `GET /patients/{record_id}` — detalii pacient
- `PATCH /patients/{record_id}` — editează pacient
- `DELETE /patients/{record_id}` — șterge (soft) pacient

#### Exemplu request/response
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

## Ghid API deduplicare pacienți

### Endpoints principale
- `POST /ingest/patients-csv` — importă pacienți din CSV
- `POST /dedupe/run` — rulează deduplicare
- `GET /links/clusters?run_id=1` — listează clustere duplicate
- `GET /export/links.csv?run_id=1` — exportă links CSV
- `GET /patients/search?name=Kim%20Carter&run_id=1` — caută pacient
- `GET /patients/{record_id}?run_id=1` — detalii pacient
- `POST /patients/merge` — merge manual
- `PATCH /patients/{record_id}` — editează pacient
- `DELETE /patients/{record_id}` — șterge (soft) pacient
- `GET /patients/all` — toți pacienții cu info duplicate

---

## Roadmap & extensii
- Suport internațional (locale, reguli SSN/phone)
- Integrare ML avansată pentru matching
- Audit trail și rollback
- UI/UX polish, exporturi avansate

---

**Licență:** MIT

**Contact:** AgapeIoan / hackathon team
