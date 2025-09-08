Duplicate Profile Detector — Frontend (React + MUI + Zustand)

Un UI pentru detectarea și unirea (“merge”) profilurilor duplicate de pacienți.
Acum rulează 100% în browser (mock DB + scoring), dar e pregătit să se conecteze la un backend FastAPI + serviciu ML.

Cuprins

Stack & obiectiv

Structura proiectului

Cum funcționează (pe scurt)

Pornire rapidă (frontend)

Scripturi utile

Funcționalități UI

Starea aplicației (Zustand)

Comutare pe API (FastAPI + ML)

Backend (FastAPI) — Quickstart & contract API

Depanare (FAQ)

Roadmap scurt

Stack & obiectiv

React + TypeScript — componente UI.

MUI — componente și temă.

Zustand — stare globală simplă (mock DB + logică).

Vite — dev server & build.

Ready for: FastAPI (Python) + model ML pentru matching.

Obiectiv: păstrăm UI-ul neschimbat și, atunci când backendul e gata, schimbăm doar 2 funcții din store pentru a lovi API-ul real.

Structura proiectului
src/
  main.tsx            # Montează tema MUI + router și pornește <App />
  App.tsx             # Definește rutele /duplicates și /merge, înfășurate în <Layout />

  theme.ts            # Tema MUI (culori, fonturi, efecte)
  index.css           # CSS global (minimal)

  layout/
    Layout.tsx        # Shell: topbar, sidebar, slider de threshold, role switch, activity, toast

  pages/
    Duplicates.tsx    # Pagina de căutare + listă de duplicate + acțiuni (export/merge)
    Merge.tsx         # Pagina de “alegere câmpuri” și Approve Merge

  store/
    dupeStore.ts      # Zustand store: mock DB, scoring, selecții, merge, undo, activity


Observație: Grid se importă din @mui/material/Grid (MUI v6).

Cum funcționează (pe scurt)

Search: cauți după First Name + Last Name. Alegem un “keeper”.

Find duplicates: calculăm scoruri (mock) pentru alți pacienți vs. keeper.

Selectezi duplicate → Merge Selected → pagina Merge (alegi valori).

Approve Merge: aplică modificările în mock DB, loghează în “Activity”, oferă Undo.

Când conectăm backendul:

findDuplicates() → cheamă POST /match/candidates (ML).

applyMerge() → cheamă POST /merge/approve (audit, idempotency).
UI-ul rămâne identic.

Pornire rapidă (frontend)
1) Instalare
npm install

2) Rulare în dev
npm run dev


Implicit rulează pe http://localhost:5173.

Windows/PowerShell: dacă npm.ps1 e blocat, rulați o singură dată ca Administrator:
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned și reporniți terminalul.

Scripturi utile

npm run dev — pornește Vite dev server.

npm run build — build de producție.

npm run preview — previzualizează build-ul local.

Funcționalități UI

Sidebar: navigație (Find Duplicates, Merge View), Match Threshold slider, Role (Viewer/Approver), Activity feed, Undo last merge.

Duplicates page:

Form de Search; card cu detalii “keeper”.

Find duplicates → tabel cu scor (“Match %”) + Reasons (chips).

Export CSV al tabelului curent.

Merge Selected (navighează la pagina Merge).

Sort simplu pe câteva coloane, skeletons & spinners la încărcare.

Merge page:

Pentru fiecare câmp (nume, DOB, SSN, adresă, contact) alegi valoarea corectă din opțiunile “keeper+candidați”.

Câmpurile schimbate sunt marcate cu “Changed”.

Approve Merge aplică unirea; Back to Duplicates revine.

Starea aplicației (Zustand)

store/dupeStore.ts conține:

Tipuri: Patient, DuplicateRow, MergeContext, ActivityEvent.

State: db (mock), first/last, patient, dupes, selected, mergeCtx, activity, lastSnapshot, loading, threshold, role, toast.

Acțiuni:

search() — găsește “keeper”.

findDuplicates() — calculează scoruri & reasons (mock) sau apelează API (când comuți).

toggleSelect() — bifezi rânduri în tabel.

startMerge() — pregătește contextul pentru pagina Merge.

applyMerge() — aplică merge (mock) sau cheamă API (/merge/approve).

undoLastMerge() — revine la snapshot (mock) – în API ar fi /merge/undo.

Important: varianta curentă este MOCK MODE. Este prevăzut un USE_API flag pentru comutare rapidă.

Comutare pe API (FastAPI + ML)

Activează proxy în vite.config.ts:

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
})


Deschide src/store/dupeStore.ts și setează:

const USE_API = true


Asigură-te că endpoint-urile backend sunt:

POST /match/candidates

POST /merge/approve

Threshold: dacă backendul primește scoruri în [0..1], store trimite threshold/100. Dacă backendul lucrează direct cu 0..100, adaptezi ușor:

