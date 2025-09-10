import { is } from 'date-fns/locale';
import { create } from 'zustand'

// ---------- Tipuri ----------
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

// ---------- Config API ----------
export const USE_API = true
export const API_BASE = "http://127.0.0.1:8000"

// ---------- Roluri & persistare ----------
type Role = 'receptionist' | 'admin';
const ROLE_KEY = 'dupdetector.role'
function loadRole(): Role {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(ROLE_KEY)) || 'viewer'
  return (['viewer','receptionist','approver','auditor','admin'] as Role[]).includes(v as Role) ? v as Role : 'viewer'
}
function saveRole(r: Role) { try { localStorage.setItem(ROLE_KEY, r) } catch {} }

// ---------- Auth (mock) ----------
type Auth = { isAuthenticated: boolean; userName?: string; role?: Role; token?: string; remember?: boolean; email?: string }
const AUTH_KEY = 'dupdetector.auth'


// Receptionist registration helpers
const RECEPTIONIST_KEY = 'dupdetector.receptionist';
function saveReceptionist(email: string, password: string) {
  localStorage.setItem(RECEPTIONIST_KEY, JSON.stringify({ email, password }));
}
function loadReceptionist() {
  const raw = localStorage.getItem(RECEPTIONIST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { email: string; password: string };
  } catch {
    return null;
  }
}

function loadAuth(): Auth {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return { isAuthenticated: false }
    const a = JSON.parse(raw) as Auth
    if (a.token) sessionStorage.setItem('token', a.token) // pentru fetch Authorization dacă vrei
    return a
  } catch { return { isAuthenticated: false } }
}
function saveAuth(a: Auth) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)) } catch {}
}
function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem('dupdetector.role')
  } catch {}
  try { sessionStorage.removeItem('token') } catch {}
}

export function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const auth = JSON.parse(raw) as { token?: string };
      return auth.token || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- MOCK DB ----------
const INITIAL: Patient[] = [
  { id:'p1', firstName:'Raymond', lastName:'Bell', ssn:'1200659479', dob:'2007-07-10',
    phone:'530-98-9288', email:'raymond.bell@yahoo.com',
    address:{ street:'Melinda Highway', number:'441', city:'West Miguel', county:'Alabama' } },
  { id:'p2', firstName:'Raymogond', lastName:'Bell', ssn:'1200659479', dob:'2007-07-10',
    phone:'530-98-9292', email:'raymond.bell@yahoo.com',
    address:{ street:'Melinda Highway', number:'441', city:'West Miguel', county:'Alabama' } },
  { id:'p3', firstName:'Ray', lastName:'Bell', ssn:'2589668910', dob:'2008-02-01',
    phone:'530-98-9292', email:'ray.bell@yahoo.com',
    address:{ street:'Melinda Highway', number:'366', city:'East Miguel', county:'Kentucky' } },
]

// ---------- Scoring helpers (mock) ----------
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
  return Math.round(sim * 10)
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

// ---------- Store ----------
type State = {
  db: Patient[]; lastSnapshot: Patient[] | null;
  first: string; last: string; loading: boolean; threshold: number;
  role: Role; roleSource: 'local' | 'server'; toast: string | null;

  isAuthenticated: boolean;
  userName?: string;
  email?: string;

  patient: Patient | null; dupes: DuplicateRow[]; selected: Record<string, boolean>;
  mergeCtx: MergeContext | null; activity: ActivityEvent[];
  aiSuggestion: any | null;

  setFirst: (v: string) => void; setLast: (v: string) => void;
  setThreshold: (v: number) => void; setRole: (r: Role) => void;
  clearToast: () => void;
  setToast: (message: string) => void;
  loadRoleFromServer: () => Promise<void>;

  loginWithBackend: (email: string, password: string) => void;
  logout: () => void;

  search: () => Promise<void>;
  findDuplicates: () => Promise<void>;
  toggleSelect: (id: string, val: boolean) => void;
  startMerge: () => void;
  autoMergeSelected: () => Promise<{ stopForReview: boolean } | void>;
  applyMerge: (merged: Patient) => Promise<{ ok: boolean; keeperId: string; mergedIds: string[] }>;
  undoLastMerge: () => void;
  deletePatient: (id: string) => Promise<void>;
}

