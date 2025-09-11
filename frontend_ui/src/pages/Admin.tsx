import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Pagination,
  Stack,
  FormControlLabel,
  Checkbox,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';

import DuplicateGroup from '../components/DuplicateGroupCard';
import { UploadFile as UploadFileIcon, Search as SearchIcon, PlayCircleOutline as RunIcon } from '@mui/icons-material';
import useAdminStore from '../store/adminStore';
import useDupeStore, { getAuthToken } from '../store/dupeStore';
import { API_BASE, USE_API } from '../store/dupeStore';
import ManualMergeDialog from '../components/ManualMergeDialog';
import ConfirmMergeDialog from '../components/ConfirmMergeDialog';

const PROFILES_PER_PAGE = 5;

export default function AdminPage() {
  const [filteredGroups, setFilteredGroups] = useState<DuplicateGroupData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  // Manual merge modal state
  const [manualMergeGroup, setManualMergeGroup] = useState<DuplicateGroupData | null>(null);
  const [mergeSelections, setMergeSelections] = useState<Record<string, string>>({});
  // --- State for the Confirmation Modal ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [groupsToConfirm, setGroupsToConfirm] = useState<DuplicateGroupData[]>([]);

  const [selectedRunId, setSelectedRunId] = useState<number | ''>('');
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  // Get state from the admin store
  const {
      runHistory,
      startDetectionJob,
      duplicateGroups,
      isLoading,
      fetchDuplicateGroups,
      resetRunHistory
  } = useAdminStore();
  const latestRun = runHistory.find(r => r.status !== 'idle'); // Find the most recent run
  const isJobRunning = runHistory.some(run => run.status === 'running');
  const stuckJob = runHistory.find(run => run.status === 'running' && run.progress < 100);
  const allGroups = duplicateGroups;

  // --- Upload logic ---
  useEffect(() => {
    // This effect triggers the upload when a file is selected
    if (!selectedFile || !USE_API) return;  // skip in mock mode

    const uploadFile = async () => {
      setIsUploading(true);
      const formData = new FormData();
      // The key 'file' must match what your backend endpoint expects
      formData.append('file', selectedFile);
      // --- Get the token ---
      const token = getAuthToken();
      console.log(token)
      if (!token) {
        setToast('Authentication error. Please log in again.');
        setIsUploading(false);
        return;
      }


      try {
        const response = await fetch(`${API_BASE}/ingest/patients-csv`, {
          method: 'POST',
          body: formData,
          headers: {
            // Include the token in the Authorization header
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
             throw new Error('Unauthorized. Your session may have expired.');
          }
          // Handle server-side errors (e.g., bad CSV format)
          let errorMessage = 'File upload failed.';
          try {
            const text = await response.text();
            if (text) {
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorMessage;
            }
          } catch (e) {
            // If parsing fails, keep default error message
          }
          setToast(errorMessage);
          setToastSeverity('error');
          throw new Error(errorMessage);
        }

        setToast('CSV uploaded successfully! You can now run the "Find Duplicates" job.');
        setToastSeverity('success');
      } catch (error: any) {
        console.error("Upload error:", error);
        // Only set toast/severity if not already set in error block above
        if (!toast) {
          setToast(`Error: ${error.message}`);
          setToastSeverity('error');
        }
      } finally {
        setIsUploading(false);
        setSelectedFile(null); // Reset after upload
      }
    };

    uploadFile();
  }, [selectedFile, setToast]);


  const handleImportClick = () => {
    // Programmatically click the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Set the selected run to the latest completed one when the component loads
  useEffect(() => {
    const latestCompletedRun = runHistory.find(r => r.status === 'completed');
    if (latestCompletedRun && !selectedRunId) {
      setSelectedRunId(latestCompletedRun.id);
    }
  }, [runHistory, selectedRunId]);

    const handleLoadResults = () => {
        if (!selectedRunId) {
        alert("Please select a detection run to view.");
        return;
        }
    // The component just calls the action. The store handles the rest.
        fetchDuplicateGroups(selectedRunId);
        setSearchInitiated(true);
    };

  useEffect(() => {
    let result = allGroups;
    if (confidenceFilter !== 'all') {
      result = result.filter(group => group.confidence === confidenceFilter);
    }
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      result = result.filter(group =>
        group.mainProfile.firstName.toLowerCase().includes(lowercasedQuery) ||
        group.mainProfile.lastName.toLowerCase().includes(lowercasedQuery) ||
        group.mainProfile.email.toLowerCase().includes(lowercasedQuery) ||
        group.duplicates.some(dup => dup.firstName.toLowerCase().includes(lowercasedQuery) || dup.lastName.toLowerCase().includes(lowercasedQuery) || dup.email.toLowerCase().includes(lowercasedQuery))
      );
    }
    setFilteredGroups(result);
    setCurrentPage(1);
  }, [allGroups, searchQuery, confidenceFilter]);

  const pageCount = Math.ceil(filteredGroups.length / PROFILES_PER_PAGE);
  const paginatedGroups = useMemo(() => filteredGroups.slice(
    (currentPage - 1) * PROFILES_PER_PAGE,
    currentPage * PROFILES_PER_PAGE
  ), [filteredGroups, currentPage]);

  const handleFindDuplicates = () => {
    // optional: local loading not needed; dialog handles submitting state
    setTimeout(() => {
      setAllGroups(MOCK_DUPLICATE_DATA);
      setSearchInitiated(true);
      // no local loading state
    }, 1500);
  };

  const handleAutoMerge = () => {
    if (selectedGroups.size === 0) {
      console.log('handleAutoMerge: No groups selected');
      return;
    }
    // Defensive: filter out undefined groups
    const validGroups = (allGroups || []).filter(g => g && g.mainProfile && typeof g.mainProfile.recordId !== 'undefined');
    console.log('handleAutoMerge: selectedGroups', Array.from(selectedGroups));
    console.log('handleAutoMerge: validGroups', validGroups.map(g => g.mainProfile.recordId));
    const groupsToMerge = validGroups.filter(group => selectedGroups.has(group.mainProfile.recordId));
    console.log('handleAutoMerge: groupsToMerge', groupsToMerge);
    setGroupsToConfirm(groupsToMerge);
    setIsConfirmModalOpen(true);
  };

  // --- Handlers for the Confirmation Modal ---
  const handleApproveConfirmMerge = (approvedGroups: DuplicateGroupData[]) => {
    if (approvedGroups.length === 0) {
      setIsConfirmModalOpen(false);
      return;
    }
    // Process the approved merges
    const approvedIds = new Set(approvedGroups.map(g => g.mainProfile.recordId || g.mainProfile.id));

    useAdminStore.setState(state => ({
      duplicateGroups: state.duplicateGroups.filter(group => !approvedIds.has(group.mainProfile.recordId || group.mainProfile.id))
    }));
    // Also update the selection set to remove the merged groups
    setSelectedGroups(prev => {
      const newSelection = new Set(prev);
      approvedIds.forEach(id => newSelection.delete(id));
      return newSelection;
    });
  };

  const handleCancelConfirmMerge = () => {
    setIsConfirmModalOpen(false);
    setGroupsToConfirm([]);
  };

  const handleDismissGroup = (mainProfileId: number) => {
    setAllGroups(prev => prev.filter(group => group.mainProfile.recordId !== mainProfileId));
    setSelectedGroups(prev => {
      const newSelection = new Set(prev);
      newSelection.delete(mainProfileId);
      return newSelection;
    });
  };

  const handleSelectionChange = (mainProfileId: number) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(mainProfileId)) newSelection.delete(mainProfileId);
    else newSelection.add(mainProfileId);
    setSelectedGroups(newSelection);
  };

  const handleSelectAllOnPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelection = new Set(selectedGroups);
    const idsOnCurrentPage = paginatedGroups.map(g => g.mainProfile.recordId);
    if (event.target.checked) idsOnCurrentPage.forEach(id => newSelection.add(id));
    else idsOnCurrentPage.forEach(id => newSelection.delete(id));
    setSelectedGroups(newSelection);
  };

  const idsOnCurrentPage = paginatedGroups
    .filter(g => g && g.mainProfile && typeof g.mainProfile.recordId !== 'undefined')
    .map(g => g.mainProfile.recordId);
  const selectedOnPageCount = idsOnCurrentPage.filter(id => selectedGroups.has(id)).length;
  const areAllOnPageSelected = idsOnCurrentPage.length > 0 && selectedOnPageCount === idsOnCurrentPage.length;

  const handleSearchInResults = () => {
    let result = allGroups;
    if (confidenceFilter !== 'all') {
      result = result.filter(group => group.confidence === confidenceFilter);
    }
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      result = result.filter(group =>
        group.mainProfile.fullName.toLowerCase().includes(lowercasedQuery) ||
        group.mainProfile.email.toLowerCase().includes(lowercasedQuery) ||
        group.duplicates.some(dup => dup.fullName.toLowerCase().includes(lowercasedQuery) || dup.email.toLowerCase().includes(lowercasedQuery))
      );
    }
    setFilteredGroups(result);
    setCurrentPage(1);
    setSearchInitiated(true);
  };

  // --- Manual Merge Modal Logic ---
  const handleOpenManualMerge = (group: DuplicateGroupData) => {
    // Collect all fields and set default selections to mainProfile values
    const allFields = [
      'firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'gender', 'email', 'ssn', 'address', 'city', 'county',
    ];
    const selections: Record<string, string> = {};
    allFields.forEach(field => {
      selections[field] = (group.mainProfile as any)[field];
    });
    setMergeSelections(selections);
    setManualMergeGroup(group);
  };

  const handleCloseManualMerge = () => {
    setManualMergeGroup(null);
  };

  const handleMergeFieldChange = (field: string, value: string) => {
    setMergeSelections(prev => ({ ...prev, [field]: value }));
  };

  const handleApproveManualMerge = async () => {
    if (!manualMergeGroup) return;
    const token = getAuthToken();
    if (!token) {
      setToast('Authentication error. Please log in again.');
      setToastSeverity('error');
      return;
    }

    try {
      const masterId = manualMergeGroup.mainProfile.recordId || manualMergeGroup.mainProfile.id;
      // Defensive: filter out masterId from duplicates
      const duplicateIds = manualMergeGroup.duplicates
        .map(dup => dup.recordId || dup.id)
        .filter(id => id !== masterId);
      // Convert camelCase keys to snake_case for backend
      const toSnake = (obj: Record<string, any>) => {
        const out: Record<string, any> = {};
        for (const k in obj) {
          out[k.replace(/([A-Z])/g, '_$1').toLowerCase()] = obj[k];
        }
        return out;
      };
      const payload = {
        master_record_id: masterId,
        duplicate_record_ids: duplicateIds,
        reason: 'manual merge',
        updates: toSnake(mergeSelections)
      };
      console.log(payload)
      const response = await fetch(`${API_BASE}/patients/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
//       console.log(response.status)    // DEBUG
      setToast('Profiles merged successfully!');
      setToastSeverity('success');
      // Defensive: check id field and log for debugging
      const mergedId = manualMergeGroup?.mainProfile?.recordId || manualMergeGroup?.mainProfile?.id;
      if (!mergedId) {
        console.warn('Manual merge group id is missing:', manualMergeGroup);
      }
      // Log ids before filtering
      const beforeIds = useAdminStore.getState().duplicateGroups.map(g => g.mainProfile.recordId || g.mainProfile.id);
//       console.log('Before merge, group ids:', beforeIds);   // DEBUG
      useAdminStore.setState(state => ({
        duplicateGroups: state.duplicateGroups.filter(g => (g.mainProfile.recordId || g.mainProfile.id) !== mergedId)
      }));
      // Log ids after filtering
      const afterIds = useAdminStore.getState().duplicateGroups.map(g => g.mainProfile.recordId || g.mainProfile.id);
//       console.log('After merge, group ids:', afterIds);  // DEBUG
      setManualMergeGroup(null);
    } catch (error) {
        console.log(error)
      setToast('Merge failed.');
      setToastSeverity('error');
    }
  };

  useEffect(() => {
    // Show a toast when a run is completed
    if (runHistory.length > 0) {
      const latestRun = runHistory[0];
      if (latestRun.status === 'completed') {
        setToast('Deduplication run completed!');
        setToastSeverity('success');
      }
    }
  }, [runHistory]);

  // On mount, mark interrupted jobs as failed
  useEffect(() => {
    const interrupted = useAdminStore.getState().markInterruptedJobs();
    if (interrupted) {
      setToast('Previous deduplication run was interrupted and marked as failed.');
      setToastSeverity('error');
    }
  }, []);

  return (
    <Box>
      {/* DEBUG: Show modal state visually */}
      {/* <Typography variant="caption" color="error" sx={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}>
        Modal open: {String(isConfirmModalOpen)} | Groups: {groupsToConfirm.length}
      </Typography> */}

      <Typography variant="h4" gutterBottom>
        Find & Merge Duplicates
      </Typography>

      {/* --- The hidden file input --- */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".csv" // Restrict to CSV files
      />

      {/* --- Start a New Search --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Start a New Run</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="outlined"
            startIcon={isUploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            onClick={handleImportClick}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Import CSV'}
          </Button>
          <Button
            variant="contained"
            startIcon={<RunIcon />}
            onClick={useAdminStore.getState().startDetectionJobApi}
            disabled={isJobRunning}
            color="secondary"
          >
            Find Duplicates
          </Button>
          {stuckJob && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                useAdminStore.getState().resetInterruptedJobs();
                setToast('Stuck job was reset. You can now start a new run.');
                setToastSeverity('success');
              }}
            >
              Reset Stuck Job
            </Button>
          )}
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              resetRunHistory();
              setToast('Demo reset: all previous runs cleared.');
              setToastSeverity('success');
              setSelectedRunId('');
            }}
          >
            Reset Demo
          </Button>
        </Stack>
      </Paper>

      {/* --- Review Duplicates --- */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Review Duplicates</Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl fullWidth size="small">
            <InputLabel>Detection Run</InputLabel>
            <Select
              value={selectedRunId}
              label="Detection Run"
              onChange={(e) => setSelectedRunId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              {/* Show up to 10 most recent completed runs, sorted by completedAt descending */}
              {runHistory
                .filter(r => r.status === 'completed')
                .sort((a, b) => {
                  // Prefer completedAt, fallback to id
                  if (a.completedAt && b.completedAt) {
                    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
                  }
                  return b.id - a.id;
                })
                .slice(0, 10)
                .map(run => (
                  <MenuItem key={run.id} value={run.id}>
                    Run #{run.id} - Completed on {run.completedAt ? new Date(run.completedAt).toLocaleDateString() : 'N/A'}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Button variant="contained" onClick={handleLoadResults} disabled={isLoading || !selectedRunId}>
            Load Results
          </Button>
        </Stack>
      </Paper>

      {/* --- Search/filter within results --- */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 5 }}><CircularProgress /></Box>
      ) : searchInitiated ? (
        <>
          <Paper sx={{ padding: 2, mb: 3 }}>
             <Grid container spacing={2} alignItems="center">
                <Grid xs={12} md={6}>
                  <TextField fullWidth label="Search by Name or Email" variant="outlined" size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </Grid>
                <Grid xs={12} md={6}>
                   <FormControl fullWidth size="small">
                    <InputLabel>Confidence Level</InputLabel>
                    <Select value={confidenceFilter} label="Confidence Level" onChange={(e) => setConfidenceFilter(e.target.value)}>
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="high">High Confidence</MenuItem>
                      <MenuItem value="medium">Medium Confidence</MenuItem>
                      <MenuItem value="low">Low Confidence</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
             </Grid>
          </Paper>
           <Paper sx={{ padding: 1, pl: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={areAllOnPageSelected}
                      indeterminate={selectedOnPageCount > 0 && !areAllOnPageSelected}
                      onChange={handleSelectAllOnPage}
                    />
                  }
                  label={`Select all on page (${selectedOnPageCount}/${idsOnCurrentPage.length})`}
                />
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="contained" color="primary" onClick={handleAutoMerge} disabled={selectedGroups.size === 0} size="small">
                    Auto-Merge Selected ({selectedGroups.size})
                </Button>
            </Paper>
          <Typography variant="h6" sx={{ mb: 2 }}>Found {filteredGroups.length} potential duplicate groups</Typography>
          {paginatedGroups.length > 0 ? (
            (() => { console.log('First result:', paginatedGroups[0]); })()
            ,
            paginatedGroups
              .filter(group => group && group.mainProfile && typeof group.mainProfile.recordId !== 'undefined')
              .map((group) => (
                <DuplicateGroup
                  key={group.mainProfile.recordId}
                  groupData={group}
                  isSelected={selectedGroups.has(group.mainProfile.recordId)}
                  onSelectionChange={handleSelectionChange}
                  onDismiss={handleDismissGroup}
                  onManualMerge={handleOpenManualMerge}
                />
              ))
          ) : (
            <Typography sx={{ mt: 3, textAlign: 'center' }}>No duplicate profiles match your current filters.</Typography>
          )}
          {pageCount > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}><Pagination count={pageCount} page={currentPage} onChange={(_, v) => setCurrentPage(v)} color="primary" /></Box>}
        </>
      ) : (
         <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>To begin reviewing, select a completed run and click "Load Results". <br /> To generate a new set of duplicates, use the "Find Duplicates" button.</Typography>

      )}

      <ManualMergeDialog
        open={!!manualMergeGroup}
        group={manualMergeGroup}
        selections={mergeSelections}
        onFieldChange={handleMergeFieldChange}
        onApprove={handleApproveManualMerge}
        onClose={handleCloseManualMerge}
      />
        <ConfirmMergeDialog
            open={isConfirmModalOpen}
            groups={groupsToConfirm}
            onApprove={handleApproveConfirmMerge}
            onCancel={handleCancelConfirmMerge}
        />
        <Snackbar
          open={!!toast}
          autoHideDuration={3000}
          onClose={() => setToast(null)}
        >
          <Alert severity={toastSeverity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast}
          </Alert>
        </Snackbar>
    </Box>
  );
}
