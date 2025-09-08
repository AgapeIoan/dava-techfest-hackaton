import React, { useState } from 'react'
import { Box, Button, Grid, Typography, Paper, CircularProgress, Pagination, Stack, FormControlLabel, Checkbox  } from '@mui/material'
import DuplicateGroup from '../components/DuplicateGroup'

// Let's define the shape of our data with TypeScript Interfaces.
// This helps prevent bugs by ensuring our data is always in the correct format.
export interface Profile {
  id: number
  name: string
  email: string
  address: string
}

export interface DuplicateGroupData {
  mainProfile: Profile
  duplicates: Profile[]
}

// MOCK DATA: In a real app, this would come from your backend after finding duplicates.
const MOCK_DUPLICATE_DATA: DuplicateGroupData[] = [
  {
    mainProfile: { id: 1, name: 'John Doe', email: 'j.doe@example.com', address: '2023-10-26' },
    duplicates: [
      { id: 101, name: 'Johnny Doe', email: 'j.doe@example.com', address: '2022-01-15' },
      { id: 102, name: 'John D.', email: 'johndoe@work.com', address: '2023-05-20' },
    ],
  },
  {
    mainProfile: { id: 2, name: 'Jane Smith', email: 'jane.smith@mail.com', address: '2023-10-27' },
    duplicates: [{ id: 201, name: 'Jane S.', email: 'jane.smith@mail.com', address: '2023-09-01' }],
  },
  // ... add 4 more groups to test pagination
  { mainProfile: { id: 3, name: 'Peter Jones', email: 'p.jones@web.com', address: '2023-10-20' }, duplicates: [] },
  { mainProfile: { id: 4, name: 'Sam Wilson', email: 'sam.w@example.com', address: '2023-10-19' }, duplicates: [] },
  { mainProfile: { id: 5, name: 'Mary Jane', email: 'mj@daily.com', address: '2023-10-21' }, duplicates: [] },
  { mainProfile: { id: 6, name: 'Bruce Wayne', email: 'bruce@wayne.com', address: '2023-10-22' }, duplicates: [] },
]

const PROFILES_PER_PAGE = 5

export default function AdminPage() {
  // --- STATE MANAGEMENT ---
  // useState is a React "Hook". It lets us add a state variable to our component.
  // The component will "re-render" (update on the screen) whenever this state changes.

  // A list of all duplicate groups found. Initially empty.
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroupData[]>([])
  // Tracks which groups are selected for auto-merge. We store the main profile's ID.
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  // To show a loading spinner during actions.
  const [isLoading, setIsLoading] = useState(false)
  // For pagination.
  const [currentPage, setCurrentPage] = useState(1)
  // New state to track if a search has been initiated
  const [searchPerformed, setSearchPerformed] = useState(false);

  // --- PAGINATION LOGIC ---
  const pageCount = Math.ceil(duplicateGroups.length / PROFILES_PER_PAGE);
  const paginatedGroups = duplicateGroups.slice(
    (currentPage - 1) * PROFILES_PER_PAGE,
    currentPage * PROFILES_PER_PAGE
  );


  // --- ACTION HANDLERS ---
  // These functions handle user clicks and update the state.

  const handleFindDuplicates = () => {
    setIsLoading(true)
    console.log("Simulating finding duplicates...")
    // Simulate a network request (e.g., to an AI service)
    setTimeout(() => {
      setDuplicateGroups(MOCK_DUPLICATE_DATA)
      setIsLoading(false)
      setSearchPerformed(true); // Mark that a search has been performed
    }, 1500) // wait 1.5 seconds
  }

  const handleAutoMerge = () => {
    if (selectedGroups.size === 0) return // Do nothing if no groups are selected

    setIsLoading(true)
    console.log(`Simulating auto-merge for IDs: ${[...selectedGroups].join(', ')}`)
    setTimeout(() => {
      // Filter out the merged groups from the main list
      const remainingGroups = duplicateGroups.filter(
        (group) => !selectedGroups.has(group.mainProfile.id)
      )
      setDuplicateGroups(remainingGroups)
      setSelectedGroups(new Set()) // Clear selection
      setIsLoading(false)
    }, 2000) // wait 2 seconds
  }

  const handleSelectionChange = (mainProfileId: number) => {
    // Create a new Set to ensure React detects the state change
    const newSelection = new Set(selectedGroups)
    if (newSelection.has(mainProfileId)) {
      newSelection.delete(mainProfileId)
    } else {
      newSelection.add(mainProfileId)
    }
    setSelectedGroups(newSelection)
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  // Handler for the new "Select All" checkbox
  const handleSelectAllOnPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelection = new Set(selectedGroups);
    const idsOnCurrentPage = paginatedGroups.map(g => g.mainProfile.id);

    if (event.target.checked) {
        // Add all IDs from the current page to the selection
        idsOnCurrentPage.forEach(id => newSelection.add(id));
    } else {
        // Remove all IDs from the current page from the selection
        idsOnCurrentPage.forEach(id => newSelection.delete(id));
    }
    setSelectedGroups(newSelection);
  };

  // Logic to determine the state of the "Select All" checkbox
  const idsOnCurrentPage = paginatedGroups.map(g => g.mainProfile.id);
  const selectedOnPageCount = idsOnCurrentPage.filter(id => selectedGroups.has(id)).length;
  const areAllOnPageSelected = idsOnCurrentPage.length > 0 && selectedOnPageCount === idsOnCurrentPage.length;

  // --- RENDER LOGIC ---
  // This is what the user sees. We use conditional rendering to show different UI
  // based on the current state (e.g., show a spinner when loading).
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Find & Merge Duplicates
      </Typography>

      {/* Action Buttons */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Find Duplicates
        </Typography>
        <Button variant="contained" onClick={() => alert('File import logic goes here!')}>
          Import CSV
        </Button>
        <Button variant="contained" color="secondary" onClick={handleFindDuplicates} disabled={isLoading}>
          Find Duplicates
        </Button>
        <Button
          variant="outlined"
          color="success"
          onClick={handleAutoMerge}
          disabled={isLoading || selectedGroups.size === 0}
        >
          Auto-Merge Selected ({selectedGroups.size})
        </Button>
      </Paper>

      {/* Results Section */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 5 }}>
          <CircularProgress />
        </Box>
      ) : duplicateGroups.length === 0 ? (
        <Typography>No duplicate profile was found. Click "Find Duplicates" to start.</Typography>
      ) : (
        <>
          {paginatedGroups.map((group) => (
            <DuplicateGroup
              key={group.mainProfile.id}
              groupData={group}
              isSelected={selectedGroups.has(group.mainProfile.id)}
              onSelectionChange={handleSelectionChange}
            />
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pageCount}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
    </Box>
  )
}