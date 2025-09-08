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
import PersonIcon from '@mui/icons-material/Person'; // ⬅️ icon persoană
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'; // ⬅️ pentru meniu
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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

  // Clear login fields on logout or on mount if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setEmail('');
      setPassword('');
    }
  }, [isAuthenticated]);
  const [showPassword, setShowPassword] = useState(false);

  if (!isAuthenticated) {
    // Receptionist: professional, elegant background
  const bgReceptionist = 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 50%, #f093fb 100%, #f5576c 120%)';
    const bgDefault = 'url(/medical-bg.svg)';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        background: role === 'receptionist' ? bgReceptionist : bgDefault,
        backgroundSize: 'cover', backgroundPosition: 'center', bgcolor: '#f5f7fa' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            fontWeight={700}
            color="primary.main"
            gutterBottom
            sx={{ fontFamily: 'Playfair Display, serif', letterSpacing: 1 }}
          >
            Duplicate Profile Detector
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            A platform for fast identification and management of duplicate profiles in the medical system.
          </Typography>
        </Box>
        <Box sx={{ minWidth: 320, p: 4, bgcolor: 'white', borderRadius: 3, boxShadow: 3 }}>
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={() => loginWithEmail(email, password)}
              fullWidth
            >
              Login
            </Button>
          </Stack>
        </Box>
        <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
      </Box>
    );
  }

  // Receptionist: professional, elegant background
  const bgReceptionist = 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 50%, #f093fb 100%, #f5576c 120%)';
  const bgDefault = 'url(/medical-bg-vivid.svg)';
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: role === 'receptionist' ? bgReceptionist : bgDefault, backgroundSize: 'cover', backgroundPosition: 'center', bgcolor: '#f5f7fa' }}>
      <AppBar position="fixed" color="default" elevation={0}>
        <Toolbar sx={{ display: 'flex', gap: 2 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: 'white', fontFamily: 'Playfair Display, serif', letterSpacing: 1 }}
          >
            Duplicate Profile Detector
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
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
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
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
          </Menu>
        </Toolbar>
        {loading && <LinearProgress color="primary" />}
      </AppBar>

      {(role !== 'receptionist') && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, #1e293b 0%, #3b4252 100%)',
              color: 'white',
            },
          }}
        >
          <Toolbar />
          <Box sx={{ p: 2 }}>
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
                disabled={roleSource === 'server'}
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="receptionist">Receptionner</MenuItem>
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
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', width: '100%' }}>
        <Toolbar />
        <Box sx={{ width: '100%', maxWidth: 600, mt: 4 }}>
          {children}
        </Box>
      </Box>
      <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
    </Box>
  );
}
