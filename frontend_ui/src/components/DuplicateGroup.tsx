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
  TextField,
} from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'
import { Patient } from '../store/dupeStore'

// Define the "props" that this component expects to receive from its parent.
interface DuplicateGroupProps {
  patient: Patient
  isReceptionist: boolean
  onSave: (updated: Patient) => void
}

export default function DuplicateGroup({ patient, isReceptionist, onSave }: DuplicateGroupProps) {
  // This state is specific to THIS component. Does the parent need to know if the dropdown is open? No.
  // So, we manage this state locally right here.
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(patient)

  if (!patient) return <div>Select a patient!</div>

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      address: {
        ...form.address,
        [e.target.name]: e.target.value,
      },
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
    setEditing(false)
  }

  return (
    <Paper sx={{ marginBottom: 2 }}>
      {/* Main Profile Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: '#f5f5f5' }}>
        <Checkbox
          checked={isReceptionist}
          onChange={() => onSave({ ...patient, isReceptionist: !isReceptionist })}
        />
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body1" fontWeight="bold">{patient.firstName} {patient.lastName}</Typography>
          <Typography variant="body2" color="text.secondary">{patient.email}</Typography>
          <Typography variant="body2" color="text.secondary">Last Login: {patient.lastLogin}</Typography>
        </Box>
        <Box sx={{ ml: 2 }}>
          {editing ? (
            <form onSubmit={handleSave}>
              <Typography variant="subtitle2" gutterBottom>Edit Patient Data</Typography>
              <TextField
                name="firstName"
                label="First Name"
                value={form.firstName}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="lastName"
                label="Last Name"
                value={form.lastName}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="ssn"
                label="SSN"
                value={form.ssn ?? ''}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="dob"
                label="Date of Birth"
                value={form.dob ?? ''}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="phone"
                label="Phone"
                value={form.phone ?? ''}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="email"
                label="Email"
                value={form.email ?? ''}
                onChange={handleChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="street"
                label="Street"
                value={form.address?.street ?? ''}
                onChange={handleAddressChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="number"
                label="Number"
                value={form.address?.number ?? ''}
                onChange={handleAddressChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="city"
                label="City"
                value={form.address?.city ?? ''}
                onChange={handleAddressChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <TextField
                name="county"
                label="County"
                value={form.address?.county ?? ''}
                onChange={handleAddressChange}
                size="small"
                sx={{ mb: 1, mr: 1 }}
              />
              <Button type="submit" size="small" variant="contained" sx={{ mr: 1 }}>Save</Button>
              <Button size="small" variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
            </form>
          ) : (
            <div>
              <div>First Name: {patient.firstName}</div>
              <div>Last Name: {patient.lastName}</div>
              <div>SSN: {patient.ssn}</div>
              <div>Date of Birth: {patient.dob}</div>
              <div>Phone: {patient.phone}</div>
              <div>Email: {patient.email}</div>
              <div>Street: {patient.address?.street}</div>
              <div>Number: {patient.address?.number}</div>
              <div>City: {patient.address?.city}</div>
              <div>County: {patient.address?.county}</div>
              {isReceptionist && (
                <Button size="small" variant="contained" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          )}
          <IconButton onClick={() => setIsOpen(!isOpen)} size="small">
            {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Box>
      </Box>

      {/* Collapsible Duplicates List */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List dense sx={{ padding: '0 16px 16px 48px' }}>
          {patient.duplicates && patient.duplicates.length > 0 ? (
            patient.duplicates.map((dup) => (
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