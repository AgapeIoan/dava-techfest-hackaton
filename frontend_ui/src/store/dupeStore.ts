import { create } from 'zustand'

export type Address = { street: string; number: string; city: string; county: string }
export type Patient = {
  id: string; firstName: string; lastName: string; ssn?: string; dob?: string;
  phone?: string; email?: string; address?: Address;
}
export type DuplicateRow = Patient & { matchPct: number; reasons: string[] }
export type MergeContext = { keeper: Patient; candidates: DuplicateRow[] }
export type ActivityEvent = {
  id: string; keeperId: string; mergedIds: string[];
  changes: { path: string; from: string; to: string }[];
}

// 👉 Toggle pentru integrare
const USE_API = false // ← schimbă în true când ai backend-ul
const API_BASE = '/api' // cu proxy în vite.config.ts

// ---------- MOCK DB (în memorie) ----------
const INITIAL: Patient[] = [
  { id:'p1', firstName:'Raymond', lastName:'Bell', ssn:'1200659479', dob:'2007-07-10', phone:'530-98-9288', email:'raymond.bell@yahoo.com', address:{ street:'Melinda Highway', number:'441', city:'West Miguel', county:'Alabama' } },
  { id:'p2', firstName:'Raymogond', lastName:'Bell', ssn:'1200659479', dob:'2007-07-10', phone:'530-98-9292', email:'raymond.bell@yahoo.com', address:{ street:'Melinda Highway', number:'441', city:'West Miguel', county:'Alabama' } },
  { id:'p3', firstName:'Ray', lastName:'Bell', ssn:'2589668910', dob:'2008-02-01', phone:'530-98-9292', email:'ray.bell@yahoo.com', address:{ street:'Melinda Highway', number:'366', city:'East Miguel', county:'Kentucky' } },
  { id:'p4', firstName:'Alice', lastName:'Johnson', ssn:'111223333', dob:'1990-03-05', phone:'555-0101', email:'alice.j@example.com', address:{ street:'Oak Street', number:'12', city:'Springfield', county:'Illinois' } },
  { id:'p5', firstName:'Alyce', lastName:'Johnson', ssn:'111223333', dob:'1990-03-05', phone:'555-0102', email:'alice.j@example.com', address:{ street:'Oak Street', number:'12', city:'Springfield', county:'Illinois' } },
  { id:'p6', firstName:'Alicia', lastName:'Jonson', ssn:'987654321', dob:'1991-03-05', phone:'555-0101', email:'alice.j@example.com', address:{ street:'Oak St.', number:'12', city:'Springfeld', county:'Illinois' } },
  { id:'p7', firstName:'Maria', lastName:'Ionescu', ssn:'RO1234567', dob:'1985-06-12', phone:'0722-000-111', email:'maria.ionescu@gmail.com', address:{ street:'Str. Lalelelor', number:'10', city:'Cluj', county:'Cluj' } },
  { id:'p8', firstName:'Marya', lastName:'Ionescu', ssn:'RO1234567', dob:'1985-06-12', phone:'0722-000-111', email:'maria.ionescu@gmail.com', address:{ street:'Strada Lalelelor', number:'10', city:'Cluj-Napoca', county:'Cluj' } },
  { id:'p9', firstName:'Maria', lastName:'Ion', ssn:'', dob:'1985-06-12', phone:'0722-000-222', email:'m.ion@example.com', address:{ street:'Lalelelor', number:'10', city:'Cluj', county:'Cluj' } },
  { id:'p10', firstName:'John', lastName:'Doe', ssn:'777889999', dob:'1979-01-20', phone:'555-0303', email:'john.doe@example.com', address:{ street:'Elm', number:'8', city:'Riverside', county:'Ohio' } },
  { id:'p11', firstName:'Jon',  lastName:'Dough', ssn:'777889999', dob:'1979-01-20', phone:'555-0303', email:'john.doe@example.com', address:{ street:'Elm Street', number:'8', city:'Riverside', county:'Ohio' } },
]

