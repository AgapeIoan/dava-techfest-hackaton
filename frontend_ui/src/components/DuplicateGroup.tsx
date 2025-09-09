import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  Stack,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Block as NotDuplicateIcon } from '@mui/icons-material';
import { DuplicateGroupData } from '../pages/Admin';

interface DuplicateGroupProps {
  groupData: DuplicateGroupData;
  isSelected: boolean;
  onSelectionChange: (mainProfileId: number) => void;
  onDismiss: (mainProfileId: number) => void;
}

const getConfidenceChipColor = (confidence: 'high' | 'medium' | 'low') => {
  switch (confidence) {
    case 'high': return 'success';
    case 'medium': return 'warning';
    default: return 'default';
  }
};

export default function DuplicateGroup({ groupData, isSelected, onSelectionChange, onDismiss }: DuplicateGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mainProfile, duplicates, confidence } = groupData;

  return (
    <Paper elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: isSelected ? 'action.selected' : 'background.paper' }}>
        <Checkbox checked={isSelected} onChange={() => onSelectionChange(mainProfile.id)} inputProps={{ 'aria-label': `Select group for ${mainProfile.fullName}` }} />
        <Box sx={{ flexGrow: 1, ml: 1 }}>
          <Typography variant="body1" fontWeight="bold">{mainProfile.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">ID: {mainProfile.id} | Email: {mainProfile.email}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${confidence} confidence`} color={getConfidenceChipColor(confidence)} size="small" variant="outlined" />
          <Tooltip title="Mark as not a duplicate and remove from list">
            <IconButton onClick={() => onDismiss(mainProfile.id)} size="small"><NotDuplicateIcon /></IconButton>
          </Tooltip>
          <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
            <IconButton onClick={() => setIsExpanded(!isExpanded)} sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} size="small">
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Potential Duplicates ({duplicates.length}):</Typography>
          <List dense disablePadding>
            {duplicates.map((duplicate) => (
              <ListItem key={duplicate.id} divider>
                <ListItemText primary={duplicate.fullName} secondary={`DOB: ${duplicate.dateOfBirth} | Phone: ${duplicate.phone}`} />
                <Stack direction="row" spacing={1}>
                  {duplicate.matchReasons.map((reason) => (
                    <Chip key={reason} label={reason} size="small" variant="outlined" color="primary" />
                  ))}
                </Stack>
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>
    </Paper>
  );
}