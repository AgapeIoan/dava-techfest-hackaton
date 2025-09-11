import { create } from 'zustand';
import { API_BASE, getAuthToken } from './dupeStore';


// --- TYPE DEFINITIONS ---
// This should match the DuplicateGroupData from Admin.tsx
export interface DuplicateGroupData {
  mainProfile: any; // Replace with the actual Profile type
  duplicates: any[]; // Replace with the actual DuplicateProfile type
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
  // Start with an empty history for a clean demo
  return [];
}

// --- STORE DEFINITION ---
type AdminState = {
  runHistory: DetectionRun[];
  runCounter: number;
  duplicateGroups: DuplicateGroupData[];  // state to hold fetched duplicate groups
  isLoading: boolean;   // state for loading indicator
  startDetectionJob: () => Promise<void>;
  startDetectionJobApi: () => Promise<void>; // new action for real API call
  fetchDuplicateGroups: (runId: number) => Promise<void>;  // action to fetch results
  resetRunHistory: () => void; // action to reset run history
};

const useAdminStore = create<AdminState>((set, get) => ({
  runHistory: loadRunHistory(),
  runCounter: 0,
  duplicateGroups: [],  // initial state
  isLoading: false,     // initial state
  startDetectionJob: async () => {
    const history = get().runHistory;
    const runCounter = get().runCounter;
    if (history.some(run => run.status === 'running')) {
      return; // A job is already running, do nothing.
    }

    const newRunId = runCounter + 1;
    set({ runCounter: newRunId });
    const newRun: DetectionRun = {
      id: newRunId,
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
      const runCounter = get().runCounter;
      const newRunId = runCounter + 1;
      set({ runCounter: newRunId });
      const newRun: DetectionRun = {
        id: newRunId,
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
        // DEBUG: Log status update to console
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
          // DEBUG: Log completion to console
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
      console.log('API /patients/matches response:', results);
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
      function scoreToConfidence(score: number): 'high' | 'medium' | 'low' {
        if (score >= 0.95) return 'high';
        if (score >= 0.75) return 'medium';
        return 'low';
      }
      const mappedResults = results.map((group: any) => {
        const duplicates = Array.isArray(group.duplicates)
          ? group.duplicates.map(d => ({
              ...d,
              ...toCamel(d.other_patient), // flatten otherPatient fields into duplicate
              otherPatient: toCamel(d.other_patient)
            }))
          : [];
        // Log scores for debugging
        console.log('Group scores:', duplicates.map(d => d.score));
        // Find highest score among duplicates
        const maxScore = duplicates.length > 0 ? Math.max(...duplicates.map(d => d.score || 0)) : 0;
        return {
          mainProfile: toCamel(group.patient),
          duplicates,
          confidence: scoreToConfidence(maxScore),
        };
      });
      set({ duplicateGroups: mappedResults });

    } catch (error) {
      console.error("Error fetching duplicate groups:", error);
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

  resetRunHistory: () => {
    localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
    set({ runHistory: [], runCounter: 0 });
  },
}));

export default useAdminStore;
