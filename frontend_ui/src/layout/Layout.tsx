import { PropsWithChildren, useMemo } from 'react'
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, Divider, Slider, Chip, Stack, LinearProgress,
  Select, MenuItem, FormControl, InputLabel, Snackbar, Button
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import MergeIcon from '@mui/icons-material/CompareArrows'
import TuneIcon from '@mui/icons-material/Tune'
import HistoryIcon from '@mui/icons-material/History'
import SecurityIcon from '@mui/icons-material/Security'        // ⬅️ nou
import { Link, useLocation } from 'react-router-dom'
import useDupeStore from '../store/dupeStore'

const drawerWidth = 280

export default function Layout({ children }: PropsWithChildren) {
  const loc = useLocation()
  const {
    loading, selected, threshold, setThreshold, role, setRole,
    activity, toast, clearToast, undoLastMerge, lastSnapshot
  } = useDupeStore()

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>
            Duplicate Profile Detector
          </Typography>
        </Toolbar>
        {loading && <LinearProgress color="primary" />}
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth, flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', background: '#0E1B22', color: 'white' },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <List dense>
            <ListItemButton component={Link} to="/duplicates" selected={loc.pathname.startsWith('/duplicates')}>
              <ListItemIcon><SearchIcon htmlColor="#FF6A13" /></ListItemIcon>
              <ListItemText primary="Find Duplicates" />
            </ListItemButton>
            <ListItemButton component={Link} to="/merge" selected={loc.pathname.startsWith('/merge')}>
              <ListItemIcon><MergeIcon htmlColor="#FF6A13" /></ListItemIcon>
              <ListItemText primary="Merge View" />
              {selectedCount > 0 && <Chip label={selectedCount} color="primary" size="small" sx={{ ml: 1 }} />}
            </ListItemButton>
            <ListItemButton component={Link} to="/security" selected={loc.pathname.startsWith('/security')}> {/* ⬅️ nou */}
              <ListItemIcon><SecurityIcon htmlColor="#FF6A13" /></ListItemIcon>
              <ListItemText primary="Security & Privacy" />
            </ListItemButton>
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TuneIcon fontSize="small" />
              <Typography variant="subtitle2">Match Threshold</Typography>
            </Stack>
            <Slider value={threshold} min={0} max={100} step={5} valueLabelDisplay="auto"
              onChange={(_, v) => setThreshold(v as number)} sx={{ color: '#FF6A13' }} />
          </Stack>

          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" label="Role" value={role} onChange={(e)=>setRole(e.target.value as any)}>
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="approver">Approver</MenuItem>
              <MenuItem value="auditor">Auditor</MenuItem>   {/* ⬅️ nou */}
              <MenuItem value="admin">Admin</MenuItem>       {/* ⬅️ nou */}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <HistoryIcon fontSize="small" />
            <Typography variant="subtitle2">Recent Activity</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {activity.length === 0 && <Typography variant="caption" sx={{ opacity: .7 }}>No merges yet.</Typography>}
            {activity.slice(0,5).map(a => (
              <Box key={a.id} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)' }}>
                <Typography variant="caption"><b>{a.mergedIds.length}</b> ⇢ <b>{a.keeperId}</b></Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: .8 }}>
                  {new Date(Number(a.id)).toLocaleTimeString()}
                </Typography>
              </Box>
            ))}
          </Box>

          {lastSnapshot && (
            <Button variant="outlined" color="inherit" size="small" sx={{ mt: 2 }} onClick={undoLastMerge}>
              Undo last merge
            </Button>
          )}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px` }}>
        <Toolbar />
        {children}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
    </Box>
  )
}
