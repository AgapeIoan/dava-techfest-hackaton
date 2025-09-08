import Grid from '@mui/material/Grid'
import {
  Paper, Typography, Divider, List, ListItem, ListItemText,
  Table, TableHead, TableRow, TableCell, TableBody, Alert, Link as MLink
} from '@mui/material'

export default function SecurityPolicyPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={800}>Security & Privacy Policy</Typography>
      <Typography variant="body2" sx={{ opacity:.8, mb:2 }}>
        Aceasta este o prezentare pentru utilizatori despre cine are acces și cum se folosesc datele. Politicile
        tehnice de backend, SSO, criptare și retenție se aplică la nivel de infrastructură/serviciu (vezi și SECURITY.md).
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Aplicația procesează date sensibile (PII/PHI). Respectă principiul <b>least privilege</b> și folosește
        contul tău corporativ. Nu exporta datele în afara sistemelor aprobate.
      </Alert>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" fontWeight={800}>Roluri & Permisiuni</Typography>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell><b>Rol</b></TableCell>
            <TableCell><b>Descriere</b></TableCell>
            <TableCell><b>Permisiuni</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Viewer</TableCell>
            <TableCell>Poate vizualiza rezultate și detalii pacient.</TableCell>
            <TableCell>Search, View duplicates, fără aprobare merge.</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Approver</TableCell>
            <TableCell>Responsabil de decizii de unificare.</TableCell>
            <TableCell>Tot ce are Viewer + Approve Merge (audit obligatoriu).</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Auditor</TableCell>
            <TableCell>Supraveghere și conformitate.</TableCell>
            <TableCell>Vizualizează activitatea, exportă audit, fără editare/merge.</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Admin</TableCell>
            <TableCell>Administrare.</TableCell>
            <TableCell>Gestionare roluri, configurări, vizualizare completă.</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={800}>Autentificare & Acces</Typography>
          <List dense>
            <ListItem><ListItemText primary="SSO (OpenID Connect)" secondary="Autentificare corporativă, MFA." /></ListItem>
            <ListItem><ListItemText primary="Least privilege" secondary="Viewer implicit; Approver doar dedicat." /></ListItem>
            <ListItem><ListItemText primary="Condiții rețea" secondary="VPN/allowlist; fără rețele nesigure." /></ListItem>
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={800}>Protecția datelor (PII/PHI)</Typography>
          <List dense>
            <ListItem><ListItemText primary="Masca PII" secondary="SSN parțial, fără trackere externe." /></ListItem>
            <ListItem><ListItemText primary="Minimizare" secondary="Frontul nu persistă PII (doar memorie)." /></ListItem>
            <ListItem><ListItemText primary="Export controlat" secondary="Doar roluri aprobate; log & watermark." /></ListItem>
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={800}>Audit & Conformitate</Typography>
          <List dense>
            <ListItem><ListItemText primary="Audit complet" secondary="Cine/când/ce s-a schimbat; versiune model." /></ListItem>
            <ListItem><ListItemText primary="Undo / Rollback" secondary="Operațiuni reversibile; retenție conform politicii." /></ListItem>
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={800}>Recomandări tehnice</Typography>
          <List dense>
            <ListItem><ListItemText primary="TLS peste tot" secondary="HSTS; CSP strictă în producție." /></ListItem>
            <ListItem><ListItemText primary="API hardening" secondary="RBAC pe endpointuri; rate-limit; idempotency." /></ListItem>
            <ListItem><ListItemText primary="Model governance" secondary="Versiuni, explainability, drift monitor." /></ListItem>
          </List>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />
      <Typography variant="body2">
        Pentru incidente/întrebări vezi <MLink href="/SECURITY.md">SECURITY.md</MLink> și procedurile interne.
      </Typography>
    </Paper>
  )
}