// în payload:
threshold: threshold/100 // ← scoate /100 dacă API așteaptă 0..100


Rularea backendului (vezi secțiunea următoare) pe localhost:8000.
Frontul va apela /api/... și Vite va proxia către backend (fără CORS).

Atât: UI-ul nu trebuie modificat. Doar vite.config.ts + USE_API.

Backend (FastAPI) — Quickstart & contract API
1) Setup (Windows / cross-platform)
# creează env
python -m venv .venv
# activează
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install fastapi uvicorn pydantic[dotenv] jellyfish

2) main.py (schelet minimal)
# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

# --- DTOs ---
class Address(BaseModel):
    street: str = ""; street_number: str = ""; city: str = ""; county: str = ""

class Record(BaseModel):
    first_name: str = ""; last_name: str = ""; date_of_birth: str = ""; ssn: str = ""
    phone_number: str = ""; email: str = ""
    street: str = ""; street_number: str = ""; city: str = ""; county: str = ""

class Candidate(BaseModel):
    id: str; match: float; reasons: List[str]

class MatchRequest(BaseModel):
    record: Record; threshold: float = 0.7; top_k: int = 20

class MatchResponse(BaseModel):
    model_version: str; candidates: List[Candidate]

class ApproveAddress(BaseModel):
    street: str = ""; street_number: str = ""; city: str = ""; county: str = ""

class ApprovePayload(BaseModel):
    keeper_id: str; merged_ids: List[str]
    chosen: dict  # simplificat: vezi README pentru schema exactă
    model_version: str; client_trace_id: str

# --- stocare in-memory pt. demo (înlocuiește cu Postgres) ---
DB = {}  # id -> { first_name, last_name, ... }

# --- demo blocking + scoring (înlocuiește cu ML) ---
import jellyfish
def score(a: Record, b: Record):
    reasons=[]; s=0.0
    if a.ssn and a.ssn==b.ssn: s+=0.5; reasons.append("SSN match")
    if a.date_of_birth and a.date_of_birth==b.date_of_birth: s+=0.2; reasons.append("DOB match")
    if jellyfish.metaphone(a.first_name)==jellyfish.metaphone(b.first_name): s+=0.1; reasons.append("First name similar")
    if a.last_name.lower()==b.last_name.lower(): s+=0.05; reasons.append("Last name match")
    if a.phone_number and a.phone_number==b.phone_number: s+=0.1; reasons.append("Phone match")
    if (a.street.lower(),a.street_number)==(b.street.lower(),b.street_number): s+=0.05; reasons.append("Address match")
    return min(1.0,s), reasons

@app.post("/match/candidates", response_model=MatchResponse)
def find_candidates(req: MatchRequest):
    meta = jellyfish.metaphone(req.record.first_name)
    pool = [ (pid, rec) for pid,rec in DB.items()
             if jellyfish.metaphone(rec.get("first_name",""))==meta
             or rec.get("last_name","").lower()==req.record.last_name.lower() ]
    scored=[]
    for pid, rec in pool:
        m, reasons = score(req.record, Record(**rec))
        if m >= req.threshold:
            scored.append(Candidate(id=pid, match=m, reasons=reasons))
    scored.sort(key=lambda c: c.match, reverse=True)
    return MatchResponse(model_version="v1.0.0", candidates=scored[:req.top_k])

@app.post("/merge/approve")
def approve_merge(payload: ApprovePayload):
    # TODO: validați roluri, idempotency, audit, snapshot & actualizare DB
    return {"ok": True, "keeper_id": payload.keeper_id, "merged_ids": payload.merged_ids, "activity_id": "act_demo"}

3) Rulare backend
uvicorn main:app --reload --port 8000


Dacă NU folosiți proxy-ul din Vite, va trebui CORS. Cu proxy (recomandat), nu e nevoie.

4) Contract API (folosit de frontend)

POST /match/candidates

Request:

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


Response:

{
  "model_version": "v1.0.0",
  "candidates": [
    { "id": "p2", "match": 0.95, "reasons": ["SSN match","DOB match","First name similar","Address match"] },
    { "id": "p3", "match": 0.62, "reasons": ["Last name match","Phone match"] }
  ]
}


POST /merge/approve

Request:

{
  "keeper_id": "p1",
  "merged_ids": ["p2","p3"],
  "chosen": {
    "first_name":"Raymond","last_name":"Bell","ssn":"1200659479","date_of_birth":"2007-07-10",
    "phone_number":"530989292","email":"raymond.bell@yahoo.com",
    "address":{"street":"Melinda Highway","street_number":"441","city":"West Miguel","county":"Alabama"}
  },
  "model_version":"v1.0.0",
  "client_trace_id":"uuid-idempotency"
}


Response:

{ "ok": true, "keeper_id": "p1", "merged_ids": ["p2","p3"], "activity_id": "act_172..." }


Recomandat: backendul să trimită și audit, iar frontul să poată reîmprospăta patient/activity la final.