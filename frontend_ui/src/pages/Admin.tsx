
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import DuplicateGroup from '../components/DuplicateGroupCard';
import ManualMergeDialog from '../components/ManualMergeDialog';
import { UploadFile as UploadFileIcon, Search as SearchIcon } from '@mui/icons-material';

// --- TYPE DEFINITIONS ---
export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  ssn: string;
  address: string;
  city: string;
  county: string;
  gender: string;
}

export interface DuplicateProfile extends Profile {
  matchReasons: string[]; // e.g., ["Similar Name", "Same Email"]
}

export interface DuplicateGroupData {
  mainProfile: Profile;
  duplicates: DuplicateProfile[];
  confidence: 'high' | 'medium' | 'low'; // For filtering
}

// --- MOCK DATA ---
const MOCK_DUPLICATE_DATA: DuplicateGroupData[] = [
  {
    mainProfile: {
      id: 1,
      firstName: 'Johnathan',
      lastName: 'Doe',
      dateOfBirth: '1990-05-15',
      phone: '555-0101',
      email: 'j.doe@example.com',
      ssn: '123-45-6789',
      address: '123 Main St',
      city: 'Springfield',
      county: 'Greene',
      gender: 'Male',
    },
    duplicates: [
      {
        id: 101,
        firstName: 'Johnny',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15',
        phone: '555-0199',
        email: 'j.doe@example.com',
        ssn: '123-45-6789',
        address: '123 Main St',
        city: 'Springfield',
        county: 'Greene',
        gender: 'M',
        matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'],
      },
      {
        id: 102,
        firstName: 'John',
        lastName: 'D.',
        dateOfBirth: '1989-01-20',
        phone: '555-0101',
        email: 'johndoe@work.com',
        ssn: '123-45-6789',
        address: '124 Main St',
        city: 'Springfield',
        county: 'Greene',
        gender: 'Man',
        matchReasons: ['Similar Name', 'Same Phone'],
      },
    ],
    confidence: 'high',
  },
  {
    mainProfile: {
      id: 2,
      firstName: 'Jane',
      lastName: 'Samantha Smith',
      dateOfBirth: '1985-11-22',
      phone: '555-0202',
      email: 'jane.smith@mail.com',
      ssn: '987-65-4321',
      address: '456 Oak Ave',
      city: 'Riverside',
      county: 'Orange',
      gender: 'Female',
    },
    duplicates: [
      {
        id: 201,
        firstName: 'Jane',
        lastName: 'S.',
        dateOfBirth: '1985-11-22',
        phone: '555-0233',
        email: 'jane.smith@mail.com',
        ssn: '987-65-4321',
        address: '456 Oak Ave',
        city: 'Riverside',
        county: 'Orange',
        gender: 'Female',
        matchReasons: ['Similar Name', 'Same Email', 'Same D.O.B.'],
      },
    ],
    confidence: 'high',
  },
  {
    mainProfile: {
      id: 3,
      firstName: 'Peter',
      lastName: 'Jones',
      dateOfBirth: '1992-02-10',
      phone: '555-0303',
      email: 'p.jones@web.com',
      ssn: '111-22-3333',
      address: '789 Pine Rd',
      city: 'Hill Valley',
      county: 'Marty',
      gender: 'Male',
    },
    duplicates: [
      {
        id: 301,
        firstName: 'Pete',
        lastName: 'Jones',
        dateOfBirth: '1993-02-10',
        phone: '555-0304',
        email: 'peter.jones@web.com',
        ssn: '111-22-3333',
        address: '789 Pine Rd',
        city: 'Hill Valley',
        county: 'Marty',
        gender: 'Male',
        matchReasons: ['Similar Name'],
      },
    ],
    confidence: 'medium',
  },
  {
    mainProfile: {
      id: 4,
      firstName: 'Samuel',
      lastName: 'Wilson',
      dateOfBirth: '1978-09-30',
      phone: '555-0404',
      email: 'sam.w@example.com',
      ssn: '222-33-4444',
      address: '321 Maple St',
      city: 'Metropolis',
      county: 'Clark',
      gender: 'Male',
    },
    duplicates: [
      {
        id: 401,
        firstName: 'Sam',
        lastName: 'Wilson',
        dateOfBirth: '1978-09-30',
        phone: '555-0405',
        email: 'sam.wilson@example.net',
        ssn: '222-33-4444',
        address: '321 Maple St',
        city: 'Metropolis',
        county: 'Clark',
        gender: 'Male',
        matchReasons: ['Similar Name', 'Same D.O.B.'],
      },
    ],
    confidence: 'medium',
  },
  {
    mainProfile: {
      id: 5,
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: '2000-01-01',
      phone: '555-0505',
      email: 'maria.g@email.com',
      ssn: '333-44-5555',
      address: '654 Elm St',
      city: 'Sunnydale',
      county: 'Buffy',
      gender: 'Female',
    },
    duplicates: [
      {
        id: 501,
        firstName: 'Mary',
        lastName: 'Garcia',
        dateOfBirth: '2000-01-02',
        phone: '555-0506',
        email: 'm.garcia@email.com',
        ssn: '333-44-5555',
        address: '654 Elm St',
        city: 'Sunnydale',
        county: 'Buffy',
        gender: 'Female',
        matchReasons: ['Similar Name'],
      },
    ],
    confidence: 'low',
  },
  {
    mainProfile: {
      id: 6,
      firstName: 'Bruce',
      lastName: 'Wayne',
      dateOfBirth: '1972-04-17',
      phone: '555-0606',
      email: 'bruce@wayne.com',
      ssn: '444-55-6666',
      address: '1007 Mountain Dr',
      city: 'Gotham',
      county: 'Wayne',
      gender: 'Male',
    },
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
  // Manual merge modal state
  const [manualMergeGroup, setManualMergeGroup] = useState<DuplicateGroupData | null>(null);
  const [mergeSelections, setMergeSelections] = useState<Record<string, string>>({});


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

  const handleApproveMerge = () => {
    // Here you would send mergeSelections to backend or update state
    // For demo, just close modal and remove group from list
    if (manualMergeGroup) {
      setAllGroups(prev => prev.filter(g => g.mainProfile.id !== manualMergeGroup.mainProfile.id));
      setManualMergeGroup(null);
    }
  };

  return (
    <Box>
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
              <DuplicateGroup
                key={group.mainProfile.id}
                groupData={group}
                isSelected={selectedGroups.has(group.mainProfile.id)}
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
         <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>Import a file or search the database to begin finding duplicates.</Typography>
      )}

      <ManualMergeDialog
        open={!!manualMergeGroup}
        group={manualMergeGroup}
        selections={mergeSelections}
        onFieldChange={handleMergeFieldChange}
        onApprove={handleApproveMerge}
        onClose={handleCloseManualMerge}
      />
    </Box>
  );
}