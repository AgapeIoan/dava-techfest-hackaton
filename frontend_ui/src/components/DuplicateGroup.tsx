import React, { useState } from 'react'
import {
  Box,
  Checkbox,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Button,
} from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'
import { DuplicateGroupData } from '../pages/Admin' // Import the interface

// Define the "props" that this component expects to receive from its parent.
interface DuplicateGroupProps {
  groupData: DuplicateGroupData
  isSelected: boolean
  onSelectionChange: (mainProfileId: number) => void
}

export default function DuplicateGroup({ groupData, isSelected, onSelectionChange }: DuplicateGroupProps) {
  // This state is specific to THIS component. Does the parent need to know if the dropdown is open? No.
  // So, we manage this state locally right here.
  const [isOpen, setIsOpen] = useState(false)
  const { mainProfile, duplicates } = groupData

  const handleManualMerge = () => {
    alert(`Manual merge for ${mainProfile.name} would be triggered here.`)
  }

  const handleCancel = () => {
    alert(`Cancel action for ${mainProfile.name} group.`)
  }

  return (
    <Paper sx={{ marginBottom: 2 }}>
      {/* Main Profile Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: '#f5f5f5' }}>
        <Checkbox
          checked={isSelected}
          onChange={() => onSelectionChange(mainProfile.id)}
        />
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body1" fontWeight="bold">{mainProfile.name}</Typography>
          <Typography variant="body2" color="text.secondary">{mainProfile.email}</Typography>
          <Typography variant="body2" color="text.secondary">Last Login: {mainProfile.lastLogin}</Typography>
        </Box>
        <Box sx={{ ml: 2 }}>
          <Button size="small" onClick={handleManualMerge}>Manual Merge</Button>
          <Button size="small" color="error" onClick={handleCancel}>Cancel</Button>
          <IconButton onClick={() => setIsOpen(!isOpen)} size="small">
            {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Box>
      </Box>

      {/* Collapsible Duplicates List */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List dense sx={{ padding: '0 16px 16px 48px' }}>
          {duplicates.length > 0 ? (
            duplicates.map((dup) => (
              <ListItem key={dup.id}>
                <ListItemText
                  primary={dup.name}
                  secondary={`Email: ${dup.email} | Last Login: ${dup.address}`}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No potential duplicates found for this profile." />
            </ListItem>
          )}
        </List>
      </Collapse>
    </Paper>
  )
}