// ---------- Helpers scoring MOCK ----------
const norm = (s?: string) => (s ?? '').toLowerCase().trim()
function levenshtein(a: string, b: string) {
  a = norm(a); b = norm(b)
  const m = a.length, n = b.length
  if (!m) return n; if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  return dp[m][n]
}
function firstNameScore(a: string, b: string) {
  const maxLen = Math.max(a.length, b.length) || 1
  const dist = levenshtein(a, b)
  const sim = 1 - dist / maxLen
  return Math.round(sim * 10) // 0..10
}
function scoreWithReasons(keeper: Patient, cand: Patient) {
  const reasons: string[] = []
  let score = 0
  if (norm(keeper.ssn) && norm(keeper.ssn) === norm(cand.ssn)) { score += 50; reasons.push('SSN match') }
  if (norm(keeper.dob) && norm(keeper.dob) === norm(cand.dob)) { score += 20; reasons.push('DOB match') }
  if (norm(keeper.email) && norm(keeper.email) === norm(cand.email)) { score += 10; reasons.push('Email match') }
  if (norm(keeper.phone) && norm(keeper.phone) === norm(cand.phone)) { score += 10; reasons.push('Phone match') }
  if (norm(keeper.lastName) === norm(cand.lastName)) { score += 5; reasons.push('Last name match') }
  const fn = firstNameScore(keeper.firstName, cand.firstName); score += fn
  if (fn >= 8) reasons.push('First name similar'); else if (fn >= 5) reasons.push('First name close')
  if (keeper.address && cand.address) {
    const addrEq = norm(keeper.address.street) === norm(cand.address.street) &&
                   norm(keeper.address.number) === norm(cand.address.number)
    if (addrEq) { score += 10; reasons.push('Address (street+number) match') }
  }
  return { score: Math.min(100, score), reasons }
}

// ---------- Tipuri Zustand ----------
type Role = 'viewer' | 'approver' | 'auditor' | 'admin'
type State = {
  db: Patient[]; lastSnapshot: Patient[] | null;
  first: string; last: string; loading: boolean; threshold: number; role: Role; toast: string | null;
  patient: Patient | null; dupes: DuplicateRow[]; selected: Record<string, boolean>; mergeCtx: MergeContext | null;
  activity: ActivityEvent[];

  setFirst: (v: string) => void; setLast: (v: string) => void; setThreshold: (v: number) => void; setRole: (r: Role) => void; clearToast: () => void;

  search: () => Promise<void>;
  findDuplicates: () => Promise<void>;
  toggleSelect: (id: string, val: boolean) => void;
  startMerge: () => void;
  applyMerge: (merged: Patient) => Promise<{ ok: boolean; keeperId: string; mergedIds: string[] }>;
  undoLastMerge: () => void;
}

// ---------- (OPȚIONAL) Funcții de API pentru integrare ----------
type ApiMatchReq = {
  record: {
    first_name:string; last_name:string; date_of_birth:string; ssn:string; phone_number:string; email:string;
    street:string; street_number:string; city:string; county:string
  };
  threshold:number; top_k:number;
}
type ApiMatchResp = { model_version:string; candidates: { id:string; match:number; reasons:string[] }[] }
type ApiApproveReq = {
  keeper_id:string; merged_ids:string[];
  chosen: {
    first_name:string; last_name:string; ssn:string; date_of_birth:string; phone_number:string; email:string;
    address:{ street:string; street_number:string; city:string; county:string }
  };
  model_version:string; client_trace_id:string;
}
type ApiApproveResp = { ok:boolean; keeper_id:string; merged_ids:string[]; activity_id:string }

