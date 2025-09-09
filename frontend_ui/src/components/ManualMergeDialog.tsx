import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
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
  { key: 'phone', label: 'Phone' },
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
            {personalFields.map(({ key, label }) => (
              <Grid item xs={12} md={4} key={key}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={[
                    group.mainProfile[key as keyof typeof group.mainProfile],
                    ...group.duplicates.map(dup => dup[key as keyof typeof dup])
                  ].filter((v, i, arr) => v && arr.indexOf(v) === i)}
                  value={selections[key] || ''}
                  onInputChange={(_, newInputValue) => onFieldChange(key, newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={label}
                      variant="outlined"
                      inputProps={{
                        ...params.inputProps,
                        style: { minWidth: 180, maxWidth: 400 },
                        maxLength: 100,
                      }}
                      sx={{ minWidth: 180, maxWidth: 400 }}
                    />
                  )}
                />
              </Grid>
            ))}
          </Grid>
          <Typography
            variant="subtitle1"
            sx={{ mt: 4, mb: 1, fontWeight: 'bold' }}
          >
            Address
          </Typography>
          <Grid container spacing={2}>
            {addressFields.map(({ key, label }) => (
              <Grid item xs={12} md={4} key={key}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={[
                    group.mainProfile[key as keyof typeof group.mainProfile],
                    ...group.duplicates.map(dup => dup[key as keyof typeof dup])
                  ].filter((v, i, arr) => v && arr.indexOf(v) === i)}
                  value={selections[key] || ''}
                  onInputChange={(_, newInputValue) => onFieldChange(key, newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={label}
                      variant="outlined"
                      inputProps={{
                        ...params.inputProps,
                        style: { minWidth: 180, maxWidth: 400 },
                        maxLength: 100,
                      }}
                      sx={{ minWidth: 180, maxWidth: 400 }}
                    />
                  )}
                />
              </Grid>
            ))}
          </Grid>
          <Typography
            variant="subtitle1"
            sx={{ mt: 4, mb: 1, fontWeight: 'bold' }}
          >
            Contact
          </Typography>
          <Grid container spacing={2}>
            {contactFields.map(({ key, label }) => (
              <Grid item xs={12} md={6} key={key}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={[
                    group.mainProfile[key as keyof typeof group.mainProfile],
                    ...group.duplicates.map(dup => dup[key as keyof typeof dup])
                  ].filter((v, i, arr) => v && arr.indexOf(v) === i)}
                  value={selections[key] || ''}
                  onInputChange={(_, newInputValue) => onFieldChange(key, newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={label}
                      variant="outlined"
                      inputProps={{
                        ...params.inputProps,
                        style: { minWidth: 180, maxWidth: 400 },
                        maxLength: 100,
                      }}
                      sx={{ minWidth: 180, maxWidth: 400 }}
                    />
                  )}
                />
              </Grid>
            ))}
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
