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
import DuplicateGroup from "../components/DuplicateGroup";
import useDupeStore from "../store/dupeStore";


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

  const { first, last, setFirst, setLast, loading, patient, dupes, findDuplicates, isAuthenticated, role } = useDupeStore()
  const [dob, setDob] = useState<string>('');
  const [searchAttempted, setSearchAttempted] = useState(false);

  const navigate = useNavigate()

  // Reset searchAttempted when user types
  const sorted = Array.isArray(dupes) ? dupes : [];
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


  return (
    <>

      {isAuthenticated && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Insert the patient details.
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
              <TextField label="First Name*" value={first} onChange={(e) => handleFieldChange(setFirst, e.target.value)} fullWidth required />
              <TextField label="Last Name*" value={last} onChange={(e) => handleFieldChange(setLast, e.target.value)} fullWidth required />
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


      {patient && !loading && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Search Result: “{patient.firstName} {patient.lastName}”
          </Typography>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Box sx={{ flex: 1, minWidth: 0, mb: 2 }}>
                  <Typography fontWeight={600}>Patient</Typography>
                  <Typography>First Name: {patient.firstName}</Typography>
                  <Typography>Last Name: {patient.lastName}</Typography>
                  <Typography>SSN: {patient.ssn ?? '—'}</Typography>
                  <Typography>Date of Birth: {patient.dob ?? '—'}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, mb: 2 }}>
                  <Typography fontWeight={600}>Address</Typography>
                  <Typography>Street: {patient.address?.street}</Typography>
                  <Typography>Number: {patient.address?.number}</Typography>
                  <Typography>City: {patient.address?.city}</Typography>
                  <Typography>County: {patient.address?.county}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, mb: 2 }}>
                  <Typography fontWeight={600}>Contact</Typography>
                  <Typography>Phone: {patient.phone ?? '—'}</Typography>
                  <Typography>Email: {patient.email ?? '—'}</Typography>
                </Box>
              </Grid>
            </CardContent>
          </Card>
          {/* Removed Find duplicates and Export CSV buttons */}
        </>
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
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Potential duplicates: {sorted.length}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Match</TableCell>
                <TableCell>Reasons</TableCell>
                <TableCell>SSN</TableCell>
                <TableCell>DOB</TableCell>
                <TableCell>Street</TableCell>
                <TableCell>No.</TableCell>
                <TableCell>City</TableCell>
                <TableCell>County</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.firstName}</TableCell>
                  <TableCell>{row.lastName}</TableCell>
                  <TableCell><MatchBar value={typeof row.matchPct === 'number' ? row.matchPct : 0} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {(Array.isArray(row.reasons) ? row.reasons : []).map((r, i) => (
                        <Tooltip key={i} title={r} arrow>
                          <Chip label={r} size="small"
                            color={r.includes('SSN') || r.includes('DOB') ? 'success' : 'default'} />
                        </Tooltip>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{maskSSN(row.ssn)}</TableCell>
                  <TableCell>{row.dob}</TableCell>
                  <TableCell>{row.address?.street}</TableCell>
                  <TableCell>{row.address?.number}</TableCell>
                  <TableCell>{row.address?.city}</TableCell>
                  <TableCell>{row.address?.county}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Show add patient only after search was attempted and not found */}
      {!loading && !patient && searchAttempted && (
        <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Patient is not registered in the database.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate('/add-patient')}>
            Add new patient
          </Button>
        </Paper>
      )}

      <h2>Profil pacient</h2>
      {patient && (
        <DuplicateGroup
          patient={patient}
          isReceptionist={isReceptionist}
          onSave={handlePatientSave}
        />
      )}
      {(dupes ?? []).length > 0 && (
        <div>
          <h3>Alți pacienți găsiți:</h3>
          {(dupes ?? []).map(p => (
            <DuplicateGroup
              key={p.id}
              patient={p}
              isReceptionist={isReceptionist}
              onSave={handlePatientSave}
            />
          ))}
        </div>
      )}
    </>
  )
}
