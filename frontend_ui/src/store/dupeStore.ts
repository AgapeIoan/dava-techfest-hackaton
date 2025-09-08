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
const USE_API = false
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

// ---------- Roluri & persistare ----------
type Role = 'viewer' | 'receptionist' | 'approver' | 'auditor' | 'admin';
const ROLE_KEY = 'dupdetector.role'
function loadRole(): Role {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(ROLE_KEY)) || 'viewer'
  return (['viewer','receptionist','approver','auditor','admin'] as Role[]).includes(v as Role) ? v as Role : 'viewer'
}
function saveRole(r: Role) { try { localStorage.setItem(ROLE_KEY, r) } catch {} }

// ---------- Auth (mock) ----------
type Auth = { isAuthenticated: boolean; userName?: string; role?: Role; token?: string; remember?: boolean; email?: string }
const AUTH_KEY = 'dupdetector.auth' // ⬅️ NEW


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

  // ⬅️ NEW (auth)
  isAuthenticated: boolean;
  userName?: string;
  email?: string;

  patient: Patient | null; dupes: DuplicateRow[]; selected: Record<string, boolean>;
  mergeCtx: MergeContext | null; activity: ActivityEvent[];

  setFirst: (v: string) => void; setLast: (v: string) => void;
  setThreshold: (v: number) => void; setRole: (r: Role) => void;
  clearToast: () => void;
  loadRoleFromServer: () => Promise<void>;

  loginWithEmail: (email: string, password: string) => void;
  logout: () => void;

  search: () => Promise<void>;
  findDuplicates: () => Promise<void>;
  toggleSelect: (id: string, val: boolean) => void;
  startMerge: () => void;
  applyMerge: (merged: Patient) => Promise<{ ok: boolean; keeperId: string; mergedIds: string[] }>;
  undoLastMerge: () => void;
}

// API DTOs & fetchers (nemodificate față de versiunea ta) …
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
  activity: [],

  setFirst: (v: string) => set({ first: v, patient: null, dupes: [] }),
  setLast: (v: string) => set({ last: v, patient: null, dupes: [] }),
  setThreshold: (v: number) => set({ threshold: v }),
  setRole: (r: Role) => { saveRole(r); set({ role: r }); },
  clearToast: () => set({ toast: null }),

  async loadRoleFromServer() {
    // lăsăm gol în mock; când USE_API=true poți popula din /api/me
    return;
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

  async search() {
    const { role, first, last, db } = get();
    if (role !== 'admin' && role !== 'receptionist') {
      set({ toast: 'Doar admin sau receptionist poate folosi search.' });
      return;
    }
    if (!first || !last) {
      set({ toast: 'Completează numele și prenumele!' });
      return;
    }
    set({ loading: true, patient: null, dupes: [], selected: {} });
    // MOCK: caută pacientul după first+last
    const patient = db.find(p => p.firstName.toLowerCase() === first.toLowerCase() && p.lastName.toLowerCase() === last.toLowerCase());
    if (!patient) {
      set({ loading: false, toast: 'Nu s-a găsit pacientul.' });
      return;
    }
    set({ patient, loading: false, toast: null });
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
      p.firstName.toLowerCase() === first.toLowerCase() &&
      p.lastName.toLowerCase() === last.toLowerCase()
    );
    // If dob is provided, sort matches so exact dob comes first
    if (dob) {
      matches = matches.sort((a, b) => {
        if (a.dob === dob && b.dob !== dob) return -1;
        if (a.dob !== dob && b.dob === dob) return 1;
        return 0;
      });
    }
    const patient = matches[0] || null;
    set({ patient, loading: false, toast: patient ? null : 'Nu s-a găsit pacientul.' });
  },
  toggleSelect: (id: string, val: boolean) => set(s => ({ selected: { ...s.selected, [id]: val } })),
  startMerge() { /* … */ },
  async applyMerge(merged: Patient) {
    const { mergeCtx, role } = get();
    if (!mergeCtx) return { ok: false, keeperId: '', mergedIds: [] };
    if (role !== 'approver' && role !== 'admin') {
      set({ toast: 'You need approver/admin role to approve merges.' });
      return { ok: false, keeperId: '', mergedIds: [] };
    }
    // … restul logicii tale (mock/API) …
    return { ok: true, keeperId: '', mergedIds: [] }; // placeholder – păstrează implementarea ta
  },
  undoLastMerge() { /* … */ },
}));

export default useDupeStore
