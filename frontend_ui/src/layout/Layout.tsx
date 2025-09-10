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
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link, useLocation , useNavigate } from 'react-router-dom';
import useDupeStore from '../store/dupeStore';
import useAdminStore from '../store/adminStore';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const drawerWidth = 280;

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });
  return ref.current;
}

export default function Layout({ children }: PropsWithChildren) {
  const loc = useLocation();
  const navigate = useNavigate();
  const {
      isAuthenticated,
      userName,
      role,
      toast,
      clearToast,
      loginWithBackend,
      logout,
      selected,
      loading,
      threshold,
      roleSource,
      lastSnapshot,
      selectedRunId
  } = useDupeStore();
  const { runHistory } = useAdminStore();

  // Redirect after login: admin -> /admin, receptionist -> /duplicates
  useEffect(() => {
  if (isAuthenticated) {
      if (role === 'admin' && loc.pathname !== '/admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'receptionist' && loc.pathname !== '/duplicates') {
        navigate('/duplicates', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate, loc.pathname]);

  // Redirect unauthenticated users to login page if not already there
  useEffect(() => {
    if (!isAuthenticated && loc.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loc.pathname, navigate]);

  const selectedCount = useMemo(() => Object.values(selected ?? {}).filter(Boolean).length, [selected]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);



  // --- 1. LOGIN SCREEN ---
  if (!isAuthenticated) {
    const bgReceptionist = 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 50%, #f093fb 100%, #f5576c 120%)';
    const bgDefault = 'url(/medical-bg.svg)';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        background: role === 'receptionist' ? bgReceptionist : bgDefault,
        backgroundSize: 'cover', backgroundPosition: 'center', bgcolor: '#f5f7fa' }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={700} color="primary.main" gutterBottom sx={{ fontFamily: 'Playfair Display, serif', letterSpacing: 1 }}>
            Duplicate Profile Detector
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            A platform for fast identification and management of duplicate profiles in the medical system.
          </Typography>
        </Box>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); loginWithBackend(email.trim(), password.trim()); }}
            sx={{ minWidth: 320, p: 4, bgcolor: 'white', borderRadius: 3, boxShadow: 3 }}>
          <Stack spacing={2}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
            <TextField label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} fullWidth size="small"
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                ),
              }}
            />
            <Button variant="contained" type="submit" fullWidth>Login</Button>
          </Stack>
        </Box>
        <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
      </Box>
    );
  }

  // --- JOB STATUS INDICATOR ---
  const JobStatusIndicator = () => {
    const latestRun = runHistory[0];
    if (!latestRun || role !== 'admin' || latestRun.status === 'idle') return null;
    if (latestRun.status === 'running') {
      return (
        <Box sx={{ width: 220, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fffbe6', borderRadius: 2, px: 2, py: 0.5, boxShadow: 2 }}>
          <SyncIcon className="spin-icon" sx={{ color: '#d32f2f', fontSize: 22 }} />
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={latestRun.progress} sx={{ height: 8, borderRadius: 4, bgcolor: '#ffe0e0', '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f' } }} />
          </Box>
          <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 700 }}>{`${latestRun.progress}%`}</Typography>
        </Box>
      );
    }
    if (latestRun.status === 'completed') {
      return <Chip icon={<CheckCircleIcon sx={{ color: '#388e3c' }} />} label={`Completed: ${new Date(latestRun.completedAt!).toLocaleTimeString()}`} sx={{ bgcolor: '#e8f5e9', color: '#388e3c', fontWeight: 700, border: '1px solid #388e3c' }} variant="outlined" size="small" />;
    }
    return null;
  };


  // Common AppBar for all authenticated users
  const AppHeader = (
    <AppBar position="fixed" color="default" elevation={0} sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10}}>
      <Toolbar sx={{ display: 'flex', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', fontFamily: 'Playfair Display, serif', letterSpacing: 1 }}>
          Duplicate Profile Detector
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {/* Job Status Indicator for admin only */}
        {role === 'admin' && <JobStatusIndicator />}
        <Button
          variant="contained" color="primary" onClick={openMenu}
          sx={{ borderRadius: 999, display: 'flex', alignItems: 'center', gap: 1 }}
          startIcon={<Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(255,255,255,0.2)' }}><PersonIcon fontSize="small" /></Avatar>}
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
  );

  // --- 2. RECEPTIONIST LAYOUT ---
  if (role === 'receptionist') {
    const bgReceptionist = 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 50%, #f093fb 100%, #f5576c 120%)';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: bgReceptionist, backgroundSize: 'cover' }}>
        {AppHeader}
        <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
          <Toolbar />
          <Box sx={{ width: '100%', maxWidth: 800, mt: 4 }}>
            {children}
          </Box>
        </Box>
        <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
      </Box>
    );
  }

  // --- 3. ADMIN & OTHER ROLES LAYOUT ---
  // For everyone else, render the full dashboard with the sidebar.
  // I have removed the background image and set a clean, light gray background color instead.
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {AppHeader}
        {/*
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth, boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #1e293b 0%, #3b4252 100%)', color: 'white',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <List dense>
            <ListItemButton component={Link} to="/duplicates" selected={loc.pathname.startsWith('/duplicates')}>
              <ListItemIcon><SearchIcon htmlColor="#FF6A13" /></ListItemIcon>
              <ListItemText primary="Find Duplicates" />
            </ListItemButton>
            <ListItemButton component={Link} to="/security" selected={loc.pathname.startsWith('/security')}>
              <ListItemIcon><SecurityIcon htmlColor="#FF6A13" /></ListItemIcon>
              <ListItemText primary="Security & Privacy" />
            </ListItemButton>
            {role === 'admin' && (
              <>
                <ListItemButton component={Link} to="/admin" selected={loc.pathname.startsWith('/admin')}>
                  <ListItemIcon><AdminPanelSettingsIcon htmlColor="#FF6A13" /></ListItemIcon>
                  <ListItemText primary="Admin Dashboard" />
                </ListItemButton>
                <ListItemButton component={Link} to="/merge" selected={loc.pathname.startsWith('/merge')}>
                  <ListItemIcon><MergeIcon htmlColor="#FF6A13" /></ListItemIcon>
                  <ListItemText primary="Merge View" />
                  {selectedCount > 0 && <Chip label={selectedCount} color="primary" size="small" sx={{ ml: 1 }} />}
                </ListItemButton>
              </>
            )}
          </List>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}><TuneIcon fontSize="small" /><Typography variant="subtitle2">Match Threshold</Typography></Stack>
            <Slider value={threshold} min={0} max={100} step={5} valueLabelDisplay="auto" onChange={(_, v) => setThreshold(v as number)} sx={{ color: '#FF6A13' }} />
          </Stack>
          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" label="Role" value={role} onChange={(e) => setRole(e.target.value as any)} disabled={roleSource === 'server'}>
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="receptionist">Receptionist</MenuItem>
              <MenuItem value="approver">Approver</MenuItem>
              <MenuItem value="auditor">Auditor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
          {lastSnapshot && <Button variant="outlined" color="inherit" size="small" sx={{ mt: 2 }} onClick={undoLastMerge}>Undo last merge</Button>}
        </Box>
      </Drawer>
        */}

      <Box component="main" sx={{ flexGrow: 1, p: 3  }}>
        <Toolbar />
        {children}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={clearToast} />
    </Box>
  );
}