// API DTOs & fetchers
type ApiMatchReq = { /* … */ record: any; threshold:number; top_k:number }
type ApiMatchResp = { model_version:string; candidates: { id:string; match:number; reasons:string[] }[] }
type ApiApproveReq = { /* … */ }
type ApiApproveResp = { ok:boolean; keeper_id:string; merged_ids:string[]; activity_id:string }

async function apiMatchCandidates(payload: ApiMatchReq): Promise<ApiMatchResp> {
  const token = sessionStorage.getItem('token')
  const res = await fetch(`${API_BASE}/match/candidates`, {
    method:'POST',
    headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('match failed')
  return res.json()
}
async function apiApproveMerge(payload: ApiApproveReq): Promise<ApiApproveResp> {
  const token = sessionStorage.getItem('token')
  const res = await fetch(`${API_BASE}/merge/approve`, {
    method:'POST',
    headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('approve failed')
  return res.json()
}

// La refresh, șterge autentificarea
clearAuth();
const initialAuth = loadAuth() // ⬅️ NEW

const useDupeStore = create<State>()((set, get) => ({
  db: JSON.parse(JSON.stringify(INITIAL)),
  lastSnapshot: null,

  first: '',
  last: '',
  loading: false,
  threshold: 20,
  role: initialAuth.isAuthenticated && initialAuth.role ? initialAuth.role : loadRole(),
  roleSource: initialAuth.isAuthenticated ? 'server' : 'local',
  isAuthenticated: initialAuth.isAuthenticated,
  userName: initialAuth.userName,
  email: initialAuth.email,
  toast: null,

  patient: null,
  dupes: [],
  selected: {},
  mergeCtx: null,
  aiSuggestion: null,
  activity: [],

  setFirst: (v: string) => set({ first: v, patient: null, dupes: [] }),
  setLast: (v: string) => set({ last: v, patient: null, dupes: [] }),
  setThreshold: (v: number) => set({ threshold: v }),
  setRole: (r: Role) => { saveRole(r); set({ role: r }); },
  clearToast: () => set({ toast: null }),
  setToast: (message: string) => set({ toast: message }),

  async loadRoleFromServer() {
    // lăsăm gol în mock; când USE_API=true poți popula din /api/me
    return;
  },

  loginWithBackend: async (email: string, password: string) => {
    // Login real cu backend (Bearer token)
    set({ loading: true });
    try {
      // Call backend directly; CORS is configured to allow it
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      if (!res.ok) {
        set({ toast: res.status === 401 ? 'Email sau parolă incorectă!' : `Login failed (${res.status})`, loading: false });
        return;
      }
      const data = await res.json();
      console.log('Login response data:', data);
      const token = data.access_token;
      const userName = data.user?.name || email;
      const role = data.role;
      sessionStorage.setItem('token', token);
      saveAuth({ isAuthenticated: true, email, userName, role, token, remember: true });
      set({ isAuthenticated: true, email, userName, role, roleSource: 'server', toast: `Signed in as ${userName}`, loading: false });
    } catch {
      set({ toast: 'Network error during login', loading: false });
    }
  },

  // Login with .env credentials for admin and receptionist
  loginWithEmail: (email: string, password: string) => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    const receptionEmail = import.meta.env.VITE_RECEPTION_EMAIL;
    const receptionPassword = import.meta.env.VITE_RECEPTION_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      const token = 'dev.admin';
      try {
        sessionStorage.setItem('token', token);
        localStorage.setItem('token', token);
      } catch {}
      const auth: Auth = {
        isAuthenticated: true,
        email,
        userName: 'Admin',
        role: 'admin',
        token,
        remember: true,
      };
      saveAuth(auth);
      set({
        isAuthenticated: true,
        email,
        userName: 'Admin',
        role: 'admin',
        roleSource: 'server',
        toast: `Signed in as Admin`,
      });
      return;
    }
    if (email === receptionEmail && password === receptionPassword) {
      const token = 'dev.receptionist';
      try {
        sessionStorage.setItem('token', token);
        localStorage.setItem('token', token);
      } catch {}
      const auth: Auth = {
        isAuthenticated: true,
        email,
        userName: 'Receptionist',
        role: 'receptionist',
        token,
        remember: true,
      };
      saveAuth(auth);
      set({
        isAuthenticated: true,
        email,
        userName: 'Receptionist',
        role: 'receptionist',
        roleSource: 'server',
        toast: `Signed in as Receptionist`,
      });
      return;
    }
    set({ toast: 'Email sau parolă incorectă!' });
  },

  logout: () => {
    clearAuth();
    set({
      isAuthenticated: false,
      email: undefined,
      userName: undefined,
      role: 'viewer',
      roleSource: 'local',
      toast: 'Signed out',
    });
  },

  //Search patients and duplicates from backend in /duplicates
  async search() {
    const { role, first, last } = get();
    console.log('search() - valori inițiale:', { role, first, last });
      if (role !== 'admin' && role !== 'receptionist') {
        set({ toast: 'Doar admin sau receptionist poate folosi search.' });
        return;
      }
      if (!first) {
        set({ toast: 'Completează prenumele!' });
        return;
      }
      set({ loading: true, patient: null, dupes: [], selected: {} });

      try {
        // Build query string for backend
        let query = encodeURIComponent(first);
        if (last) query += '%%20' + encodeURIComponent(last);
        console.log('Query trimis la backend:', query);
        const token = sessionStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/patients/search?name=${query}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (!res.ok) throw new Error('Eroare la căutare!');
        const data = await res.json();
        if (!data || !data.length) {
          set({ loading: false, toast: 'Nu s-a găsit pacientul.' });
          return;
        }
        // Map backend response to Patient and DuplicateRow
        const main = data[0];
    const patient = {
      id: main.patient.record_id,
      firstName: main.patient.first_name,
      lastName: main.patient.last_name,
      dob: main.patient.date_of_birth,
      ssn: main.patient.ssn,
      phone: main.patient.phone_number,
      email: main.patient.email,
      isdeleted: main.patient.is_deleted,
      address: {
        street: main.patient.address,
        number: '',
        city: main.patient.city,
        county: main.patient.county
      }
    };
          const dupes = (main.duplicates || [])
            .filter((d: any) => d.other_patient.is_deleted !== true)
        .map((d: any) => ({
        id: d.other_patient.record_id,
        firstName: d.other_patient.first_name,
        lastName: d.other_patient.last_name,
        dob: d.other_patient.date_of_birth,
        ssn: d.other_patient.ssn,
        phone: d.other_patient.phone_number,
        email: d.other_patient.email,
        isdeleted: d.other_patient.is_deleted,
        address: {
          street: d.other_patient.address,
          number: '',
          city: d.other_patient.city,
          county: d.other_patient.county
        },
        matchPct: d.score * 100,
        reasons: [d.reason]
      }));
        set({ patient, dupes, loading: false, toast: null });
      } catch (e) {
        set({ loading: false, toast: 'Eroare la căutare!' });
      }
  },

  async findDuplicates() {
    const { first, last, db } = get();
    set({ loading: true, patient: null, dupes: [], selected: {} });
    // Get dob from the Duplicates page state if available
    let dob = '';
    try {
      // Try to get dob from the global window (hacky, but avoids prop drilling)
      dob = window.__dupe_dob || '';
    } catch {}
    // Find all patients with matching first and last name (case-insensitive)
    let matches = db.filter(p =>
      p.firstName.toLowerCase().startsWith(first.toLowerCase()) &&
      p.lastName.toLowerCase().startsWith(last.toLowerCase())
    );
    set({ patient: matches[0] || null, dupes: matches.slice(1), loading: false, toast: matches.length ? null : 'Nu s-a găsit pacientul.' });
  },
  toggleSelect: (id: string, val: boolean) => set(s => ({ selected: { ...s.selected, [id]: val } })),
  startMerge() { /* will be set from UI with selected rows */ },
  async autoMergeSelected() {
    const { patient, dupes, role } = get();
    if (role !== 'admin') { set({ toast: 'Only admins can auto-merge.' }); return; }
    const token = sessionStorage.getItem('token');
    if (!patient) { set({ toast: 'No keeper selected' }); return; }
    const selectedIds = Object.entries(get().selected).filter(([,v])=>!!v).map(([k])=>k);
    if (selectedIds.length === 0) { set({ toast: 'Select duplicates first' }); return; }
    set({ loading: true });
    // helper: map Patient -> backend PatientRecordInput
    const toBackend = (p: Patient) => ({
      record_id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      date_of_birth: p.dob,
      address: p.address?.street ?? '',
      city: p.address?.city ?? '',
      county: p.address?.county ?? '',
      ssn: p.ssn,
      phone_number: p.phone,
      email: p.email,
      gender: (p as any).gender,
    });
    const toUpdatePayload = (gr: any, current: Patient) => {
      // Build PatientUpdate (backend) with only changed fields
      const upd: any = {};
      const map = [
        ['first_name','firstName'], ['last_name','lastName'], ['date_of_birth','dob'],
        ['address','address.street'], ['city','address.city'], ['county','address.county'],
        ['ssn','ssn'], ['phone_number','phone'], ['email','email'], ['gender','gender']
      ];
      const getVal = (obj:any, path:string) => path.split('.').reduce((o,k)=>o?.[k], obj);
      for (const [bk, fk] of map) {
        const cur = getVal(current, fk);
        const sug = gr?.[bk];
        if (sug !== undefined && sug !== null && String(sug) !== String(cur ?? '')) {
          upd[bk] = sug;
        }
      }
      return upd;
    };

    try {
      for (const id of selectedIds) {
        const dupe = dupes.find(d=>d.id===id);
        if (!dupe) continue;
        // 1) Ask AI suggestion for [keeper, dupe]
        const res = await fetch(`${API_BASE}/dedupe/suggest_merge`, {
          method:'POST', headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
          body: JSON.stringify([toBackend(patient), toBackend(dupe)])
        });
        if (!res.ok) throw new Error('AI suggestion failed');
        const suggestion = await res.json();
        if (suggestion?.human_review_required) {
          // Stop and open Merge with AI hints
          set({ mergeCtx: { keeper: patient, candidates: [dupe] }, aiSuggestion: suggestion, loading: false });
          return { stopForReview: true };
        }
        // 2) Auto-merge via backend
        const updates = toUpdatePayload(suggestion?.suggested_golden_record, patient);
        const mergeReq = {
          master_record_id: patient.id,
          duplicate_record_ids: [dupe.id],
          updates,
          reason: 'AI auto-merge'
        };
        const mres = await fetch(`${API_BASE}/patients/merge`, {
          method:'POST', headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
          body: JSON.stringify(mergeReq)
        });
        if (!mres.ok) throw new Error('Merge failed');
      }
      set({ toast: 'Auto-merge completed', loading: false });
      return { stopForReview: false };
    } catch (e) {
      console.error(e);
      set({ toast: 'Auto-merge failed', loading: false });
    }
  },
  async applyMerge(merged: Patient) {
    const { mergeCtx, role } = get();
    if (!mergeCtx) return { ok: false, keeperId: '', mergedIds: [] };
    if (role !== 'admin') {
      set({ toast: 'Only admin can approve merges.' });
      return { ok: false, keeperId: '', mergedIds: [] };
    }
    const token = sessionStorage.getItem('token');
    const updates: any = {};
    const map = [
      ['first_name','firstName'], ['last_name','lastName'], ['date_of_birth','dob'],
      ['address','address.street'], ['city','address.city'], ['county','address.county'],
      ['ssn','ssn'], ['phone_number','phone'], ['email','email']
    ];
    const getVal = (obj:any, path:string) => path.split('.').reduce((o,k)=>o?.[k], obj);
    const cur = mergeCtx.keeper;
    for (const [bk, fk] of map) {
      const curVal = getVal(cur, fk);
      const newVal = getVal(merged, fk);
      if (String(newVal ?? '') !== String(curVal ?? '')) updates[bk] = newVal ?? '';
    }
    try {
      const req = {
        master_record_id: mergeCtx.keeper.id,
        duplicate_record_ids: mergeCtx.candidates.map(c=>c.id),
        updates,
        reason: 'Manual approval after AI suggestion'
      };
      const res = await fetch(`${API_BASE}/patients/merge`, {
        method:'POST', headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify(req)
      });
      if (!res.ok) throw new Error('merge failed');
      set({ toast: 'Merge approved' });
      return { ok: true, keeperId: mergeCtx.keeper.id, mergedIds: mergeCtx.candidates.map(c=>c.id) };
    } catch (e) {
      set({ toast: 'Merge failed' });
      return { ok: false, keeperId: '', mergedIds: [] };
    }
  },
  undoLastMerge() { /* … */ },

  async deletePatient(id: string) {
    set({ loading: true });
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      // Actualizează store-ul local
      set(s => ({
        db: s.db.filter(p => p.id !== id),
        dupes: s.dupes.filter(p => p.id !== id),
        patient: s.patient && s.patient.id === id ? null : s.patient,
        toast: 'Patient deleted successfully',
        loading: false
      }));
    } catch {
      set({ toast: 'Delete failed', loading: false });
    }
  },
}));

export default useDupeStore
