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

// --- TYPE DEFINITIONS ---
export interface Profile {
  /*id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  ssn: string;
  address: string;
  city: string;
  county: string;
  gender: string;*/
}

export interface DuplicateProfile extends Profile {
  /*matchReasons: string[]; // e.g., ["Similar Name", "Same Email"]*/
}

export interface DuplicateGroupData {
  /*mainProfile: Profile;
  duplicates: DuplicateProfile[];
  confidence: 'high' | 'medium' | 'low'; // For filtering*/
}

// --- MOCK DATA ---
// const MOCK_DUPLICATE_DATA: DuplicateGroupData[] = [
//   {
//     mainProfile: {
//       id: 1,
//       firstName: 'Johnathan',
//       lastName: 'Doe',
//       dateOfBirth: '1990-05-15',
//       phone: '555-0101',
//       email: 'j.doe@example.com',
//       ssn: '123-45-6789',
//       address: '123 Main St',
//       city: 'Springfield',
//       county: 'Greene',
//       gender: 'Male',
//     },
//     duplicates: [
//       {
//         id: 101,
//         firstName: 'Johnny',
//         lastName: 'Doe',
//         dateOfBirth: '1990-05-15',
//         phone: '555-0199',
//         email: 'j.doe@example.com',
//         ssn: '123-45-6789',
//         address: '123 Main St',
//         city: 'Springfield',
//         county: 'Greene',
//         gender: 'M',
//         matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'],
//       },
//       {
//         id: 102,
//         firstName: 'John',
//         lastName: 'D.',
//         dateOfBirth: '1989-01-20',
//         phone: '555-0101',
//         email: 'johndoe@work.com',
//         ssn: '123-45-6789',
//         address: '124 Main St',
//         city: 'Springfield',
//         county: 'Greene',
//         gender: 'Man',
//         matchReasons: ['Similar Name', 'Same Phone'],
//       },
//     ],
//     confidence: 'high',
//   },
//   {
//     mainProfile: {
//       id: 2,
//       firstName: 'Jane',
//       lastName: 'Samantha Smith',
//       dateOfBirth: '1985-11-22',
//       phone: '555-0202',
//       email: 'jane.smith@mail.com',
//       ssn: '987-65-4321',
//       address: '456 Oak Ave',
//       city: 'Riverside',
//       county: 'Orange',
//       gender: 'Female',
//     },
//     duplicates: [
//       {
//         id: 201,
//         firstName: 'Jane',
//         lastName: 'S.',
//         dateOfBirth: '1985-11-22',
//         phone: '555-0233',
//         email: 'jane.smith@mail.com',
//         ssn: '987-65-4321',
//         address: '456 Oak Ave',
//         city: 'Riverside',
//         county: 'Orange',
//         gender: 'Female',
//         matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'],
//       },
//     ],
//     confidence: 'high',
//   },
//   {
//     mainProfile: {
//       id: 3,
//       firstName: 'Peter',
//       lastName: 'Jones',
//       dateOfBirth: '1992-02-10',
//       phone: '555-0303',
//       email: 'p.jones@web.com',
//       ssn: '111-22-3333',
//       address: '789 Pine Rd',
//       city: 'Hill Valley',
//       county: 'Marty',
//       gender: 'Male',
//     },
//     duplicates: [
//       {
//         id: 301,
//         firstName: 'Pete',
//         lastName: 'Jones',
//         dateOfBirth: '1993-02-10',
//         phone: '555-0304',
//         email: 'peter.jones@web.com',
//         ssn: '111-22-3333',
//         address: '789 Pine Rd',
//         city: 'Hill Valley',
//         county: 'Marty',
//         gender: 'Male',
//         matchReasons: ['Similar Name'],
//       },
//     ],
//     confidence: 'medium',
//   },
//   {
//     mainProfile: {
//       id: 4,
//       firstName: 'Samuel',
//       lastName: 'Wilson',
//       dateOfBirth: '1978-09-30',
//       phone: '555-0404',
//       email: 'sam.w@example.com',
//       ssn: '222-33-4444',
//       address: '321 Maple St',
//       city: 'Metropolis',
//       county: 'Clark',
//       gender: 'Male',
//     },
//     duplicates: [
//       {
//         id: 401,
//         firstName: 'Sam',
//         lastName: 'Wilson',
//         dateOfBirth: '1978-09-30',
//         phone: '555-0405',
//         email: 'sam.wilson@example.net',
//         ssn: '222-33-4444',
//         address: '321 Maple St',
//         city: 'Metropolis',
//         county: 'Clark',
//         gender: 'Male',
//         matchReasons: ['Similar Name', 'Same D.O.B.'],
//       },
//     ],
//     confidence: 'medium',
//   },
//   {
//     mainProfile: {
//       id: 5,
//       firstName: 'Maria',
//       lastName: 'Garcia',
//       dateOfBirth: '2000-01-01',
//       phone: '555-0505',
//       email: 'maria.g@email.com',
//       ssn: '333-44-5555',
//       address: '654 Elm St',
//       city: 'Sunnydale',
//       county: 'Buffy',
//       gender: 'Female',
//     },
//     duplicates: [
//       {
//         id: 501,
//         firstName: 'Mary',
//         lastName: 'Garcia',
//         dateOfBirth: '2000-01-02',
//         phone: '555-0506',
//         email: 'm.garcia@email.com',
//         ssn: '333-44-5555',
//         address: '654 Elm St',
//         city: 'Sunnydale',
//         county: 'Buffy',
//         gender: 'Female',
//         matchReasons: ['Similar Name'],
//       },
//     ],
//     confidence: 'low',
//   },
//   {
//     mainProfile: {
//       id: 6,
//       firstName: 'Bruce',
//       lastName: 'Wayne',
//       dateOfBirth: '1972-04-17',
//       phone: '555-0606',
//       email: 'bruce@wayne.com',
//       ssn: '444-55-6666',
//       address: '1007 Mountain Dr',
//       city: 'Gotham',
//       county: 'Wayne',
//       gender: 'Male',
//     },
//     duplicates: [],
//     confidence: 'low',
//   },
// ];

