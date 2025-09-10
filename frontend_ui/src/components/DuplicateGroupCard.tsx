import { useState } from 'react';
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
  Button,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { DuplicateGroupData } from '../pages/Admin';

// Renamed props for clarity
interface DuplicateGroupCardProps {
  groupData: DuplicateGroupData;
  isSelected: boolean;
  onSelectionChange: (mainProfileId: number) => void;
  onDismiss: (mainProfileId: number) => void;
  onManualMerge?: (group: DuplicateGroupData) => void;
}

const getConfidenceChipColor = (confidence: 'high' | 'medium' | 'low') => {
  switch (confidence) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    default:
      return 'default';
  }
};

// Renamed the component function to match the new file name
export default function DuplicateGroupCard({
  groupData,
  isSelected,
  onSelectionChange,
  onDismiss,
  onManualMerge,
}: DuplicateGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mainProfile, confidence } = groupData;
  const duplicates = groupData.duplicates ?? [];

  // Extract the highest score from duplicates
  const maxScore = duplicates.length > 0 ? Math.max(...duplicates.map(d => d.score ?? 0)) : 0;
  // Map score to color and label
  const getScoreChipColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.5) return 'warning';
    return 'default';
  };
  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'High confidence';
    if (score >= 0.5) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <Paper elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
        }}
      >
        <Checkbox
          checked={isSelected}
          onChange={() => onSelectionChange(mainProfile.recordId)}
          inputProps={{ 'aria-label': `Select group for ${mainProfile.firstName || mainProfile.lastName}` }}
        />
        <Box sx={{ flexGrow: 1, ml: 1 }}>
          <Typography variant="body1" fontWeight="bold">
            {mainProfile.firstName} {mainProfile.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {mainProfile.recordId} | Email: {mainProfile.email}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip
            title={
              maxScore >= 0.8
                ? 'High confidence: strong match'
                : maxScore >= 0.5
                ? 'Medium confidence: possible match'
                : 'Low confidence: weak match'
            }
            arrow
          >
            <Chip
              label={getScoreLabel(maxScore)}
              color={getScoreChipColor(maxScore)}
              size="small"
              variant="outlined"
            />
          </Tooltip>
          {onManualMerge && (
            <Button
              variant="outlined"
              size="small"
              sx={{ ml: 1, textTransform: 'none' }}
              onClick={() => onManualMerge(groupData)}
            >
              Manual Merge
            </Button>
          )}
          <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
            <IconButton
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
              size="small"
            >
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Potential Duplicates ({duplicates.length}):
          </Typography>
          <List dense disablePadding>
            {(duplicates || []).map((duplicate, idx) => {
              const other = duplicate.other_patient || {};
              // Collect match details with high similarity
              const matchDetails: { label: string; value: number }[] = [];
              if ((duplicate.s_name ?? 0) >= 0.8) matchDetails.push({ label: 'name', value: duplicate.s_name });
              if ((duplicate.s_dob ?? 0) >= 0.8) matchDetails.push({ label: 'dob', value: duplicate.s_dob });
              if ((duplicate.s_email ?? 0) >= 0.8) matchDetails.push({ label: 'email', value: duplicate.s_email });
              if ((duplicate.s_phone ?? 0) >= 0.8) matchDetails.push({ label: 'phone', value: duplicate.s_phone });
              if ((duplicate.s_address ?? 0) >= 0.8) matchDetails.push({ label: 'address', value: duplicate.s_address });
              if ((duplicate.s_gender ?? 0) >= 0.8) matchDetails.push({ label: 'gender', value: duplicate.s_gender });
              if ((duplicate.s_ssn_hard_match ?? 0) >= 0.8) matchDetails.push({ label: 'SSN', value: duplicate.s_ssn_hard_match });
              return (
                <ListItem key={other.record_id || idx} divider>
                  <ListItemText
                    primary={`${other.first_name || ''} ${other.last_name || ''}`}
                    secondary={`DOB: ${other.date_of_birth || ''} | Phone: ${other.phone_number || ''}`}
                  />
                  <Stack direction="row" spacing={1}>
                    {matchDetails.map((detail, i) => (
                      <Chip key={detail.label + i} label={detail.label} size="small" variant="outlined" color="success" />
                    ))}
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Collapse>
    </Paper>
  );
}