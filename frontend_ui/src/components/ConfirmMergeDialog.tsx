// --- START OF FILE src/components/ConfirmMergeDialog.tsx ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Accordion, AccordionSummary,
  AccordionDetails, Typography, Grid, Chip, Box, Stack, Divider, Paper, Tooltip, IconButton, Alert,
  Select, MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { DuplicateGroupData, Profile } from '../pages/Admin';
import { API_BASE, getAuthToken } from '../store/dupeStore';

// --- Helpers to call real LLM backend ---
type AiResolution = { field_name: string; value_A: any; value_B: any; chosen_value: any; justification?: string };
type AiSuggestion = {
  suggested_golden_record: any;
  human_review_required: boolean;
  conflicts_resolved: AiResolution[];
  processing_log?: string[];
};

function toBackendRecord(p: any) {
  return {
    record_id: String(p.recordId ?? p.id ?? ''),
    original_record_id: p.originalRecordId ?? null,
    first_name: p.firstName ?? '',
    last_name: p.lastName ?? '',
    gender: p.gender ?? '',
    date_of_birth: p.dateOfBirth ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    county: p.county ?? '',
    ssn: p.ssn ?? '',
    phone_number: p.phoneNumber ?? p.phone ?? '',
    email: p.email ?? '',
  };
}

function goldenToUi(gr: any): Partial<Profile> {
  return {
    // Keep camelCase used in Admin UI
    firstName: gr.first_name ?? '',
    lastName: gr.last_name ?? '',
    dateOfBirth: gr.date_of_birth ?? '',
    phoneNumber: gr.phone_number ?? '',
    email: gr.email ?? '',
    ssn: gr.ssn ?? '',
    address: gr.address ?? '',
    city: gr.city ?? '',
    county: gr.county ?? '',
    gender: gr.gender ?? '',
  } as Partial<Profile>;
}


// --- Component Props ---
interface ConfirmMergeDialogProps {
  open: boolean;
  groups: DuplicateGroupData[];
  onApprove: (approvedGroups: DuplicateGroupData[]) => void;
  onCancel: () => void;
}

