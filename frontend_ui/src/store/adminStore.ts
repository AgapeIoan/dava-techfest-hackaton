import { create } from 'zustand';
import { API_BASE, getAuthToken } from './dupeStore';


// --- TYPE DEFINITIONS ---
// This should match the DuplicateGroupData from Admin.tsx
export interface DuplicateGroupData {
  mainProfile: any; // Replace with your actual Profile type
  duplicates: any[]; // Replace with your actual DuplicateProfile type
  confidence: 'high' | 'medium' | 'low';
}

export interface DetectionRun {
  id: number;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string; // ISO String
  completedAt?: string; // ISO String
  resultCount?: number; // How many duplicate groups were found
}

// --- PERSISTENCE HELPERS ---
const RUN_HISTORY_STORAGE_KEY = 'dupe-run-history';

function saveRunHistory(runs: DetectionRun[]) {
  try {
    localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(runs));
  } catch (e) { console.error("Failed to save run history", e); }
}

function loadRunHistory(): DetectionRun[] {
  try {
    const stored = localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DetectionRun[];
  } catch (e) { console.error("Failed to load run history", e); }
  // Pre-populate with fake historical data for a good demo!
  return [
    { id: 1, status: 'completed', progress: 100, startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86000000).toISOString(), resultCount: 487 },
    { id: 2, status: 'completed', progress: 100, startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172400000).toISOString(), resultCount: 512 },
  ];
}

// --- STORE DEFINITION ---
type AdminState = {
  runHistory: DetectionRun[];
  duplicateGroups: DuplicateGroupData[];  // state to hold fetched duplicate groups
  isLoading: boolean;   // state for loading indicator
  startDetectionJob: () => Promise<void>;
  startDetectionJobApi: () => Promise<void>; // new action for real API call
  fetchDuplicateGroups: (runId: number) => Promise<void>;  // action to fetch results
};

const useAdminStore = create<AdminState>((set, get) => ({
  runHistory: loadRunHistory(),
  duplicateGroups: [],  // initial state
  isLoading: false,     // initial state
  startDetectionJob: async () => {
    const history = get().runHistory;
    if (history.some(run => run.status === 'running')) {
      return; // A job is already running, do nothing.
    }

    const newRun: DetectionRun = {
      id: (history[0]?.id || 0) + 1,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    };

    const updatedHistory = [newRun, ...history];
    set({ runHistory: updatedHistory });
    saveRunHistory(updatedHistory);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      const currentHistory = get().runHistory;
      const runningJob = currentHistory.find(j => j.id === newRun.id);
      if (!runningJob || runningJob.progress >= 100) {
        clearInterval(progressInterval);
        return;
      }
      runningJob.progress = Math.min(runningJob.progress + 10, 100);
      set({ runHistory: [...currentHistory] });
      saveRunHistory(currentHistory);
    }, 1500); // 15-second simulation total

    // Simulate completion
    setTimeout(() => {
      clearInterval(progressInterval);
      const finalHistory = get().runHistory;
      const runningJob = finalHistory.find(j => j.id === newRun.id);
      if (runningJob) {
        runningJob.status = 'completed';
        runningJob.progress = 100;
        // THIS IS THE FIX: Capture the current time when the job is marked as complete.
        runningJob.completedAt = new Date().toISOString();
        runningJob.resultCount = Math.floor(450 + Math.random() * 100);
        set({ runHistory: [...finalHistory] });
        saveRunHistory(finalHistory);
      }
    }, 15 * 1000);
  },

  startDetectionJobApi: async () => {
    const token = getAuthToken();
    if (!token) {
      console.error("Authentication token not found.");
      return;
    }
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE}/dedupe/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // empty body
      });
      if (!response.ok) {
        let errorMsg = 'Failed to start deduplication job.';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      // Add new run to history
      const newRun: DetectionRun = {
        id: data.run_id,
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString(),
      };
      const updatedHistory = [newRun, ...get().runHistory];
      set({ runHistory: updatedHistory });
      saveRunHistory(updatedHistory);

      // Simulate progress updates (mock)
      const progressInterval = setInterval(() => {
        const currentHistory = get().runHistory;
        const runningJob = currentHistory.find(j => j.id === newRun.id);
        if (!runningJob || runningJob.progress >= 100) {
          clearInterval(progressInterval);
          return;
        }
        runningJob.progress = Math.min(runningJob.progress + 10, 100);
        set({ runHistory: [...currentHistory] });
        saveRunHistory(currentHistory);
        // Log status update to console
        console.log(`Deduplication run ${newRun.id} status: running, progress: ${runningJob.progress}%`);
      }, 1500);

      // Simulate completion
      setTimeout(() => {
        clearInterval(progressInterval);
        const finalHistory = get().runHistory;
        const runningJob = finalHistory.find(j => j.id === newRun.id);
        if (runningJob) {
          runningJob.status = 'completed';
          runningJob.progress = 100;
          runningJob.completedAt = new Date().toISOString();
          runningJob.resultCount = data.links_inserted || 0;
          set({ runHistory: [...finalHistory] });
          saveRunHistory(finalHistory);
          // Log completion to console
          console.log(`Deduplication run ${newRun.id} status: completed, progress: 100%`);
        }
      }, 15 * 1000);
    } catch (error) {
      console.error("Error starting deduplication job:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDuplicateGroups: async (runId: number) => {
    if (!runId) {
      console.error("No runId provided to fetchDuplicateGroups.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.error("Authentication token not found.");
      // You could set an error state here
      return;
    }

    set({ isLoading: true, duplicateGroups: [] }); // Set loading and clear old results

    try {
//       const response = await fetch(`${API_BASE}/patients/matches?run_id=${runId}`, {
    const response = await fetch(`${API_BASE}/patients/matches`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch results for run #${runId}.`);
      }

      const results = await response.json();
      // Map backend { patient, duplicates } to frontend { mainProfile, duplicates, confidence }
      function toCamel(obj: any) {
        if (!obj) return obj;
        const map: any = {};
        for (const k in obj) {
          const camel = k.replace(/_([a-z])/g, g => g[1].toUpperCase());
          map[camel] = obj[k];
        }
        return map;
      }
      const mappedResults = results.map((group: any) => ({
        mainProfile: toCamel(group.patient),
        duplicates: Array.isArray(group.duplicates) ? group.duplicates.map(d => ({
          ...d,
          otherPatient: toCamel(d.other_patient)
        })) : [],
        confidence: 'high', // You can add logic to set confidence based on score if needed
      }));
      set({ duplicateGroups: mappedResults });

    } catch (error) {
      console.error("Error fetching duplicate groups:", error);
      // You could set an error state here to show in the UI
    } finally {
      set({ isLoading: false }); // Always turn off loading indicator
    }
  },

  markInterruptedJobs: () => {
    const history = [...get().runHistory];
    let interrupted = false;
    for (const run of history) {
      if (run.status === 'running' && run.progress < 100) {
        run.status = 'failed';
        run.progress = 0;
        interrupted = true;
      }
    }
    if (interrupted) {
      set({ runHistory: history });
      saveRunHistory(history);
    }
    return interrupted;
  },

  resetInterruptedJobs: () => {
    const history = [...get().runHistory];
    let reset = false;
    for (const run of history) {
      if (run.status === 'running') {
        run.status = 'failed';
        run.progress = 0;
        reset = true;
      }
    }
    if (reset) {
      set({ runHistory: history });
      saveRunHistory(history);
    }
    return reset;
  },
}));



export default useAdminStore;