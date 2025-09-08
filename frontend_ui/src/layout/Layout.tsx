import { PropsWithChildren, useMemo, useEffect, useState, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Slider,
  Chip,
  Stack,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Button,
  IconButton,
  Avatar,
  Menu,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MergeIcon from '@mui/icons-material/CompareArrows';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Link, useLocation , useNavigate } from 'react-router-dom';
import useDupeStore from '../store/dupeStore';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const drawerWidth = 280;

// A helper custom hook to get the previous value of a state or prop
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default function Layout({ children }: PropsWithChildren) {
  const loc = useLocation();
  const navigate = useNavigate(); // Get the navigate function
  const {
    loading,
    selected,
    threshold,
    setThreshold,
    role,
    setRole,
    activity,
    toast,
    clearToast,
    undoLastMerge,
    lastSnapshot,
    roleSource, /*loadRoleFromServer,*/
    isAuthenticated,
    userName,
    loginWithEmail,
    logout,
  } = useDupeStore();

  // Track the previous authentication state
  const prevIsAuthenticated = usePrevious(isAuthenticated);

  // 👇 3. Add the redirect logic using a useEffect hook
  useEffect(() => {
    // This effect runs whenever the authentication status changes.
    // The condition checks if the user JUST logged in (i.e., they were not authenticated before, but are now)
    // AND if their role is 'admin'.
    if (!prevIsAuthenticated && isAuthenticated && role === 'admin') {
      navigate('/admin', { replace: true }); // Redirect to the admin page
    }
  }, [isAuthenticated, prevIsAuthenticated, role, navigate]);

  // dacă vei folosi /api/me pe viitor, poți activa asta:
  // useEffect(() => { loadRoleFromServer() }, [loadRoleFromServer])

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  // meniu profile
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  // login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="default" elevation={0}>
        <Toolbar sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>
            Duplicate Profile Detector
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* ---- Buton Login / Avatar (dreapta sus) ---- */}
          {!isAuthenticated ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonIcon />}
              onClick={openMenu}
              sx={{ borderRadius: 999 }}
            >
              Login
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={openMenu}
              sx={{ borderRadius: 999, display: 'flex', alignItems: 'center', gap: 1 }}
              startIcon={
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
              }
              endIcon={<ArrowDropDownIcon />}
            >
              {userName ?? 'Signed in'}
            </Button>
          )}

          <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
            {!isAuthenticated ? (
              <Box sx={{ minWidth: 260, p: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={() => { loginWithEmail(email, password); closeMenu(); }}
                    fullWidth
                  >
                    Login
                  </Button>
                </Stack>
              </Box>
            ) : (
              <List dense sx={{ minWidth: 240, p: 1 }}>
                <ListItemButton disabled>
                  <ListItemIcon><PersonIcon /></ListItemIcon>
                  <ListItemText primary={userName} secondary="Signed in" />
                </ListItemButton>
                <Divider />
                <ListItemButton onClick={() => { logout(); closeMenu(); }}>
                  <ListItemIcon><HistoryIcon /></ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </List>
            )}
          </Menu>
        </Toolbar>

        {loading && <LinearProgress color="primary" />}
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: '#0E1B22',
            color: 'white',
          },
        }}
      >

        <Toolbar />
        <Box sx={{ p: 2 }}>
          {/* --- Public Links --- */}
          <List dense>
            <ListItemButton
              component={Link}
              to="/duplicates"
              selected={loc.pathname.startsWith('/duplicates')}
            >
              <ListItemIcon>
                <SearchIcon htmlColor="#FF6A13" />
              </ListItemIcon>
              <ListItemText primary="Find Duplicates" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              to="/security"
              selected={loc.pathname.startsWith('/security')}
            >
              <ListItemIcon>
                <SecurityIcon htmlColor="#FF6A13" />
              </ListItemIcon>
              <ListItemText primary="Security & Privacy" />
            </ListItemButton>

            {/* --- Admin-Only Links --- */}
            {role === 'admin' && (
              <>
                <ListItemButton
                  component={Link}
                  to="/merge"
                  selected={loc.pathname.startsWith('/merge')}
                >
                  <ListItemIcon>
                    <MergeIcon htmlColor="#FF6A13" />
                  </ListItemIcon>
                  <ListItemText primary="Merge View" />
                  {selectedCount > 0 && (
                    <Chip
                      label={selectedCount}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItemButton>
              </>
            )}
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TuneIcon fontSize="small" />
              <Typography variant="subtitle2">Match Threshold</Typography>
            </Stack>
            <Slider
              value={threshold}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              onChange={(_, v) => setThreshold(v as number)}
              sx={{ color: '#FF6A13' }}
            />
          </Stack>

          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              disabled={roleSource === 'server'} // read-only dacă vine din “login”
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="receptionist">Receptionner</MenuItem> {/* nou */}
              <MenuItem value="approver">Approver</MenuItem>
              <MenuItem value="auditor">Auditor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

          {lastSnapshot && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              sx={{ mt: 2 }}
              onClick={undoLastMerge}
            >
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
  );
}
