import Grid from '@mui/material/Grid'
import {
  Paper, Stack, TextField, Button, Typography, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Skeleton, Box, LinearProgress, CircularProgress, Tooltip, Snackbar, Alert
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useState } from 'react'
import Checkbox from '@mui/material/Checkbox'
import { useNavigate } from 'react-router-dom'
import DuplicateGroup from "../components/DuplicateGroupCard";
import useDupeStore from "../store/dupeStore";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';


function maskSSN(ssn?: string) {
  if (!ssn) return '—'
  const digits = ssn.replace(/\D/g, '')
  if (digits.length <= 4) return `****${digits}`
  return `****${digits.slice(-4)}`
}

function MatchBar({ value }: { value: number }) {
  const color = value >= 85 ? 'success.main' : value >= 60 ? 'warning.main' : 'info.main'
  return (
    <Box sx={{ minWidth: 120 }}>
      <LinearProgress variant="determinate" value={value}
        sx={{ height: 8, borderRadius: 4, bgcolor: '#e9eef2',
          '& .MuiLinearProgress-bar': { backgroundColor: color } }} />
      <Typography variant="caption" sx={{ ml: .5 }}>{value}%</Typography>
    </Box>
  )
}

export default function DuplicatesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [editSuccessOpen, setEditSuccessOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    ssn: '',
    dob: '',
    address: { street: '', number: '', city: '', county: '' },
    phone: '',
    email: '',
    gender: ''
  });

  const handleAddClick = () => {
    setNewPatient({
      ...newPatient,
      firstName: first,
      lastName: last,
      dob: dob,
    });
    setAddOpen(true);
  };

  const handleAddClose = () => {
    setAddOpen(false);
    setNewPatient({
      firstName: '',
      lastName: '',
      ssn: '',
      dob: '',
      address: { street: '', number: '', city: '', county: '' },
      phone: '',
      email: '',
      gender: ''
    });
  };

  const handleAddSave = async () => {
    const flatPatient = {
        first_name: newPatient.firstName,
        last_name: newPatient.lastName,
        gender: newPatient.gender,
        date_of_birth: newPatient.dob,
        address: newPatient.address?.street ?? '',
        city: newPatient.address?.city ?? '',
        county: newPatient.address?.county ?? '',
        ssn: newPatient.ssn,
        phone_number: newPatient.phone,
        email: newPatient.email,
      };
      const token = sessionStorage.getItem('token');
      try {
        console.log('POST /intake/add_or_check with fields:');
        Object.entries(flatPatient).forEach(([key, value]) => {
          console.log(`  ${key}:`, value);
        });
        const response = await fetch('http://127.0.0.1:8000/intake/add_or_check', {
          method: 'POST',
          body: JSON.stringify(flatPatient),
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) {
          throw new Error('Failed to add patient');
        }
        const data = await response.json();
        console.log('Backend response:', data);
        if (data && typeof data === 'object' && data.created === false) {
          // Show error: user already exists
          setErrorOpen(true);
          setAddOpen(false);
          return;
        }
        if (data && typeof data === 'object' && data.created === true) {
          setSuccessOpen(true);
        }
        setAddOpen(false);
      } catch (error) {
        console.error('Error adding patient:', error);
        setAddOpen(false);
      }
  };

  const { first, last, setFirst, setLast, loading, patient, dupes, selected, toggleSelect, isAuthenticated, role, search, autoMergeSelected } = useDupeStore()
  const [dob, setDob] = useState<string>('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);

  const navigate = useNavigate()

  // Reset searchAttempted when user types
  const sorted = patient ? [patient, ...(Array.isArray(dupes) ? dupes : [])] : (Array.isArray(dupes) ? dupes : []);
  function handleFieldChange(setter: (v: string) => void, value: string) {
    setter(value);
    setSearchAttempted(false);
  }

  const isReceptionist = isAuthenticated && role === "receptionist";

  const handlePatientSave = (updated: Patient) => {
    // Actualizează pacientul în store sau trimite la backend
    // Exemplu: updatePatient(updated);
  };

  const dupesSafe = Array.isArray(dupes) ? dupes : [];


  const handleEditClick = (patient: Patient) => {
    setEditPatient(patient);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditPatient(null);
  };

  const handleEditSave = async () => {
    if (!editPatient) return;
    const token = sessionStorage.getItem('token');
    try {
      // Flatten the patient object to match backend model
      const flatPatient = {
        record_id: editPatient.id,
        first_name: editPatient.firstName,
        last_name: editPatient.lastName,
        ssn: editPatient.ssn,
        date_of_birth: editPatient.dob,
        phone_number: editPatient.phone,
        email: editPatient.email,
        address: editPatient.address?.street ?? '',
        city: editPatient.address?.city ?? '',
        county: editPatient.address?.county ?? '',
        number: editPatient.address?.number ?? '',
      };
      console.log('PATCH /patients/' + editPatient.id + ' with fields:');
      Object.entries(flatPatient).forEach(([key, value]) => {
        console.log(`  ${key}:`, value);
      });
      const response = await fetch(`http://127.0.0.1:8000/patients/${editPatient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(flatPatient),
      });
      if (!response.ok) {
        throw new Error('Failed to update patient');
      }
      setEditSuccessOpen(true);
      // Update local store snapshot so UI reflects new values
      const updated = { ...editPatient };
      // sync into store patient/dupes
      useDupeStore.setState((s) => ({
        patient: s.patient && s.patient.id === updated.id ? { ...s.patient, ...updated } : s.patient,
        dupes: s.dupes.map(p => p.id === updated.id ? { ...p, ...updated } : p),
      }));
    } catch (error) {
      console.error('Error updating patient:', error);
    }
    setEditOpen(false);
  };

  const { deletePatient } = useDupeStore();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  const handleDelete = (patientId: string) => {
        setPatientToDelete(patientId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (patientToDelete) {
      deletePatient(patientToDelete);
    }
    setConfirmDeleteOpen(false);
    setPatientToDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setPatientToDelete(null);
  };

  return (
    <>

      {isAuthenticated && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Insert the patient details.
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField label="First Name" value={first} onChange={e => handleFieldChange(setFirst, e.target.value)} fullWidth required />
                <TextField label="Last Name" value={last} onChange={e => handleFieldChange(setLast, e.target.value)} fullWidth required />
              <Button
                onClick={() => {
                  // @ts-ignore
                  window.__dupe_dob = dob;
                  setSearchAttempted(true);
                  search();
                }}
                variant="contained"
                disabled={!first || !last || loading}
                startIcon={loading ? <CircularProgress color="inherit" size={16} /> : null}
              >
                {loading ? 'Searching…' : 'Search'}
              </Button>
              {searchAttempted && sorted.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddClick}
                >
                  Add
                </Button>
              )}
            </Stack>
          </LocalizationProvider>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Example: Raymond Bell, Alice Johnson, Maria Ionescu, John Doe
          </Typography>
        </Paper>
      )}

      {loading && !patient && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              {[0,1,2].map(i => (
                <Box key={i} sx={{ flex: 1, minWidth: 0, mb: 2 }}>
                  <Skeleton variant="text" width={140} height={28} />
                  {Array.from({length:4}).map((_,j) => <Skeleton key={j} variant="text" />)}
                </Box>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {loading && patient && sorted.length === 0 && (
        <Paper sx={{ p: 2 }}>
          {Array.from({length:4}).map((_,i)=>(
            <Skeleton key={i} height={36} sx={{ mb: 1 }} />
          ))}
        </Paper>
      )}

      {sorted.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Paper
            sx={{
              p: 2,
              width: 'fit-content',
              bgcolor: '#fff',
              boxShadow: 3,
              borderRadius: 4,
              mx: 'auto',
              overflow: 'visible',
            }}
            elevation={3}
          >
            {role === 'admin' && (
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button variant="contained" color="secondary" disabled={!Object.values(selected||{}).some(Boolean) || loading}
                        onClick={async ()=>{
                          const res = await autoMergeSelected();
                          if (res && res.stopForReview) navigate('/merge');
                        }}>
                  Auto-Merge Selected
                </Button>
              </Stack>
            )}
            <Table size="small" sx={{ background: '#fff' }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>SSN</TableCell>
                  <TableCell>DOB</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>County</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((row, idx) => (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      {idx === 0 ? null : (
                        <Checkbox
                          color="primary"
                          size="small"
                          checked={!!selected?.[row.id]}
                          onChange={e=>toggleSelect(row.id, e.target.checked)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{row.firstName}</TableCell>
                    <TableCell>{row.lastName}</TableCell>
                    <TableCell>{maskSSN(row.ssn)}</TableCell>
                    <TableCell>{row.dob}</TableCell>
                    <TableCell>
                      {(row.address?.street ?? '') + (row.address?.number ? ' ' + row.address.number : '')}
                    </TableCell>
                    <TableCell>{row.address?.city}</TableCell>
                    <TableCell>{row.address?.county}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditClick(row)}
                          aria-label="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDelete(row.id)}
                          aria-label="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Show add patient only after search was attempted and not found */}
      {!loading && !patient && searchAttempted && (
        <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Patient is not registered in the database.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleAddClick}>
            Add new patient
          </Button>
        </Paper>
      )}

      {/* Error Snackbar */}
      <Snackbar open={errorOpen} autoHideDuration={5000} onClose={() => setErrorOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setErrorOpen(false)} severity="error" sx={{ width: '100%' }}>
          Patient already exists!
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar open={successOpen} autoHideDuration={5000} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Patient was successfully added!
        </Alert>
      </Snackbar>

      {/* Edit Success Snackbar */}
      <Snackbar open={editSuccessOpen} autoHideDuration={5000} onClose={() => setEditSuccessOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setEditSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Patient was successfully updated!
        </Alert>
      </Snackbar>

      {/* Pacient edit */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Patient</DialogTitle>
        <DialogContent>
          {editPatient && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="First Name"
                value={editPatient.firstName}
                onChange={e => setEditPatient({ ...editPatient, firstName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={editPatient.lastName}
                onChange={e => setEditPatient({ ...editPatient, lastName: e.target.value })}
                fullWidth
              />
              <TextField
                label="SSN"
                value={editPatient.ssn ?? ''}
                onChange={e => setEditPatient({ ...editPatient, ssn: e.target.value })}
                fullWidth
              />
              <TextField
                label="Date of Birth"
                value={editPatient.dob ?? ''}
                onChange={e => setEditPatient({ ...editPatient, dob: e.target.value })}
                fullWidth
              />
              <TextField
                label="Address"
                value={
                  ((editPatient.address?.street ?? '') +
                  (editPatient.address?.number ? ' ' + editPatient.address.number : '')).trim()
                }
                onChange={e => {
                  const val = e.target.value;
                  // Împarte la primul număr găsit
                  const match = val.match(/^(.*?)(\s\d+.*)?$/);
                  let street = val, number = '';
                  if (match) {
                    street = match[1].trim();
                    number = (match[2] ?? '').trim();
                  }
                  setEditPatient({
                    ...editPatient,
                    address: {
                      ...editPatient.address,
                      street,
                      number,
                    }
                  });
                }}
                fullWidth
              />
              <TextField
                label="City"
                value={editPatient.address?.city ?? ''}
                onChange={e => setEditPatient({
                  ...editPatient,
                  address: { ...editPatient.address, city: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="County"
                value={editPatient.address?.county ?? ''}
                onChange={e => setEditPatient({
                  ...editPatient,
                  address: { ...editPatient.address, county: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="Phone"
                value={editPatient.phone ?? ''}
                onChange={e => setEditPatient({ ...editPatient, phone: e.target.value })}
                fullWidth
              />
              <TextField
                label="Email"
                value={editPatient.email ?? ''}
                onChange={e => setEditPatient({ ...editPatient, email: e.target.value })}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={handleAddClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="First Name"
              value={newPatient.firstName}
              onChange={e => setNewPatient({ ...newPatient, firstName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={newPatient.lastName}
              onChange={e => setNewPatient({ ...newPatient, lastName: e.target.value })}
              fullWidth
            />
            <TextField
              label="SSN"
              value={newPatient.ssn}
              onChange={e => setNewPatient({ ...newPatient, ssn: e.target.value })}
              fullWidth
            />
            <TextField
              label="Date of Birth"
              value={newPatient.dob}
              onChange={e => setNewPatient({ ...newPatient, dob: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address"
              value={
                ((newPatient.address?.street ?? '') +
                (newPatient.address?.number ? ' ' + newPatient.address.number : '')).trim()
              }
              onChange={e => {
                const val = e.target.value;
                const match = val.match(/^(.*?)(\s\d+.*)?$/);
                let street = val, number = '';
                if (match) {
                  street = match[1].trim();
                  number = (match[2] ?? '').trim();
                }
                setNewPatient({
                  ...newPatient,
                  address: {
                    ...newPatient.address,
                    street,
                    number,
                  }
                });
              }}
              fullWidth
            />
            <TextField
              label="City"
              value={newPatient.address?.city ?? ''}
              onChange={e => setNewPatient({
                ...newPatient,
                address: { ...newPatient.address, city: e.target.value }
              })}
              fullWidth
            />
            <TextField
              label="County"
              value={newPatient.address?.county ?? ''}
              onChange={e => setNewPatient({
                ...newPatient,
                address: { ...newPatient.address, county: e.target.value }
              })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={newPatient.phone}
              onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={newPatient.email}
              onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddClose}>Cancel</Button>
          <Button onClick={handleAddSave} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Are you sure you want to delete current user?</DialogTitle>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Yes</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
