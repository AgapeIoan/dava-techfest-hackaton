import Grid from '@mui/material/Grid'
import {
  Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Stack, Button, Divider, Backdrop, CircularProgress, Chip
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDupeStore from '../store/dupeStore'
import type { Patient } from '../store/dupeStore'

type Draft = Patient

export default function MergePage() {
  const { mergeCtx, applyMerge, loading ,role } = useDupeStore()
  const navigate = useNavigate()

  useEffect(() => { if (!mergeCtx) navigate('/duplicates', { replace: true }) }, [mergeCtx, navigate])
  if (!mergeCtx) return null

  const { keeper, candidates } = mergeCtx
  const [draft, setDraft] = useState<Draft>({ ...keeper, address: { ...(keeper.address ?? { street:'', number:'', city:'', county:'' }) } })
  const canApprove = useMemo(() => !!draft.firstName && !!draft.lastName && role === 'admin',
    [draft, role]
  )

  const options = <T extends keyof Draft>(key: T) => Array.from(new Set([keeper, ...candidates].map(p => String((p as any)[key] ?? ''))))
  const addrOptions = (key: keyof NonNullable<Draft['address']>) => Array.from(new Set([keeper, ...candidates].map(p => String(p.address?.[key] ?? ''))))

  const changed = (path: string, val?: string) => {
    const cur = path.startsWith('address.')
      ? String((keeper.address as any)?.[path.split('.')[1]] ?? '')
      : String((keeper as any)[path] ?? '')
    return cur !== String(val ?? '')
  }

  async function onApprove() {
    // MOCK MODE: aplică merge în memorie (store.applyMerge)
    // API MODE: store.applyMerge va POST-a către /api/merge/approve (vezi store/dupeStore.ts comentarii)
    const res = await applyMerge(draft)
    if (res.ok) navigate('/duplicates')
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        Merge Patient Profiles
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
        Select the correct value for each field to create the master profile.
      </Typography>

      <Section title="Personal information">
        <Field label="First Name"  value={draft.firstName} list={options('firstName')}
          onChange={(v)=>setDraft(d=>({ ...d, firstName:v }))} changed={changed('firstName', draft.firstName)} />
        <Field label="Last Name"   value={draft.lastName}  list={options('lastName')}
          onChange={(v)=>setDraft(d=>({ ...d, lastName:v }))}   changed={changed('lastName', draft.lastName)} />
        <Field label="Social Security Number" value={draft.ssn} list={options('ssn')}
          onChange={(v)=>setDraft(d=>({ ...d, ssn:v }))} changed={changed('ssn', draft.ssn)} />
        <Field label="Date of Birth"           value={draft.dob} list={options('dob')}
          onChange={(v)=>setDraft(d=>({ ...d, dob:v }))} changed={changed('dob', draft.dob)} />
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section title="Address">
        <Field label="Street" value={draft.address?.street} list={addrOptions('street')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, street:v }}))}
          changed={changed('address.street', draft.address?.street)} />
        <Field label="Number" value={draft.address?.number} list={addrOptions('number')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, number:v }}))}
          changed={changed('address.number', draft.address?.number)} />
        <Field label="City"   value={draft.address?.city}   list={addrOptions('city')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, city:v }}))}
          changed={changed('address.city', draft.address?.city)} />
        <Field label="County" value={draft.address?.county} list={addrOptions('county')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, county:v }}))}
          changed={changed('address.county', draft.address?.county)} />
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section title="Contact">
        <Field label="Phone" value={draft.phone} list={options('phone')}
          onChange={(v)=>setDraft(d=>({ ...d, phone:v }))} changed={changed('phone', draft.phone)} />
        <Field label="Email" value={draft.email} list={options('email')}
          onChange={(v)=>setDraft(d=>({ ...d, email:v }))} changed={changed('email', draft.email)} />
      </Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" color="secondary" onClick={() => navigate('/duplicates')}>
          Back to Duplicates
        </Button>
        <Button variant="contained" color="success" disabled={!canApprove} onClick={onApprove}>
          Approve Merge
        </Button>
      </Stack>

      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (t)=>t.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Paper>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
      <Grid container spacing={2}>{children}</Grid>
    </div>
  )
}

function Field({ label, value, list, onChange, changed }:{
  label:string; value?:string; list:string[]; onChange:(v:string)=>void; changed?: boolean
}) {
  const id = label.replace(/\s+/g,'-').toLowerCase()
  return (
    <Grid item xs={12} md={3}>
      <FormControl fullWidth size="small">
        <InputLabel id={`${id}-label`}>{label}</InputLabel>
        <Select labelId={`${id}-label`} label={label} value={value ?? ''} onChange={(e)=>onChange(e.target.value as string)}
          sx={{ ...(changed ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } } : {}) }}>
          {list.map((v,i)=><MenuItem key={i} value={v}>{v || '—'}</MenuItem>)}
        </Select>
      </FormControl>
      {changed && <Chip size="small" label="Changed" color="primary" sx={{ mt: .5 }} />}
    </Grid>
  )
}
