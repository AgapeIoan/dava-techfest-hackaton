import Grid from '@mui/material/Grid'
import {
  Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Stack, Button, Divider, Backdrop, CircularProgress, Chip
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useDupeStore from '../store/dupeStore'
import type { Patient } from '../store/dupeStore'
import axios from 'axios'

type Draft = Patient

export default function MergePage() {
  const { mergeCtx, applyMerge, loading ,role, aiSuggestion: storeAiSuggestion } = useDupeStore()
  const navigate = useNavigate()

  useEffect(() => { if (!mergeCtx) navigate('/duplicates', { replace: true }) }, [mergeCtx, navigate])
  if (!mergeCtx) return null

  const { keeper, candidates } = mergeCtx
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const effectiveAiSuggestion = storeAiSuggestion ?? aiSuggestion;
  const initialFromAi = useMemo(()=>{
    if (!effectiveAiSuggestion?.suggested_golden_record) return null;
    const gr = effectiveAiSuggestion.suggested_golden_record;
    // map backend keys -> frontend Patient draft
    const mapped: Draft = {
      id: keeper.id,
      firstName: gr.first_name ?? keeper.firstName,
      lastName: gr.last_name ?? keeper.lastName,
      dob: gr.date_of_birth ?? keeper.dob,
      ssn: gr.ssn ?? keeper.ssn,
      phone: gr.phone_number ?? keeper.phone,
      email: gr.email ?? keeper.email,
      address: {
        street: gr.address ?? keeper.address?.street ?? '',
        number: keeper.address?.number ?? '',
        city: gr.city ?? keeper.address?.city ?? '',
        county: gr.county ?? keeper.address?.county ?? '',
      }
    };
    return mapped;
  }, [effectiveAiSuggestion, keeper]);
  const [draft, setDraft] = useState<Draft>(initialFromAi || { ...keeper, address: { ...(keeper.address ?? { street:'', number:'', city:'', county:'' }) } })
  useEffect(()=>{
    if (initialFromAi) setDraft(initialFromAi);
  }, [initialFromAi]);
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
    const res = await applyMerge(draft)
    if (res.ok) navigate('/duplicates')
  }

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function onAutoMerge() {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const records = [keeper, ...candidates];
      const res = await axios.post('/dedupe/suggest_merge', records);
      setAiSuggestion(res.data);
    } catch (err: any) {
      setAiError(err?.response?.data?.detail || 'Failed to get AI merge suggestion.');
    } finally {
      setAiLoading(false);
    }
  }

  // helpers for AI review/justifications
  const conflictByField = useMemo(()=>{
    const m = new Map<string, { chosen_value:any; justification?:string }>();
    const arr = effectiveAiSuggestion?.conflicts_resolved as Array<any> | undefined;
    if (arr) for (const c of arr) m.set(c.field_name, { chosen_value:c.chosen_value, justification:c.justification });
    return m;
  }, [effectiveAiSuggestion]);

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
          onChange={(v)=>setDraft(d=>({ ...d, firstName:v }))}
          changed={changed('firstName', draft.firstName)}
          aiInfo={conflictByField.get('first_name')}
        />
        <Field label="Last Name"   value={draft.lastName}  list={options('lastName')}
          onChange={(v)=>setDraft(d=>({ ...d, lastName:v }))}
          changed={changed('lastName', draft.lastName)}
          aiInfo={conflictByField.get('last_name')}
        />
        <Field label="Social Security Number" value={draft.ssn} list={options('ssn')}
          onChange={(v)=>setDraft(d=>({ ...d, ssn:v }))}
          changed={changed('ssn', draft.ssn)}
          aiInfo={conflictByField.get('ssn')}
        />
        <Field label="Date of Birth"           value={draft.dob} list={options('dob')}
          onChange={(v)=>setDraft(d=>({ ...d, dob:v }))}
          changed={changed('dob', draft.dob)}
          aiInfo={conflictByField.get('date_of_birth')}
        />
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section title="Address">
        <Field label="Street" value={draft.address?.street} list={addrOptions('street')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, street:v }}))}
          changed={changed('address.street', draft.address?.street)}
          aiInfo={conflictByField.get('address')}
        />
        <Field label="Number" value={draft.address?.number} list={addrOptions('number')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, number:v }}))}
          changed={changed('address.number', draft.address?.number)}
        />
        <Field label="City"   value={draft.address?.city}   list={addrOptions('city')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, city:v }}))}
          changed={changed('address.city', draft.address?.city)}
          aiInfo={conflictByField.get('city')}
        />
        <Field label="County" value={draft.address?.county} list={addrOptions('county')}
          onChange={(v)=>setDraft(d=>({ ...d, address:{ ...d.address!, county:v }}))}
          changed={changed('address.county', draft.address?.county)}
          aiInfo={conflictByField.get('county')}
        />
      </Section>

      <Divider sx={{ my: 2 }} />

      <Section title="Contact">
        <Field label="Phone" value={draft.phone} list={options('phone')}
          onChange={(v)=>setDraft(d=>({ ...d, phone:v }))}
          changed={changed('phone', draft.phone)}
          aiInfo={conflictByField.get('phone_number')}
        />
        <Field label="Email" value={draft.email} list={options('email')}
          onChange={(v)=>setDraft(d=>({ ...d, email:v }))}
          changed={changed('email', draft.email)}
          aiInfo={conflictByField.get('email')}
        />
      </Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" color="secondary" onClick={() => navigate('/duplicates')}>
          Back to Duplicates
        </Button>
        <Button variant="contained" color="success" disabled={!canApprove} onClick={onApprove}>
          Approve Merge
        </Button>
        <Button variant="contained" color="primary" disabled={aiLoading} onClick={onAutoMerge}>
          Auto-Merge Selected
        </Button>
      </Stack>

      {aiLoading && (
        <Backdrop open sx={{ color: '#fff', zIndex: (t)=>t.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      )}
      {aiError && (
        <Typography color="error" sx={{ mt: 2 }}>{aiError}</Typography>
      )}
      {effectiveAiSuggestion && (
        <Paper sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>AI Merge Suggestion</Typography>
          {effectiveAiSuggestion.human_review_required ? (
            <Typography color="warning.main">Some fields require human review. See highlighted fields and tooltips.</Typography>
          ) : (
            <Typography color="success.main">All conflicts resolved by AI. You can approve directly.</Typography>
          )}
          <div style={{ marginTop: 8 }}>
            {(effectiveAiSuggestion.conflicts_resolved||[]).map((c:any, i:number)=> (
              <Chip key={i} label={`${c.field_name}: ${c.chosen_value} — ${c.justification||''}`} size="small" sx={{ mr:.5, mb:.5 }} />
            ))}
          </div>
        </Paper>
      )}
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

function Field({ label, value, list, onChange, changed, aiInfo }:{
  label:string; value?:string; list:string[]; onChange:(v:string)=>void; changed?: boolean; aiInfo?: { chosen_value:any; justification?:string }
}) {
  const id = label.replace(/\s+/g,'-').toLowerCase()
  return (
    <Grid item xs={12} md={3}>
      <FormControl fullWidth size="small">
        <InputLabel id={`${id}-label`}>{label}</InputLabel>
        <Select labelId={`${id}-label`} label={label} value={value ?? ''} onChange={(e)=>onChange(e.target.value as string)}
          sx={{ ...(changed ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } } : {}), ...(aiInfo?.chosen_value==='NEEDS_HUMAN_REVIEW' ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' } } : {}) }}>
          {list.map((v,i)=><MenuItem key={i} value={v}>{v || '—'}</MenuItem>)}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={0.5} sx={{ mt: .5 }}>
        {changed && <Chip size="small" label="Changed" color="primary" />}
        {aiInfo?.chosen_value==='NEEDS_HUMAN_REVIEW' && <Chip size="small" label={aiInfo?.justification || 'Needs review'} color="warning" />}
        {aiInfo && aiInfo?.chosen_value!=='NEEDS_HUMAN_REVIEW' && aiInfo?.justification && <Chip size="small" label={`AI: ${aiInfo.justification}`} color="info" />}
      </Stack>
    </Grid>
  )
}
