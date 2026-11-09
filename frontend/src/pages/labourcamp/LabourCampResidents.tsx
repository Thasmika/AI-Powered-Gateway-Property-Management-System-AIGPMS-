import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Grid, Tooltip, IconButton, Stack, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import FilterListIcon from '@mui/icons-material/FilterList';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

const statusColors: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  Active: 'success',
  Vacated: 'default',
  Transferred: 'warning',
  Blacklisted: 'error',
};

const LabourCampResidents: React.FC = () => {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log("AIGPMS Cache Bust - Label Fix applied!");

  // For register form dialog
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);

  const [form, setForm] = useState({
    full_name: '', id_type: 'Passport', id_number: '',
    nationality: '', contact_number: '',
    employer_company: '', job_title: '',
    unit_id: '', check_in_date: '',
    emirates_id_expiry: '', visa_expiry: '', passport_expiry: '',
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterEmployer, setFilterEmployer] = useState('');

  const fetchResidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 300 };
      if (filterStatus) params.status = filterStatus;
      if (filterEmployer) params.employer_company = filterEmployer;
      const res = await api.get('/labour-camp/residents', { params });
      setResidents(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/labour-camp/units', { params: { status: 'Available', limit: 200 } });
      setUnits(res.data);
    } catch {}
  };

  const [allUnits, setAllUnits] = useState<Record<string, string>>({});
  const fetchAllUnits = async () => {
    try {
      const res = await api.get('/labour-camp/units', { params: { limit: 1000 } });
      const map: Record<string, string> = {};
      res.data.forEach((u: any) => {
        map[u.unit_id] = u.unit_number;
      });
      setAllUnits(map);
    } catch {}
  };

  useEffect(() => { 
    fetchResidents(); 
    fetchAllUnits();
  }, [filterStatus, filterEmployer]);

  const handleSave = async () => {
    setFormError(null);
    if (!form.full_name || !form.id_number) {
      setFormError('Full Name and ID Number are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.unit_id) delete payload.unit_id;
      if (!payload.check_in_date) delete payload.check_in_date;
      if (!payload.emirates_id_expiry) delete payload.emirates_id_expiry;
      if (!payload.visa_expiry) delete payload.visa_expiry;
      if (!payload.passport_expiry) delete payload.passport_expiry;
      await api.post('/labour-camp/residents', payload);
      setShowForm(false);
      setForm({
        full_name: '', id_type: 'Passport', id_number: '',
        nationality: '', contact_number: '',
        employer_company: '', job_title: '',
        unit_id: '', check_in_date: '',
        emirates_id_expiry: '', visa_expiry: '', passport_expiry: '',
      });
      fetchResidents();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to register resident');
    } finally {
      setSaving(false);
    }
  };

  // Expiry alert: within 30 days or already expired
  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };



  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32 }} />
            Labour Camp Residents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Worker / resident records with contract and document expiry tracking
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="Labour Camp Residents" />
          <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { fetchUnits(); setShowForm(true); }}
        >
          Register Resident
        </Button>
        </Box>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">Filters</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select fullWidth size="small" label="Status"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {['Active', 'Vacated', 'Transferred', 'Blacklisted'].map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small" label="Employer / Company"
              value={filterEmployer} onChange={e => setFilterEmployer(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth variant="outlined" size="small"
              onClick={() => { setFilterStatus('Active'); setFilterEmployer(''); }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Registration Form (inline panel) */}
      {showForm && (
        <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'primary.light' }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
            Register New Resident
          </Typography>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth required label="Full Name" size="small"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth label="ID Type" size="small"
                value={form.id_type} onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}>
                {['Passport', 'Emirates ID', 'Labour Card'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth required label="ID Number" size="small"
                value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Nationality" size="small"
                value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Contact Number" size="small"
                value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Employer Company" size="small"
                value={form.employer_company} onChange={e => setForm(f => ({ ...f, employer_company: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth label="Job Title" size="small"
                value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth label="Assign Unit" size="small"
                value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                <MenuItem value="">No Unit</MenuItem>
                {units.map(u => <MenuItem key={u.unit_id} value={u.unit_id}>{u.unit_number} ({u.total_capacity - u.current_occupancy} free)</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Check-In Date</Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  inputProps={{ style: { colorScheme: 'dark' } }}
                  value={form.check_in_date}
                  onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Emirates ID Expiry</Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  inputProps={{ style: { colorScheme: 'dark' } }}
                  value={form.emirates_id_expiry}
                  onChange={e => setForm(f => ({ ...f, emirates_id_expiry: e.target.value }))}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Visa Expiry</Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  inputProps={{ style: { colorScheme: 'dark' } }}
                  value={form.visa_expiry}
                  onChange={e => setForm(f => ({ ...f, visa_expiry: e.target.value }))}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Passport Expiry</Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  inputProps={{ style: { colorScheme: 'dark' } }}
                  value={form.passport_expiry}
                  onChange={e => setForm(f => ({ ...f, passport_expiry: e.target.value }))}
                />
              </Stack>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} mt={2} justifyContent="flex-end">
            <Button onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="contained" onClick={handleSave} disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {saving ? 'Saving…' : 'Register'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Residents Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  {[
                    'Name', 'ID Type / Number', 'Nationality', 'Employer / Company',
                    'Unit', 'Check-In Date', 'Visa Expiry', 'Emirates ID Expiry', 'Status'
                  ].map(h => (
                    <TableCell key={h} sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {residents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No residents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  residents.map(r => (
                    <TableRow key={r.resident_id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                            {r.full_name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{r.full_name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.id_number ? r.id_number.replace('IMPORT-', '') : '—'}</Typography>
                      </TableCell>
                      <TableCell>{r.nationality || '—'}</TableCell>
                      <TableCell>{r.employer_company || '—'}</TableCell>
                      <TableCell>{r.unit_id ? (allUnits[r.unit_id] || (r.unit_id.slice(0, 8) + '…')) : '—'}</TableCell>
                      <TableCell>{formatDate(r.check_in_date)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {isExpiringSoon(r.visa_expiry) && (
                            <Tooltip title="Expiring soon!">
                              <WarningAmberIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                          <Typography variant="body2">{formatDate(r.visa_expiry)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {isExpiringSoon(r.emirates_id_expiry) && (
                            <Tooltip title="Expiring soon!">
                              <WarningAmberIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                          <Typography variant="body2">{formatDate(r.emirates_id_expiry)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          color={statusColors[r.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {residents.length} resident(s) shown
      </Typography>
    </Box>
  );
};

export default LabourCampResidents;