const PROFILES_PER_PAGE = 5;

export default function AdminPage() {
//   const [allGroups, setAllGroups] = useState<DuplicateGroupData[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<DuplicateGroupData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
//   const [isLoading, setIsLoading] = useState(false);
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
      fetchDuplicateGroups
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
            // Add a specific check for 401 Unauthorized
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

//   const handleLoadResults = () => {
//     if (!selectedRunId) {
//       alert("Please select a detection run to view.");
//       return;
//     }
//     setIsLoading(true);
//     setTimeout(() => {
//       setAllGroups(MOCK_DUPLICATE_DATA);
//       setSearchInitiated(true);
//       setIsLoading(false);
//     }, 1000);
//   };
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
    setIsLoading(true);
    setTimeout(() => {
      setAllGroups(MOCK_DUPLICATE_DATA);
      setSearchInitiated(true);
      setIsLoading(false);
    }, 1500);
  };

//   const handleAutoMerge = () => {
//     if (selectedGroups.size === 0) return;
//     setIsLoading(true);
//     setTimeout(() => {
//       setAllGroups(prev => prev.filter(group => !selectedGroups.has(group.mainProfile.id)));
//       setSelectedGroups(new Set());
//       setIsLoading(false);
//     }, 1000);
//   };
  const handleAutoMerge = () => {
    if (selectedGroups.size === 0) return;
    const groupsToMerge = allGroups.filter(group => selectedGroups.has(group.mainProfile.id));
    setGroupsToConfirm(groupsToMerge);
    setIsConfirmModalOpen(true);
  };

  // --- Handlers for the Confirmation Modal ---
  const handleApproveConfirmMerge = (approvedGroups: DuplicateGroupData[]) => {
    if (approvedGroups.length === 0) {
      // This case should be handled by the disabled button, but as a safeguard:
      setIsConfirmModalOpen(false);
      return;
    }
    const approvedIds = new Set(approvedGroups.map(g => g.mainProfile.id));

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      // On success, filter the main list based on the approved IDs
      setAllGroups(prev => prev.filter(group => !approvedIds.has(group.mainProfile.id)));

      // Also update the selection set to remove the merged groups
      setSelectedGroups(prev => {
        const newSelection = new Set(prev);
        approvedIds.forEach(id => newSelection.delete(id));
        return newSelection;
      });

      setIsLoading(false);
      setIsConfirmModalOpen(false);
    }, 1000);
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
    const idsOnCurrentPage = paginatedGroups.map(g => g.mainProfile.id);
    if (event.target.checked) idsOnCurrentPage.forEach(id => newSelection.add(id));
    else idsOnCurrentPage.forEach(id => newSelection.delete(id));
    setSelectedGroups(newSelection);
  };

  const idsOnCurrentPage = paginatedGroups
    .filter(g => g && g.mainProfile && typeof g.mainProfile.recordId !== 'undefined')
    .map(g => g.mainProfile.recordId);
  const selectedOnPageCount = idsOnCurrentPage.filter(id => selectedGroups.has(id)).length;
  const areAllOnPageSelected = idsOnCurrentPage.length > 0 && selectedOnPageCount === idsOnCurrentPage.length;

  // Handler for the third button: search in results
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
      'firstName', 'lastName', 'dateOfBirth', 'phone', 'gender', 'email', 'ssn', 'address', 'city', 'county',
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

  const handleApproveManualMerge = () => {
    // Here you would send mergeSelections to backend or update state
    // For demo, just close modal and remove group from list
    if (manualMergeGroup) {
      setAllGroups(prev => prev.filter(g => g.mainProfile.id !== manualMergeGroup.mainProfile.id));
      setManualMergeGroup(null);
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

      {/* --- Section 1: Start a New Search --- */}
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
          {/* Hide the mock button for now */}
          {/* <Button
            variant="contained"
            startIcon={<RunIcon />}
            onClick={startDetectionJob}
            disabled={isJobRunning}
            color="secondary"
          >
            Find Duplicates (Mock)
          </Button> */}
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
        </Stack>
      </Paper>

      {/* --- Section 2: Review Duplicates --- */}
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
              {/* Deduplicate runs by id before rendering */}
              {Array.from(new Map(runHistory.filter(r => r.status === 'completed').map(run => [run.id, run])).values())
                .map(run => (
                  <MenuItem key={run.id} value={run.id}>
                    Run #{run.id} - Completed on {new Date(run.completedAt!).toLocaleDateString()}
                  </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" onClick={handleLoadResults} disabled={isLoading || !selectedRunId}>
            Load Results
          </Button>
        </Stack>
      </Paper>

      {/* --- Section 3: Search/filter within results --- */}
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
                <FormControlLabel control={<Checkbox checked={areAllOnPageSelected} onChange={handleSelectAllOnPage} />} label={`Select all on page (${selectedOnPageCount}/${idsOnCurrentPage.length})`} />
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
