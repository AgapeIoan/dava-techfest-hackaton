import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import type { DuplicateGroupData } from '../pages/Admin';

const personalFields = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'ssn', label: 'SSN' },
];
const addressFields = [
  { key: 'address', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'county', label: 'County' },
];
const contactFields = [
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'email', label: 'Email' },
];

interface ManualMergeDialogProps {
  open: boolean;
  group: DuplicateGroupData | null;
  selections: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  onApprove: () => void;
  onClose: () => void;
}

export default function ManualMergeDialog({
  open,
  group,
  selections,
  onFieldChange,
  onApprove,
  onClose,
}: ManualMergeDialogProps) {
  if (!group) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Merge Patient Profiles</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Select the correct value for each field to create the master profile. The
          selected profiles will be merged into this new record.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          For each field you can select which information comes from the keeper or
          duplicate profile. Keeper profile data is selected by default.
        </Typography>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}
          >
            Personal information
          </Typography>
          <Grid container spacing={2}>
            {personalFields.map(({ key, label }) => {
              // Gather all values for this field from mainProfile and duplicates
              const values = [
                group.mainProfile[key as keyof typeof group.mainProfile],
                ...group.duplicates.map(dup => dup[key as keyof typeof dup])
              ];
              const uniqueValues = Array.from(new Set(values));
              const onlyOne = uniqueValues.length === 1;
              return (
                <Grid item xs={12} md={4} key={key}>
                  {onlyOne ? (
                    <FormControl fullWidth size="small" disabled>
                      <InputLabel>{label}</InputLabel>
                      <Select value={uniqueValues[0]} label={label} disabled renderValue={() => (
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{uniqueValues[0]}</span>
                          <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                        </span>
                      )}>
                        <MenuItem value={uniqueValues[0]}>{uniqueValues[0]} <em>Keeper</em></MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>{label}</InputLabel>
                      <Select
                        value={selections[key] || ''}
                        label={label}
                        onChange={e => onFieldChange(key, e.target.value)}
                        renderValue={selected => {
                          if (selected === group.mainProfile[key as keyof typeof group.mainProfile]) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                              </span>
                            );
                          }
                          const dupIdx = group.duplicates.findIndex(dup => dup[key as keyof typeof dup] === selected);
                          if (dupIdx !== -1) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            );
                          }
                          return selected;
                        }}
                      >
                        <MenuItem value={group.mainProfile[key as keyof typeof group.mainProfile]}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{group.mainProfile[key as keyof typeof group.mainProfile]}</span>
                            <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                          </span>
                        </MenuItem>
                        {uniqueValues
                          .filter(v => v !== group.mainProfile[key as keyof typeof group.mainProfile])
                          .map((v, idx) => (
                            <MenuItem value={v} key={idx}>
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span>{v}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
              );
            })}
          </Grid>
          <Typography
            variant="subtitle1"
            sx={{ mt: 4, mb: 1, fontWeight: 'bold' }}
          >
            Address
          </Typography>
          <Grid container spacing={2}>
            {addressFields.map(({ key, label }) => {
              const values = [
                group.mainProfile[key as keyof typeof group.mainProfile],
                ...group.duplicates.map(dup => dup[key as keyof typeof dup])
              ];
              const uniqueValues = Array.from(new Set(values));
              const onlyOne = uniqueValues.length === 1;
              return (
                <Grid item xs={12} md={4} key={key}>
                  {onlyOne ? (
                    <FormControl fullWidth size="small" disabled>
                      <InputLabel>{label}</InputLabel>
                      <Select value={uniqueValues[0]} label={label} disabled renderValue={() => (
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{uniqueValues[0]}</span>
                          <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                        </span>
                      )}>
                        <MenuItem value={uniqueValues[0]}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{uniqueValues[0]}</span>
                            <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                          </span>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>{label}</InputLabel>
                      <Select
                        value={selections[key] || ''}
                        label={label}
                        onChange={e => onFieldChange(key, e.target.value)}
                        renderValue={selected => {
                          if (selected === group.mainProfile[key as keyof typeof group.mainProfile]) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                              </span>
                            );
                          }
                          const dupIdx = group.duplicates.findIndex(dup => dup[key as keyof typeof dup] === selected);
                          if (dupIdx !== -1) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            );
                          }
                          return selected;
                        }}
                      >
                        <MenuItem value={group.mainProfile[key as keyof typeof group.mainProfile]}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{group.mainProfile[key as keyof typeof group.mainProfile]}</span>
                            <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                          </span>
                        </MenuItem>
                        {uniqueValues
                          .filter(v => v !== group.mainProfile[key as keyof typeof group.mainProfile])
                          .map((v, idx) => (
                            <MenuItem value={v} key={idx}>
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span>{v}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
              );
            })}
          </Grid>
          <Typography
            variant="subtitle1"
            sx={{ mt: 4, mb: 1, fontWeight: 'bold' }}
          >
            Contact
          </Typography>
          <Grid container spacing={2}>
            {contactFields.map(({ key, label }) => {
              const values = [
                group.mainProfile[key as keyof typeof group.mainProfile],
                ...group.duplicates.map(dup => dup[key as keyof typeof dup])
              ];
              const uniqueValues = Array.from(new Set(values));
              const onlyOne = uniqueValues.length === 1;
              return (
                <Grid item xs={12} md={6} key={key}>
                  {onlyOne ? (
                    <FormControl fullWidth size="small" disabled>
                      <InputLabel>{label}</InputLabel>
                      <Select value={uniqueValues[0]} label={label} disabled renderValue={() => (
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{uniqueValues[0]}</span>
                          <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                        </span>
                      )}>
                        <MenuItem value={uniqueValues[0]}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{uniqueValues[0]}</span>
                            <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                          </span>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>{label}</InputLabel>
                      <Select
                        value={selections[key] || ''}
                        label={label}
                        onChange={e => onFieldChange(key, e.target.value)}
                        renderValue={selected => {
                          if (selected === group.mainProfile[key as keyof typeof group.mainProfile]) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                              </span>
                            );
                          }
                          const dupIdx = group.duplicates.findIndex(dup => dup[key as keyof typeof dup] === selected);
                          if (dupIdx !== -1) {
                            return (
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{selected}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            );
                          }
                          return selected;
                        }}
                      >
                        <MenuItem value={group.mainProfile[key as keyof typeof group.mainProfile]}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>{group.mainProfile[key as keyof typeof group.mainProfile]}</span>
                            <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Keeper</span>
                          </span>
                        </MenuItem>
                        {uniqueValues
                          .filter(v => v !== group.mainProfile[key as keyof typeof group.mainProfile])
                          .map((v, idx) => (
                            <MenuItem value={v} key={idx}>
                              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span>{v}</span>
                                <span style={{ fontSize: '0.8em', marginLeft: 8, color: '#888', flex: 1, textAlign: 'right' }}>Duplicate</span>
                              </span>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onApprove}
          variant="contained"
          color="success"
        >
          Approve Merge
        </Button>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
