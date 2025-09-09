import Grid from '@mui/material/Grid'
import {
  Paper, Stack, TextField, Button, Typography, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Skeleton, Box, LinearProgress, CircularProgress, Tooltip
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useState } from 'react'
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
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    ssn: '',
    dob: '',
    address: { street: '', number: '', city: '', county: '' },
    phone: '',
    email: ''
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
      email: ''
    });
  };

  const handleAddSave = () => {
    // Adaugă pacientul nou (ex: trimite la backend sau adaugă în store)
    // addPatient(newPatient);
    setAddOpen(false);
  };

  const { first, last, setFirst, setLast, loading, patient, dupes, findDuplicates, isAuthenticated, role } = useDupeStore()
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

  const handleEditSave = () => {
    // Salvează modificările (ex: trimite la backend)
    handlePatientSave(editPatient!);
    setEditOpen(false);
  };

  const handleDelete = (patientId: string) => {
    // Exemplu: șterge din store sau trimite la backend
    // updateDupeStore(patientId);
    // Sau doar filtrare locală pentru demo:
    // setDupeList(prev => prev.filter(p => p.id !== patientId));
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
              <TextField label="First Name*" value={first} onChange={e => handleFieldChange(setFirst, e.target.value)} fullWidth required />
              <TextField label="Last Name*" value={last} onChange={e => handleFieldChange(setLast, e.target.value)} fullWidth required />
              <Box sx={{ minWidth: 220, flex: 1 }}>
                <DatePicker
                  label="Date of Birth (optional)"
                  value={dob ? new Date(dob) : null}
                  onChange={(date: Date | null) => { handleFieldChange(setDob, date ? date.toISOString().slice(0, 10) : ''); }}
                  slotProps={{ textField: { fullWidth: true } }}
                  disableFuture
                  format="yyyy-MM-dd"
                />
              </Box>
              <Button
                onClick={() => {
                  // @ts-ignore
                  window.__dupe_dob = dob;
                  setSearchAttempted(true);
                  findDuplicates();
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

      {/* Skeleton pentru card */}
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

      {/* Skeleton pentru tabel */}
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
        {/* Eliminat titlul deasupra tabelului */}
            <Table size="small" sx={{ background: '#fff' }}>
              <TableHead>
                <TableRow>
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
                {sorted.map(row => (
                  <TableRow key={row.id} hover>
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

      {/* Dialog pentru editare pacient */}
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
      
    </>
  )
}

// Exemplu pentru array-ul de coloane într-un DataGrid/Table
const columns = [
  // ...alte coloane...
  {
    field: 'address',
    headerName: 'Address',
    width: 200,
    valueGetter: (params) =>
      (params.row.address?.street ?? '') +
      (params.row.address?.number ? ' ' + params.row.address.number : ''),
  },
  // ...alte coloane...
]
