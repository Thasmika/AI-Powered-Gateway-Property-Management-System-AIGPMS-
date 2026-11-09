import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, CircularProgress, Alert,
  Divider, Stack, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, MenuItem, Tooltip,
  IconButton, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PeopleIcon from '@mui/icons-material/People';
import BedIcon from '@mui/icons-material/Bed';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  Available: 'success',
  Occupied: 'default',
  'Under Maintenance': 'warning',
  'Out of Service': 'error',
};

const LabourCampManagement: React.FC = () => {
  const navigate = useNavigate();
  const [units, setUnits] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);

  // Filters
  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Add Unit Modal State
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    unit_type: 'Room',
    total_capacity: 1,
    has_attached_bathroom: false,
    has_ac: false,
    monthly_rent: '',
    location_description: ''
  });

  const handleAddUnit = async () => {
    setSubmitError(null);
    if (!formData.property_id || !formData.unit_number) {
      setSubmitError('Property and Unit Number are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/labour-camp/units', {
        ...formData,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        total_capacity: parseInt(formData.total_capacity.toString(), 10)
      });
      setOpenDialog(false);
      setFormData({
        property_id: '', unit_number: '', unit_type: 'Room', total_capacity: 1,
        has_attached_bathroom: false, has_ac: false, monthly_rent: '', location_description: ''
      });
      fetchData();
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail || 'Failed to create unit');
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (filterProperty) params.property_id = filterProperty;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.unit_type = filterType;

      const [unitsRes, summaryRes] = await Promise.all([
        api.get('/labour-camp/units', { params }),
        api.get('/labour-camp/occupancy-summary', {
          params: filterProperty ? { property_id: filterProperty } : {}
        }),
      ]);
      setUnits(unitsRes.data);
      setSummary(summaryRes.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load labour camp data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await api.get('/properties', { params: { limit: 200 } });
      setProperties(res.data);
    } catch {}
  };

  useEffect(() => { fetchProperties(); }, []);
  useEffect(() => { fetchData(); }, [filterProperty, filterStatus, filterType]);

  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            <ApartmentIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32 }} />
            Labour Camp Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Room & bed capacity, occupancy overview, and unit management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="Labour Camp Management" />
          <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Unit
        </Button>
        </Box>
      </Stack>

      {/* KPI Cards */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'Total Units',
              value: summary.total_units,
              sub: `${summary.units_available} available`,
              color: '#3b82f6',
              icon: <ApartmentIcon />,
            },
            {
              label: 'Total Capacity (Beds)',
              value: summary.total_capacity,
              sub: `${summary.available_beds} beds free`,
              color: '#8b5cf6',
              icon: <BedIcon />,
            },
            {
              label: 'Current Occupancy',
              value: summary.current_occupancy,
              sub: `${summary.occupancy_rate_pct}% occupancy rate`,
              color: '#10b981',
              icon: <PeopleIcon />,
            },
            {
              label: 'Under Maintenance',
              value: summary.units_under_maintenance,
              sub: 'Units offline',
              color: '#f59e0b',
              icon: <ApartmentIcon />,
            },
          ].map(kpi => (
            <Grid item xs={12} sm={6} md={3} key={kpi.label}>
              <Card sx={{ borderLeft: `4px solid ${kpi.color}` }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h4" fontWeight={700} color={kpi.color}>
                        {kpi.value}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>{kpi.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                    </Box>
                    <Box sx={{ color: kpi.color, opacity: 0.6 }}>{kpi.icon}</Box>
                  </Stack>
                  {kpi.label === 'Current Occupancy' && (
                    <LinearProgress
                      variant="determinate"
                      value={summary.occupancy_rate_pct}
                      sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
                      color={summary.occupancy_rate_pct > 90 ? 'error' : 'success'}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">Filters</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box flex={1}>
            <TextField
              select fullWidth size="small" label="Property"
              sx={{ minWidth: 200 }}
              value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
            >
              <MenuItem value="">All Properties</MenuItem>
              {properties.map(p => (
                <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box flex={1}>
            <TextField
              select fullWidth size="small" label="Status"
              sx={{ minWidth: 200 }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {['Available', 'Occupied', 'Under Maintenance', 'Out of Service'].map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box flex={1}>
            <TextField
              select fullWidth size="small" label="Unit Type"
              sx={{ minWidth: 200 }}
              value={filterType} onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {['Room', 'Dormitory', 'Bed Space', 'Studio', 'Other'].map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box flex={1}>
            <Button
              fullWidth variant="outlined" size="large"
              onClick={() => { setFilterProperty(''); setFilterStatus(''); setFilterType(''); }}
            >
              Clear Filters
            </Button>
          </Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Units Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    },
                  }}
                >
                  <TableCell>Unit #</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="center">Capacity</TableCell>
                  <TableCell align="center">Occupied</TableCell>
                  <TableCell align="center">Available</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Elec. Meter</TableCell>
                  <TableCell>Monthly Rent</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No labour camp units found.
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map(unit => (
                    <TableRow key={unit.unit_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{unit.unit_number}</Typography>
                      </TableCell>
                      <TableCell>{unit.unit_type}</TableCell>
                      <TableCell>{unit.location_description || '—'}</TableCell>
                      <TableCell align="center">{unit.total_capacity}</TableCell>
                      <TableCell align="center">{unit.current_occupancy}</TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={unit.total_capacity - unit.current_occupancy > 0 ? 'success.main' : 'error.main'}
                        >
                          {unit.total_capacity - unit.current_occupancy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={unit.status}
                          color={statusColors[unit.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{unit.electricity_meter_number || '—'}</TableCell>
                      <TableCell>
                        {unit.monthly_rent
                          ? `AED ${Number(unit.monthly_rent).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`
                          : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Residents">
                          <IconButton
                            size="small"
                            sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}
                            onClick={() => navigate(`/labour-camp/residents?unit_id=${unit.unit_id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
        {units.length} unit(s) shown
      </Typography>

      {/* Add Unit Dialog */}
      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Labour Camp Unit</DialogTitle>
        <DialogContent>
          {submitError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{submitError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Property / Camp"
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              >
                {properties.map(p => (
                  <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unit Number"
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Unit Type"
                value={formData.unit_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({
                    ...formData,
                    unit_type: newType,
                    total_capacity: newType === 'Bed Space' ? 1 : formData.total_capacity
                  });
                }}
              >
                <MenuItem value="Room">Room</MenuItem>
                <MenuItem value="Bed Space">Bed Space</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Capacity (Beds)"
                disabled={formData.unit_type === 'Bed Space'}
                value={formData.total_capacity}
                onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Monthly Rent per Bed (AED)"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location Description"
                placeholder="e.g. Block A, Floor 2"
                value={formData.location_description}
                onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch checked={formData.has_attached_bathroom} onChange={(e) => setFormData({ ...formData, has_attached_bathroom: e.target.checked })} />}
                label="Attached Bathroom"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch checked={formData.has_ac} onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })} />}
                label="AC Included"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUnit} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Add Unit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabourCampManagement;
