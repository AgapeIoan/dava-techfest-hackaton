// --- START OF FILE src/components/ConfirmMergeDialog.tsx ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Accordion, AccordionSummary,
  AccordionDetails, Typography, Grid, Chip, Box, Stack, Divider, Paper, Tooltip, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { DuplicateGroupData, Profile } from '../pages/Admin';

// --- LLM Simulation Logic ---
// In a real app, this logic would live on the backend.
// For the demo, we simulate the AI's decision-making process here.
const simulateLlmMerge = (group: DuplicateGroupData) => {
  const { mainProfile, duplicates } = group;
  const allProfiles = [mainProfile, ...duplicates];
  const mergedProfile: Partial<Profile> = {};
  const reasoning: Record<string, string> = {};

  // Define the fields to merge
  const fields: (keyof Profile)[] = [
    'firstName', 'lastName', 'dateOfBirth', 'phone', 'email', 'ssn',
    'address', 'city', 'county', 'gender'
  ];

  fields.forEach(field => {
    // Simple logic: prefer the value from the last duplicate as it might be the "newest".
    // If no duplicates, use the main profile's value.
    const sourceProfile = duplicates.length > 0 ? duplicates[duplicates.length - 1] : mainProfile;

    // For name, we can have a slightly "smarter" logic
    if (field === 'firstName' || field === 'lastName') {
        mergedProfile[field] = mainProfile[field];
        reasoning[field] = `from main profile (#${mainProfile.id})`;
    } else {
        mergedProfile[field] = sourceProfile[field];
        reasoning[field] = `from duplicate (#${sourceProfile.id})`;
    }
  });

  return { mergedProfile: mergedProfile as Profile, reasoning };
};


// --- Component Props ---
interface ConfirmMergeDialogProps {
  open: boolean;
  groups: DuplicateGroupData[];
  onApprove: (approvedGroups: DuplicateGroupData[]) => void;
  onCancel: () => void;
}

export default function ConfirmMergeDialog({ open, groups, onApprove, onCancel }: ConfirmMergeDialogProps) {
  const [pendingGroups, setPendingGroups] = useState<DuplicateGroupData[]>([]);

  useEffect(() => {
    // When the modal opens, populate the pending list from props
    if (open) {
      setPendingGroups(groups);
    }
  }, [groups, open]);

  // --- NEW: Handler to reject/remove a single group ---
  const handleRejectGroup = (event: React.MouseEvent, groupIdToReject: number) => {
    event.stopPropagation(); // Prevents the accordion from toggling
    setPendingGroups(prev => prev.filter(g => g.mainProfile.id !== groupIdToReject));
  };

  if (!groups.length) return null;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="md">
      <DialogTitle>
        {/*Confirm Auto-Merge for {groups.length} Group{groups.length > 1 ? 's' : ''} */}
        Confirm Auto-Merge for {pendingGroups.length} Group{pendingGroups.length !== 1 ? 's' : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The AI has suggested the following merges. Reject any you disagree with before approving.
        </Typography>

        {pendingGroups.map((group, index) => {
          const { mergedProfile, reasoning } = simulateLlmMerge(group);
          return (
            <Accordion key={group.mainProfile.id} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {/* --- THIS IS THE NEW REJECT BUTTON --- */}
                <Tooltip title="Reject this Merge Suggestion">
                  <IconButton
                    size="small"
                    onClick={(event) => handleRejectGroup(event, group.mainProfile.id)}
                    sx={{ mr: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
                <Typography fontWeight="bold">Merge for: {group.mainProfile.firstName} {group.mainProfile.lastName}</Typography>
              </AccordionSummary>
        {/*
        {groups.map((group, index) => {
          const { mergedProfile, reasoning } = simulateLlmMerge(group);
          return (
            <Accordion key={group.mainProfile.id} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="bold">Merge for: {group.mainProfile.firstName} {group.mainProfile.lastName}</Typography>
              </AccordionSummary>
              */}
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Left Column: Source Profiles */}
                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle2" gutterBottom>Source Profiles</Typography>
                    <Stack spacing={1}>
                      {[group.mainProfile, ...group.duplicates].map(p => (
                        <Paper key={p.id} variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{p.firstName} {p.lastName} (#{p.id})</Typography>
                          <Typography variant="caption" color="text.secondary" component="div">Email: {p.email}</Typography>
                          <Typography variant="caption" color="text.secondary" component="div">Phone: {p.phone}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Grid>

                  {/* Right Column: Suggested Merged Profile */}
                  <Grid item xs={12} md={7}>
                     <Typography variant="subtitle2" gutterBottom>AI Suggested Merged Profile</Typography>
                     <Stack spacing={1.5}>
                        {Object.entries(mergedProfile).map(([key, value]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ minWidth: 100, fontWeight: 500, textTransform: 'capitalize' }}>
                                    {key.replace(/([A-Z])/g, ' $1')}:
                                </Typography>
                                <Typography variant="body2" sx={{ flexGrow: 1 }}>{value}</Typography>
                                <Chip label={reasoning[key]} size="small" variant="outlined" />
                            </Box>
                        ))}
                     </Stack>
                     <Divider sx={{ my: 2 }} />
                     <Typography variant="subtitle2" gutterBottom>Reasoning Summary</Typography>
                     <Typography variant="body2" fontStyle="italic" color="text.secondary">
                        Kept the most complete name from the main profile. For contact and address details, preferred values from the most recently updated record (simulated as duplicate #{group.duplicates[group.duplicates.length - 1]?.id ?? group.mainProfile.id}).
                     </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
<Button
          onClick={() => onApprove(pendingGroups)} // Pass the final pending list back
          variant="contained"
          color="success"
          disabled={pendingGroups.length === 0} // Disable if no groups are left
        >
          Approve {pendingGroups.length} Merge{pendingGroups.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
