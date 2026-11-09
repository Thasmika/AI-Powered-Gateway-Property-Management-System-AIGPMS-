import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Grid, Stack, Card, CardContent, Divider,
  Tab, Tabs, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SaveIcon from '@mui/icons-material/Save';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box pt={2}>{children}</Box>}</div>
);

const LabourCampUtilities: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [readings, setReadings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [filterUnit, setFilterUnit] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBilled, setFilterBilled] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // New reading form
  const [form, setForm] = useState({
    unit_id: '',
    utility_type: 'Electricity',
    meter_number: '',
    reading_date: new Date().toISOString().split('T')[0],
    previous_reading: '',
    current_reading: '',
    rate_per_unit: '',
    billing_period_from: '',
    billing_period_to: '',
    notes: '',
  });

  const consumptionPreview = form.previous_reading && form.current_reading
    ? Math.max(0, parseFloat(form.current_reading) - parseFloat(form.previous_reading))
    : null;
  const billedPreview = consumptionPreview !== null && form.rate_per_unit
    ? consumptionPreview * parseFloat(form.rate_per_unit)
    : null;

  const fetchReadings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (filterUnit) params.unit_id = filterUnit;
      if (filterType) params.utility_type = filterType;
      if (filterBilled !== '') params.is_billed = filterBilled === 'true';
      if (filterFrom) params.from_date = filterFrom;
      if (filterTo) params.to_date = filterTo;
      const res = await api.get('/labour-camp/utility-readings', { params });
      setReadings(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load utility readings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/labour-camp/units', { params: { limit: 200, is_active: true } });
      setUnits(res.data);
    } catch {}
  };

  useEffect(() => { fetchUnits(); }, []);
  useEffect(() => { fetchReadings(); }, [filterUnit, filterType, filterBilled, filterFrom, filterTo]);

  const handleSubmit = async () => {
    setFormError(null);
    setSuccess(null);
    if (!form.unit_id || !form.reading_date || !form.current_reading) {
      setFormError('Unit, Reading Date, and Current Reading are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        unit_id: form.unit_id,
        utility_type: form.utility_type,
        reading_date: form.reading_date,
        current_reading: parseFloat(form.current_reading),
      };
      if (form.meter_number) payload.meter_number = form.meter_number;
      if (form.previous_reading) payload.previous_reading = parseFloat(form.previous_reading);
      if (form.rate_per_unit) payload.rate_per_unit = parseFloat(form.rate_per_unit);
      if (form.billing_period_from) payload.billing_period_from = form.billing_period_from;
      if (form.billing_period_to) payload.billing_period_to = form.billing_period_to;
      if (form.notes) payload.notes = form.notes;

      await api.post('/labour-camp/utility-readings', payload);
      setSuccess('Utility reading recorded successfully.');
      setForm(f => ({ ...f, previous_reading: form.current_reading, current_reading: '' }));
      fetchReadings();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to record reading');
    } finally {
      setSaving(false);
    }
  };

  // Summary stats
  const totalBilled = readings
    .filter(r => r.billed_amount)
    .reduce((sum, r) => sum + Number(r.billed_amount), 0);
  const unbilledCount = readings.filter(r => !r.is_billed).length;
  const electricityReadings = readings.filter(r => r.utility_type === 'Electricity').length;
  const waterReadings = readings.filter(r => r.utility_type === 'Water').length;

  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            <ElectricBoltIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32 }} />
            Utility Meter Readings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record and track electricity, water, and gas usage for labour camp units
          </Typography>
        </Box>
        <PdfExportButton title="Utility Meter Readings" />
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Billed Amount', value: `AED ${totalBilled.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`, color: '#10b981' },
          { label: 'Unbilled Readings', value: unbilledCount, color: '#f59e0b' },
          { label: 'Electricity Readings', value: electricityReadings, color: '#f59e0b' },
          { label: 'Water Readings', value: waterReadings, color: '#3b82f6' },
        ].map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ borderLeft: `4px solid ${kpi.color}` }}>
              <CardContent>
                <Typography variant="h5" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 0 }}>
        <Tab label="Record New Reading" />
        <Tab label="Reading History" />
      </Tabs>

      {/* Tab 0 — Enter Reading */}
      <TabPanel value={tab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
            New Meter Reading
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select fullWidth required label="Unit" size="small"
                value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
              >
                <MenuItem value="">— Select Unit —</MenuItem>
                {units.map(u => (
                  <MenuItem key={u.unit_id} value={u.unit_id}>
                    {u.unit_number} ({u.unit_type})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select fullWidth required label="Utility Type" size="small"
                value={form.utility_type} onChange={e => setForm(f => ({ ...f, utility_type: e.target.value }))}
              >
                {['Electricity', 'Water', 'Gas'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Meter Number" size="small"
                value={form.meter_number} onChange={e => setForm(f => ({ ...f, meter_number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth required label="Reading Date" type="date" size="small"
                InputLabelProps={{ shrink: true }}
                value={form.reading_date} onChange={e => setForm(f => ({ ...f, reading_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Previous Reading" type="number" size="small"
                value={form.previous_reading}
                onChange={e => setForm(f => ({ ...f, previous_reading: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth required label="Current Reading" type="number" size="small"
                value={form.current_reading}
                onChange={e => setForm(f => ({ ...f, current_reading: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Rate Per Unit (AED)" type="number" size="small"
                value={form.rate_per_unit}
                onChange={e => setForm(f => ({ ...f, rate_per_unit: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {/* Preview */}
              {consumptionPreview !== null && (
                <Paper sx={{ p: 1.5, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                  <Typography variant="caption" color="primary.main">Consumption Preview</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {consumptionPreview.toFixed(3)} units
                  </Typography>
                  {billedPreview !== null && (
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      = AED {billedPreview.toFixed(2)}
                    </Typography>
                  )}
                </Paper>
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Billing Period From" type="date" size="small"
                InputLabelProps={{ shrink: true }}
                value={form.billing_period_from}
                onChange={e => setForm(f => ({ ...f, billing_period_from: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Billing Period To" type="date" size="small"
                InputLabelProps={{ shrink: true }}
                value={form.billing_period_to}
                onChange={e => setForm(f => ({ ...f, billing_period_to: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                fullWidth label="Notes" size="small"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Recording…' : 'Record Reading'}
            </Button>
          </Stack>
        </Paper>
      </TabPanel>

      {/* Tab 1 — History */}
      <TabPanel value={tab} index={1}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <FilterListIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Filter History</Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth size="small" label="Unit"
                value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                <MenuItem value="">All Units</MenuItem>
                {units.map(u => <MenuItem key={u.unit_id} value={u.unit_id}>{u.unit_number}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth size="small" label="Utility Type"
                value={filterType} onChange={e => setFilterType(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {['Electricity', 'Water', 'Gas'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth size="small" label="Billed?"
                value={filterBilled} onChange={e => setFilterBilled(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="false">Unbilled</MenuItem>
                <MenuItem value="true">Billed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" label="From" type="date" InputLabelProps={{ shrink: true }}
                value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" label="To" type="date" InputLabelProps={{ shrink: true }}
                value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </Grid>
          </Grid>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper>
          {loading ? (
            <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Unit</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Meter #</strong></TableCell>
                    <TableCell><strong>Reading Date</strong></TableCell>
                    <TableCell align="right"><strong>Previous</strong></TableCell>
                    <TableCell align="right"><strong>Current</strong></TableCell>
                    <TableCell align="right"><strong>Consumed</strong></TableCell>
                    <TableCell align="right"><strong>Rate</strong></TableCell>
                    <TableCell align="right"><strong>Billed (AED)</strong></TableCell>
                    <TableCell><strong>Billed?</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        No utility readings found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    readings.map(r => (
                      <TableRow key={r.reading_id} hover>
                        <TableCell>{r.unit_id.slice(0, 8)}…</TableCell>
                        <TableCell>
                          <Chip
                            icon={r.utility_type === 'Electricity' ? <ElectricBoltIcon /> : <WaterDropIcon />}
                            label={r.utility_type}
                            size="small"
                            color={r.utility_type === 'Electricity' ? 'warning' : 'info'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{r.meter_number || '—'}</TableCell>
                        <TableCell>{r.reading_date}</TableCell>
                        <TableCell align="right">{r.previous_reading ?? '—'}</TableCell>
                        <TableCell align="right">{r.current_reading}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} variant="body2">
                            {r.units_consumed !== null && r.units_consumed !== undefined
                              ? Number(r.units_consumed).toFixed(3)
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{r.rate_per_unit ?? '—'}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="success.main" variant="body2">
                            {r.billed_amount
                              ? Number(r.billed_amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.is_billed ? 'Billed' : 'Unbilled'}
                            color={r.is_billed ? 'success' : 'warning'}
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
          {readings.length} reading(s) shown
        </Typography>
      </TabPanel>
    </Box>
  );
};

export default LabourCampUtilities;