async function apiMatchCandidates(payload: ApiMatchReq): Promise<ApiMatchResp> {
  const res = await fetch(`${API_BASE}/match/candidates`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('match failed')
  return res.json()
}
async function apiApproveMerge(payload: ApiApproveReq): Promise<ApiApproveResp> {
  const res = await fetch(`${API_BASE}/merge/approve`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('approve failed')
  return res.json()
}

const useDupeStore = create<State>()((set, get) => ({
  db: JSON.parse(JSON.stringify(INITIAL)),
  lastSnapshot: null,

  first: '', last: '', loading: false, threshold: 20, role: 'approver', toast: null,
  patient: null, dupes: [], selected: {}, mergeCtx: null, activity: [],

  setFirst: (v) => set({ first: v }),
  setLast:  (v) => set({ last: v }),
  setThreshold: (v) => set({ threshold: v }),
  setRole: (r) => set({ role: r }),
  clearToast: () => set({ toast: null }),

  async search() {
    const { first, last, db } = get()
    set({ loading: true })
    await new Promise(r => setTimeout(r, 250))

    // MOCK search local
    // API MODE: folosește GET /patients/search?first=...&last=... și setează `patient` din răspuns.
    const f = norm(first), l = norm(last)
    const candidates = db
      .filter(p => (!f || norm(p.firstName).includes(f)) && (!l || norm(p.lastName).includes(l)))
      .map(p => ({ p, s: firstNameScore(p.firstName, first) + (norm(p.lastName) === l ? 5 : 0) }))
      .sort((a,b) => b.s - a.s)

    const keeper = candidates.length ? candidates[0].p : null
    set({ patient: keeper, dupes: [], selected: {}, loading: false, mergeCtx: null })
  },

  async findDuplicates() {
    const { patient, threshold, db } = get(); if (!patient) return
    set({ loading: true })

    if (!USE_API) {
      // MOCK MODE: scor local
      await new Promise(r => setTimeout(r, 300))
      const rows: DuplicateRow[] = db
        .filter(p => p.id !== patient.id)
        .map(p => { const { score, reasons } = scoreWithReasons(patient, p); return { ...p, matchPct: score, reasons } })
        .filter(r => r.matchPct >= threshold)
        .sort((a,b) => b.matchPct - a.matchPct)
      set({ dupes: rows, loading: false })
      return
    }

    // API MODE: cere candidații de la backend/ML
    const payload: ApiMatchReq = {
      record: {
        first_name: patient.firstName, last_name: patient.lastName, date_of_birth: patient.dob ?? '', ssn: patient.ssn ?? '',
        phone_number: patient.phone ?? '', email: patient.email ?? '',
        street: patient.address?.street ?? '', street_number: patient.address?.number ?? '',
        city: patient.address?.city ?? '', county: patient.address?.county ?? ''
      },
      threshold: threshold/100, // dacă API-ul primește 0..1; altfel trimite threshold direct
      top_k: 50
    }
    const resp = await apiMatchCandidates(payload)

    // Variante:
    //  A) API-ul returnează DOAR id + scor + reasons → frontul mai face GET /patients/{id} pentru fiecare
    //  B) API-ul returnează deja câmpurile necesare pentru tabel (recomandat)
    //
    // Mai jos, folosim A) pe mock-ul local (ca să vezi mappingul):
    const rows: DuplicateRow[] = resp.candidates
      .map(c => {
        const p = db.find(x => x.id === c.id) // API MODE real: înlocuiește cu fetch detalii pacient
        if (!p) return null
        return { ...p, matchPct: Math.round(c.match * 100), reasons: c.reasons }
      })
      .filter(Boolean) as DuplicateRow[]
    set({ dupes: rows, loading: false })
  },

  toggleSelect(id, val) { set(s => ({ selected: { ...s.selected, [id]: val } })) },

  startMerge() {
    const { patient, dupes, selected } = get()
    if (!patient) return
    const candidates = dupes.filter(d => selected[d.id])
    if (candidates.length === 0) return
    set({ mergeCtx: { keeper: patient, candidates } })
  },

  async applyMerge(merged) {
    const { mergeCtx, db, role } = get()
    if (!mergeCtx) return { ok: false, keeperId: '', mergedIds: [] }
    if (role !== 'approver' && role !== 'admin') {
        set({ toast: 'You need approver/admin role to approve merges.' })
        return { ok: false, keeperId: '', mergedIds: [] }
        }   

    if (!USE_API) {
      // MOCK MODE: aplicăm în memorie + activity + undo
      const snapshot = JSON.parse(JSON.stringify(db)) as Patient[]
      const keeperId = mergeCtx.keeper.id
      const mergedIds = mergeCtx.candidates.map(c => c.id)

      const newDb = db.map(p => p.id === keeperId ? JSON.parse(JSON.stringify(merged)) : p)
                      .filter(p => !mergedIds.includes(p.id))

      const before = db.find(p => p.id === keeperId)!
      const changes: ActivityEvent['changes'] = []
      const pushChange = (path: string, from?: string, to?: string) => {
        if ((from ?? '') !== (to ?? '')) changes.push({ path, from: String(from ?? ''), to: String(to ?? '') })
      }
      pushChange('firstName', before.firstName, merged.firstName)
      pushChange('lastName',  before.lastName,  merged.lastName)
      pushChange('ssn',       before.ssn,       merged.ssn)
      pushChange('dob',       before.dob,       merged.dob)
      pushChange('phone',     before.phone,     merged.phone)
      pushChange('email',     before.email,     merged.email)
      pushChange('address.street', before.address?.street, merged.address?.street)
      pushChange('address.number', before.address?.number, merged.address?.number)
      pushChange('address.city',   before.address?.city,   merged.address?.city)
      pushChange('address.county', before.address?.county, merged.address?.county)

      set({ loading: true })
      await new Promise(r => setTimeout(r, 300))
      set(s => ({
        db: newDb,
        lastSnapshot: snapshot,
        patient: merged,
        dupes: s.dupes.filter(d => !mergedIds.includes(d.id)),
        selected: {},
        mergeCtx: null,
        loading: false,
        activity: [{ id: String(Date.now()), keeperId, mergedIds, changes }, ...s.activity].slice(0, 20),
        toast: `Merged ${mergedIds.length} profile(s) into ${keeperId}`,
      }))
      return { ok: true, keeperId, mergedIds }
    }

    // API MODE: POST către /api/merge/approve
    const keeperId = mergeCtx.keeper.id
    const mergedIds = mergeCtx.candidates.map(c => c.id)

    const payload: ApiApproveReq = {
      keeper_id: keeperId,
      merged_ids: mergedIds,
      chosen: {
        first_name: merged.firstName,
        last_name: merged.lastName,
        ssn: merged.ssn ?? '',
        date_of_birth: merged.dob ?? '',
        phone_number: merged.phone ?? '',
        email: merged.email ?? '',
        address: {
          street: merged.address?.street ?? '',
          street_number: merged.address?.number ?? '',
          city: merged.address?.city ?? '',
          county: merged.address?.county ?? '',
        }
      },
      model_version: 'v1.0.0',
      client_trace_id: crypto.randomUUID?.() ?? String(Date.now())
    }

    set({ loading: true })
    try {
      const resp = await apiApproveMerge(payload)
      // După răspunsul backendului, poți fie:
      //  - să refaci state-ul din răspuns (GET /patients/{keeper_id}, GET /activity),
      //  - fie să păstrezi un update optimist ca mai sus.
      set({
        loading: false,
        toast: `Merged ${resp.merged_ids.length} profile(s) into ${resp.keeper_id}`,
        mergeCtx: null,
        selected: {},
        // API MODE: recomandat să refaci `patient` și `dupes` printr-un refresh (ex: search→findDuplicates)
      })
      return { ok: true, keeperId: resp.keeper_id, mergedIds: resp.merged_ids }
    } catch (e:any) {
      set({ loading:false, toast: 'Merge failed' })
      return { ok: false, keeperId: '', mergedIds: [] }
    }
  },

  undoLastMerge() {
    const { lastSnapshot } = get()
    if (!lastSnapshot) return
    set(s => ({
      db: JSON.parse(JSON.stringify(lastSnapshot)),
      lastSnapshot: null,
      toast: 'Last merge undone.',
      dupes: [],
      selected: {},
      mergeCtx: null,
    }))
    // API MODE: aici ai face un POST /merge/undo/{activity_id}
  },
}))

export default useDupeStore