export default function ConfirmMergeDialog({ open, groups, onApprove, onCancel }: ConfirmMergeDialogProps) {
  const [pendingGroups, setPendingGroups] = useState<DuplicateGroupData[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, AiSuggestion | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showLog, setShowLog] = useState<Record<string, boolean>>({});
  const [manualChoices, setManualChoices] = useState<Record<string, Record<string, string>>>({});

  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase());

  useEffect(() => {
    // When the modal opens, populate the pending list from props and fetch AI suggestions
    if (!open) return;
    setPendingGroups(groups);
    (async () => {
      const token = getAuthToken();
      for (const g of groups) {
        const gid = String((g.mainProfile as any).recordId ?? (g.mainProfile as any).id);
        setLoading(prev => ({ ...prev, [gid]: true }));
        setErrors(prev => ({ ...prev, [gid]: null }));
        try {
          const records = [g.mainProfile, ...(g.duplicates || [])].map(toBackendRecord);
          const res = await fetch(`${API_BASE}/dedupe/suggest_merge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(records),
          });
          if (!res.ok) throw new Error(`AI suggest failed (${res.status})`);
          const data: AiSuggestion = await res.json();
          setSuggestions(prev => ({ ...prev, [gid]: data }));
        } catch (e: any) {
          setErrors(prev => ({ ...prev, [gid]: e?.message || 'Failed to get AI suggestion' }));
          setSuggestions(prev => ({ ...prev, [gid]: null }));
        } finally {
          setLoading(prev => ({ ...prev, [gid]: false }));
        }
      }
    })();
  }, [groups, open]);

  // --- NEW: Handler to reject/remove a single group ---
  const handleRejectGroup = (event: React.MouseEvent, groupIdToReject: number | string) => {
    event.stopPropagation(); // Prevents the accordion from toggling
    setPendingGroups(prev => prev.filter(g => ((g.mainProfile as any).recordId ?? (g.mainProfile as any).id) !== groupIdToReject));
  };

  if (!groups.length) return null;

  // helpers to compute updates payload for /patients/merge
  const buildUpdates = (main: any, goldenUi: Partial<Profile>) => {
    const updates: Record<string, any> = {};
    const mapping: Array<[string, string]> = [
      ['first_name','firstName'], ['last_name','lastName'], ['date_of_birth','dateOfBirth'],
      ['phone_number','phoneNumber'], ['email','email'], ['ssn','ssn'],
      ['address','address'], ['city','city'], ['county','county'], ['gender','gender']
    ];
    for (const [snake, camel] of mapping) {
      const cur = (main as any)?.[camel];
      const val = (goldenUi as any)?.[camel];
      if (val !== undefined && String(val ?? '') !== String(cur ?? '')) updates[snake] = val ?? '';
    }
    return updates;
  };

  const handleApprove = async () => {
    setSubmitting(true);
    const token = getAuthToken();
    const okGroups: DuplicateGroupData[] = [];
    for (const g of pendingGroups) {
      const gid = String((g.mainProfile as any).recordId ?? (g.mainProfile as any).id);
      const ai = suggestions[gid];
      if (!ai) continue;
      try {
        // Merge AI suggestion with any manual choices for review fields
        const goldenUiBase = goldenToUi(ai.suggested_golden_record);
        const overrides = manualChoices[gid] || {};
        const goldenUi = { ...goldenUiBase, ...overrides } as Partial<Profile>;
        // If AI requires review and not all fields have a manual choice, skip this group
        const reviewFields = (ai.conflicts_resolved || [])
          .filter(c => c.chosen_value === 'NEEDS_HUMAN_REVIEW')
          .map(c => snakeToCamel(c.field_name));
        const unresolved = reviewFields.filter(f => (overrides[f] ?? '') === '');
        if (unresolved.length > 0) {
          continue;
        }
        const updates = buildUpdates(g.mainProfile, goldenUi);
        const masterId = (g.mainProfile as any).recordId ?? (g.mainProfile as any).id;
        const duplicateIds = (g.duplicates || [])
          .map((d:any)=> d.recordId ?? d?.other_patient?.record_id ?? d.id)
          .filter((id:any)=> id != null && id !== masterId);
        const payload = {
          master_record_id: masterId,
          duplicate_record_ids: duplicateIds,
          updates,
          reason: 'AI auto-merge (Admin)'
        };
        const res = await fetch(`${API_BASE}/patients/merge`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`merge failed (${res.status})`);
        okGroups.push(g);
      } catch (e:any) {
        setErrors(prev => ({ ...prev, [gid]: e?.message || 'Merge failed' }));
      }
    }
    setSubmitting(false);
    if (okGroups.length > 0) {
      // notify parent to remove merged groups from list
      onApprove(okGroups);
      // keep dialog open with remaining (non-merged) groups
      setPendingGroups(prev => prev.filter(pg => !okGroups.includes(pg)));
    }
    // if none left pending, close
    const stillPending = pendingGroups.filter(pg => !okGroups.includes(pg));
    if (stillPending.length === 0) onCancel();
  };

  const readyToMergeCount = pendingGroups.filter(pg => {
    const gid = String((pg.mainProfile as any).recordId ?? (pg.mainProfile as any).id);
    const ai = suggestions[gid];
    if (!ai || loading[gid] || errors[gid]) return false;
    const reviewFields = (ai.conflicts_resolved || [])
      .filter(c => c.chosen_value === 'NEEDS_HUMAN_REVIEW')
      .map(c => snakeToCamel(c.field_name));
    if (reviewFields.length === 0) return true;
    const overrides = manualChoices[gid] || {};
    return reviewFields.every(f => (overrides[f] ?? '') !== '');
  }).length;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="md">
      <DialogTitle>
        {/*Confirm Auto-Merge for {groups.length} Group{groups.length > 1 ? 's' : ''} */}
        Confirm Auto-Merge for {pendingGroups.length} Group{pendingGroups.length !== 1 ? 's' : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The AI has suggested the following merges. Reject any you disagree with before approving.
        </Typography>

        {pendingGroups.map((group, index) => {
          const gid = String((group.mainProfile as any).recordId ?? (group.mainProfile as any).id ?? index);
          const ai = suggestions[gid] || null;
          const mergedProfile = ai?.suggested_golden_record ? goldenToUi(ai.suggested_golden_record) : ({} as Partial<Profile>);
          const resByField: Record<string, { chosen_value:any; justification?:string }> = {};
          (ai?.conflicts_resolved || []).forEach(c => {
            const camel = snakeToCamel(c.field_name);
            resByField[camel] = { chosen_value: c.chosen_value, justification: c.justification };
          });
          // helper: options with provenance for review selection
          const optionsFor = (camelKey: string) => {
            type Opt = { value: string; sourceId: string; sourceTag: 'main' | 'dup' };
            const out: Opt[] = [];
            const add = (value: any, sourceId: any, sourceTag: 'main' | 'dup') => {
              const v = value == null ? '' : String(value);
              const id = sourceId == null ? '' : String(sourceId);
              if (!v) return;
              // de-dup by value string
              if (out.some(o => o.value === v)) return;
              out.push({ value: v, sourceId: id, sourceTag });
            };
            const main = group.mainProfile as any;
            add(main[camelKey], (main.recordId ?? main.id), 'main');
            (group.duplicates || []).forEach((d:any)=> {
              const dv = d[camelKey] ?? d?.other_patient?.[camelKey];
              const did = d.recordId ?? d?.other_patient?.record_id ?? d.id;
              add(dv, did, 'dup');
            });
            return out;
          };
          return (
            <Accordion key={gid} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {/* --- Reject button (rendered as div to avoid nested button) --- */}
                <Tooltip title="Reject this Merge Suggestion">
                  <IconButton
                    component="div"
                    size="small"
                    onClick={(event) => handleRejectGroup(event, (group.mainProfile as any).recordId ?? (group.mainProfile as any).id)}
                    sx={{ mr: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
                <Typography fontWeight="bold">Merge for: {group.mainProfile.firstName} {group.mainProfile.lastName}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Left Column: Source Profiles */}
                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle2" gutterBottom>Source Profiles</Typography>
                    <Stack spacing={1}>
                      {[group.mainProfile, ...group.duplicates].map((p, idx) => (
                        <Paper key={(p as any).recordId ?? (p as any).id ?? idx} variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{(p as any).firstName} {(p as any).lastName} (# {(p as any).recordId ?? (p as any).id})</Typography>
                          <Typography variant="caption" color="text.secondary" component="div">Email: {(p as any).email}</Typography>
                          <Typography variant="caption" color="text.secondary" component="div">Phone: {(p as any).phoneNumber ?? (p as any).phone}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Grid>

                  {/* Right Column: Suggested Merged Profile */}
                  <Grid item xs={12} md={7}>
                     <Typography variant="subtitle2" gutterBottom>AI Suggested Merged Profile</Typography>
                     {loading[gid] && (
                       <Typography variant="body2" color="text.secondary">Loading AI suggestion…</Typography>
                     )}
                     {errors[gid] && (
                       <Typography variant="body2" color="error">{errors[gid]}</Typography>
                     )}
                     {!loading[gid] && !errors[gid] && ai && (
                       <>
                         <Stack spacing={1.5}>
                           {Object.entries(mergedProfile).map(([key, value]) => {
                             const res = resByField[key];
                             const opts = optionsFor(key);
                             const gidChoices = manualChoices[gid] || {};
                             const overrideVal = gidChoices[key];
                             const needsReview = res?.chosen_value === 'NEEDS_HUMAN_REVIEW';
                             const displayVal = String((overrideVal ?? value) ?? '');
                             return (
                               <Box key={String(key)} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                 <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 500, textTransform: 'capitalize' }}>
                                   {key.replace(/([A-Z])/g, ' $1')}:
                                 </Typography>
                                 <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 200 }}>{displayVal}</Typography>
                                 {res ? (
                                   res.chosen_value === 'NEEDS_HUMAN_REVIEW' ? (
                                     <Tooltip title={res.justification || 'Needs human review'}>
                                       <Chip label="Review" size="small" color="warning" variant="outlined" />
                                     </Tooltip>
                                   ) : (
                                     <Tooltip title={`AI: ${res.justification || 'Resolved'}`}>
                                       <Chip label="AI" size="small" color="info" variant="outlined" />
                                     </Tooltip>
                                   )
                                 ) : (
                                   opts.length <= 1 ? (
                                     <Tooltip title="Identical across sources">
                                       <Chip label="Same" size="small" variant="outlined" />
                                     </Tooltip>
                                   ) : null
                                 )}
                                 {needsReview && (
                                   <Select
                                     size="small"
                                     value={overrideVal ?? ''}
                                     displayEmpty
                                     onChange={(e)=> setManualChoices(prev => ({
                                       ...prev,
                                       [gid]: { ...(prev[gid]||{}), [key]: String(e.target.value) }
                                     }))}
                                     sx={{ minWidth: 160 }}
                                   >
                                     <MenuItem value="" disabled>Pick value…</MenuItem>
                                     {opts.map((opt, i) => (
                                       <MenuItem key={i} value={opt.value}>{`${opt.value} — from #${opt.sourceId}${opt.sourceTag==='main' ? ' (main)' : ''}`}</MenuItem>
                                     ))}
                                   </Select>
                                 )}
                               </Box>
                             );
                           })}
                         </Stack>
                         {/* Summary / AI Notes (collapsed by default) */}
                         {(() => {
                           const reviewFields = (ai.conflicts_resolved || []).filter(c => c.chosen_value === 'NEEDS_HUMAN_REVIEW').map(c => c.field_name);
                           const hasError = (ai.processing_log || []).some((line:string) => /ERROR|PROCESS_HALTED/i.test(line));
                           const gidOpen = !!showLog[gid];
                           if (hasError) {
                             return (
                               <>
                                 <Box sx={{ mt: 2 }}>
                                   <Alert severity="error" sx={{ py: 0.5 }}
                                     action={<Button size="small" onClick={() => setShowLog(prev => ({...prev, [gid]: !gidOpen}))}>{gidOpen ? 'Hide details' : 'Show details'}</Button>}>
                                     AI encountered an error during analysis. Manual review recommended.
                                   </Alert>
                                 </Box>
                                 {gidOpen && (
                                   <>
                                     <Divider sx={{ my: 1 }} />
                                     <Typography variant="subtitle2" gutterBottom>AI Notes</Typography>
                                     <Stack spacing={0.5}>
                                       {(ai.processing_log || []).map((line, i) => (
                                         <Typography key={i} variant="caption" color="text.secondary">{line}</Typography>
                                       ))}
                                     </Stack>
                                   </>
                                 )}
                               </>
                             );
                           }
                           if (reviewFields.length > 0) {
                             return (
                               <Box sx={{ mt: 2 }}>
                                 <Alert severity="warning" sx={{ py: 0.5 }}
                                   action={<Button size="small" onClick={() => setShowLog(prev => ({...prev, [gid]: !gidOpen}))}>{gidOpen ? 'Hide details' : 'Show details'}</Button>}>
                                   Some fields require human review: {reviewFields.join(', ')}
                                 </Alert>
                                 {gidOpen && (
                                   <>
                                     <Divider sx={{ my: 1 }} />
                                     <Typography variant="subtitle2" gutterBottom>AI Notes</Typography>
                                     <Stack spacing={0.5}>
                                       {(ai.processing_log || []).map((line, i) => (
                                         <Typography key={i} variant="caption" color="text.secondary">{line}</Typography>
                                       ))}
                                     </Stack>
                                   </>
                                 )}
                               </Box>
                             );
                           }
                           // All good – everything auto-resolved; keep it minimal
                           return (
                             <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                               All conflicts auto‑resolved.
                             </Typography>
                           );
                         })()}
                       </>
                     )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleApprove}
          variant="contained"
          color="success"
          disabled={submitting || readyToMergeCount === 0}
        >
          {submitting ? 'Applying…' : `Approve ${readyToMergeCount} Merge${readyToMergeCount !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
