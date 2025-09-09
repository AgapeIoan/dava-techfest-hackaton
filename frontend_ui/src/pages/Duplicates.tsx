import Grid from '@mui/material/Grid'
import {
  Paper, Stack, TextField, Button, Typography, Card, CardContent,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox,
  Chip, Skeleton, Box, LinearProgress, CircularProgress, Tooltip
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDupeStore from '../store/dupeStore'


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

type Order = 'asc' | 'desc'

export default function DuplicatesPage() {
  const {
    first, last, setFirst, setLast, loading,
    patient, dupes, selected, search, findDuplicates, toggleSelect, startMerge,    role
  } = useDupeStore()

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  )
  const navigate = useNavigate()

  // sort simplu
  const [orderBy, setOrderBy] = useState<'matchPct'|'firstName'|'lastName'>('matchPct')
  const [order, setOrder] = useState<Order>('desc')
  const sorted = useMemo(() => {
    const arr = [...dupes]
    arr.sort((a,b) => {
      const dir = order === 'asc' ? 1 : -1
      if (orderBy === 'matchPct') return (a.matchPct - b.matchPct) * dir
      return String(a[orderBy]).localeCompare(String(b[orderBy])) * dir
    })
    return arr
  }, [dupes, orderBy, order])

  function onSort(col: typeof orderBy) {
    if (orderBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setOrderBy(col); setOrder('asc') }
  }

  function exportCSV() {
    const header = ['First Name','Last Name','Match %','SSN','DOB','Street','No','City','County','Phone','Email']
    const rows = dupes.map(r => [
      r.firstName, r.lastName, r.matchPct, r.ssn ?? '', r.dob ?? '',
      r.address?.street ?? '', r.address?.number ?? '', r.address?.city ?? '', r.address?.county ?? '',
      r.phone ?? '', r.email ?? ''
    ])
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'duplicates.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
          <TextField label="First Name*" value={first} onChange={(e) => setFirst(e.target.value)} fullWidth />
          <TextField label="Last Name*" value={last} onChange={(e) => setLast(e.target.value)} fullWidth />
          <Button onClick={search} variant="contained" disabled={!first || !last || loading}
            startIcon={loading ? <CircularProgress color="inherit" size={16} /> : null}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Exemple: Raymond Bell, Alice Johnson, Maria Ionescu, John Doe
        </Typography>
      </Paper>

      {/* Skeleton pentru card */}
      {loading && !patient && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              {[0,1,2].map(i => (
                <Grid item xs={12} md={4} key={i}>
                  <Skeleton variant="text" width={140} height={28} />
                  {Array.from({length:4}).map((_,j) => <Skeleton key={j} variant="text" />)}
                </Grid>
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
                <Grid item xs={12} md={4}>
                  <Typography fontWeight={600}>Patient</Typography>
                  <Typography>First Name: {patient.firstName}</Typography>
                  <Typography>Last Name: {patient.lastName}</Typography>
                  <Typography>SSN: {patient.ssn ?? '—'}</Typography>
                  <Typography>Date of Birth: {patient.dob ?? '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography fontWeight={600}>Address</Typography>
                  <Typography>Street: {patient.address?.street}</Typography>
                  <Typography>Number: {patient.address?.number}</Typography>
                  <Typography>City: {patient.address?.city}</Typography>
                  <Typography>County: {patient.address?.county}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography fontWeight={600}>Contact</Typography>
                  <Typography>Phone: {patient.phone ?? '—'}</Typography>
                  <Typography>Email: {patient.email ?? '—'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }} spacing={2}>
            <Button variant="contained" onClick={findDuplicates} disabled={loading}
              startIcon={loading ? <CircularProgress color="inherit" size={16} /> : null}>
              {loading ? '…' : 'Find duplicates'}
            </Button>
            <Button color="secondary" variant="outlined" onClick={exportCSV}  disabled={dupes.length === 0 || (role !== 'auditor' && role !== 'admin')} 
            >
              Export CSV
            </Button>
            <Button color="primary" variant="contained" disabled={selectedIds.length === 0}
              onClick={() => { startMerge(); navigate('/merge') }}>
              Merge Selected
            </Button>
          </Stack>
        </>
      )}

      {/* Skeleton pentru tabel */}
      {loading && patient && dupes.length === 0 && (
        <Paper sx={{ p: 2 }}>
          {Array.from({length:4}).map((_,i)=>(
            <Skeleton key={i} height={36} sx={{ mb: 1 }} />
          ))}
        </Paper>
      )}

      {dupes.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Potential duplicates: {dupes.length}
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell onClick={()=>onSort('firstName')} sx={{ cursor:'pointer' }}>First Name</TableCell>
                <TableCell onClick={()=>onSort('lastName')}  sx={{ cursor:'pointer' }}>Last Name</TableCell>
                <TableCell onClick={()=>onSort('matchPct')}  sx={{ cursor:'pointer' }}>Match</TableCell>
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
                  <TableCell>
                    <Checkbox checked={!!selected[row.id]} onChange={(e) => toggleSelect(row.id, e.target.checked)} />
                  </TableCell>
                  <TableCell>{row.firstName}</TableCell>
                  <TableCell>{row.lastName}</TableCell>
                  <TableCell><MatchBar value={row.matchPct} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {row.reasons.map((r, i) => (
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
    </>
  )
}
