import { createTheme } from '@mui/material/styles'

export default createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#FF6A13' },   // Endava orange
    secondary: { main: '#18465A' },   // deep teal/navy
    background: { default: '#F4F6F8', paper: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#F59E0B' },
    info:    { main: '#1976D2' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontWeightBold: 800,
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
  },
  components: {
    MuiAppBar: { styleOverrides: { colorDefault: { background: 'linear-gradient(90deg,#0E1B22 0%,#18465A 100%)' } } },
    MuiTableHead: { styleOverrides: { root: { background: '#EFF3F6' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
    MuiPaper:  { styleOverrides: { root: { borderRadius: 16 } } },
    MuiCard:   { styleOverrides: { root: { borderRadius: 16 } } },
  },
})
