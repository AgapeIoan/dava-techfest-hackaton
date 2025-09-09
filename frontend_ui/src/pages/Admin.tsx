
import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import DuplicateGroup from '../components/DuplicateGroup';
import { UploadFile as UploadFileIcon, Search as SearchIcon } from '@mui/icons-material';

// --- TYPE DEFINITIONS (Updated) ---
export interface Profile {
  id: number;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
}

export interface DuplicateProfile extends Profile {
  matchReasons: string[]; // e.g., ["Similar Name", "Same Email"]
}

export interface DuplicateGroupData {
  mainProfile: Profile;
  duplicates: DuplicateProfile[];
  confidence: 'high' | 'medium' | 'low'; // For filtering
}

// --- MOCK DATA (Updated) ---
const MOCK_DUPLICATE_DATA: DuplicateGroupData[] = [
  {
    mainProfile: { id: 1, fullName: 'Johnathan Doe', dateOfBirth: '1990-05-15', phone: '555-0101', email: 'j.doe@example.com' },
    duplicates: [
      { id: 101, fullName: 'Johnny Doe', dateOfBirth: '1990-05-15', phone: '555-0199', email: 'j.doe@example.com', matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'] },
      { id: 102, fullName: 'John D.', dateOfBirth: '1989-01-20', phone: '555-0101', email: 'johndoe@work.com', matchReasons: ['Similar Name', 'Same Phone'] },
    ],
    confidence: 'high',
  },
  {
    mainProfile: { id: 2, fullName: 'Jane Samantha Smith', dateOfBirth: '1985-11-22', phone: '555-0202', email: 'jane.smith@mail.com' },
    duplicates: [{ id: 201, fullName: 'Jane S.', dateOfBirth: '1985-11-22', phone: '555-0233', email: 'jane.smith@mail.com', matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'] }],
    confidence: 'high',
  },
  {
    mainProfile: { id: 3, fullName: 'Peter Jones', dateOfBirth: '1992-02-10', phone: '555-0303', email: 'p.jones@web.com' },
    duplicates: [{ id: 301, fullName: 'Pete Jones', dateOfBirth: '1993-02-10', phone: '555-0304', email: 'peter.jones@web.com', matchReasons: ['Similar Name'] }],
    confidence: 'medium',
  },
  {
    mainProfile: { id: 4, fullName: 'Samuel Wilson', dateOfBirth: '1978-09-30', phone: '555-0404', email: 'sam.w@example.com' },
    duplicates: [{ id: 401, fullName: 'Sam Wilson', dateOfBirth: '1978-09-30', phone: '555-0405', email: 'sam.wilson@example.net', matchReasons: ['Similar Name', 'Same D.O.B.'] }],
    confidence: 'medium',
  },
  {
    mainProfile: { id: 5, fullName: 'Maria Garcia', dateOfBirth: '2000-01-01', phone: '555-0505', email: 'maria.g@email.com' },
    duplicates: [{ id: 501, fullName: 'Mary Garcia', dateOfBirth: '2000-01-02', phone: '555-0506', email: 'm.garcia@email.com', matchReasons: ['Similar Name'] }],
    confidence: 'low',
  },
  {
    mainProfile: { id: 6, fullName: 'Bruce Wayne', dateOfBirth: '1972-04-17', phone: '555-0606', email: 'bruce@wayne.com' },
    duplicates: [],
    confidence: 'low',
  },
];

const PROFILES_PER_PAGE = 5;

export default function AdminPage() {
  const [allGroups, setAllGroups] = useState<DuplicateGroupData[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<DuplicateGroupData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  useEffect(() => {
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

  const handleAutoMerge = () => {
    if (selectedGroups.size === 0) return;
    setIsLoading(true);
    setTimeout(() => {
      setAllGroups(prev => prev.filter(group => !selectedGroups.has(group.mainProfile.id)));
      setSelectedGroups(new Set());
      setIsLoading(false);
    }, 1000);
  };

  const handleDismissGroup = (mainProfileId: number) => {
    setAllGroups(prev => prev.filter(group => group.mainProfile.id !== mainProfileId));
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

  const idsOnCurrentPage = paginatedGroups.map(g => g.mainProfile.id);
  const selectedOnPageCount = idsOnCurrentPage.filter(id => selectedGroups.has(id)).length;
  const areAllOnPageSelected = idsOnCurrentPage.length > 0 && selectedOnPageCount === idsOnCurrentPage.length;

  return (
    <Box> {/* Removed padding here, handled by Layout now */}
      <Typography variant="h4" gutterBottom>
        Admin Dashboard: Find & Merge Duplicates
      </Typography>

      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Start a New Search</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => alert('File import logic goes here!')}>
            Import CSV
          </Button>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={handleFindDuplicates} disabled={isLoading}>
            Find Duplicates in Database
          </Button>
        </Stack>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 5 }}><CircularProgress /></Box>
      ) : searchInitiated ? (
        <>
          <Paper sx={{ padding: 2, mb: 3 }}>
             <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Search by Name or Email" variant="outlined" size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
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
            paginatedGroups.map((group) => (
              <DuplicateGroup key={group.mainProfile.id} groupData={group} isSelected={selectedGroups.has(group.mainProfile.id)} onSelectionChange={handleSelectionChange} onDismiss={handleDismissGroup} />
            ))
          ) : (
            <Typography sx={{ mt: 3, textAlign: 'center' }}>No duplicate profiles match your current filters.</Typography>
          )}
          {pageCount > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}><Pagination count={pageCount} page={currentPage} onChange={(_, v) => setCurrentPage(v)} color="primary" /></Box>}
        </>
      ) : (
         <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>Import a file or search the database to begin finding duplicates.</Typography>
      )}
    </Box>
  );
}