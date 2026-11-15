import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Avatar, Alert, IconButton,
  Tooltip, Stack, TextField, InputAdornment, FormControl, InputLabel,
  Select, MenuItem, Card, CardContent, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Snackbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import StraightenIcon from '@mui/icons-material/Straighten';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

interface Unit {
  unit_id: string;
  property_id: string;
  unit_number: string;
  unit_type: string | null;
  floor_number: string | null;
  balcony: string | null;
  area_sqm: number | null;
  plot_number: string | null;
  makani_number: string | null;
  status: string;
  unit_description: string | null;
  created_at: string;
  tenant_id: string | null;
  legal_owner_id: string | null;
  beneficial_owner_id: string | null;
}

interface Property {
  property_id: string;
  property_name: string;
  property_code: string;
  emirate: string | null;
  community: string | null;
}

interface Tenant {
  tenant_id: string;
  full_name: string;
  trade_name?: string;
}

// Status colour config
const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; bg: string; text: string }> = {
  Vacant:             { color: 'warning',  bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
  Occupied:           { color: 'success',  bg: 'rgba(16,185,129,0.15)',  text: '#10b981' },
  'Under Maintenance':{ color: 'error',    bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
  'Used By Staff':    { color: 'info',     bg: 'rgba(56,189,248,0.15)',  text: '#38bdf8' },
  'Office Use':       { color: 'default',  bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
};

const unitTypeIcon = (type: string | null) => {
  switch (type) {
    case 'Studio':
    case '1BR': case '2BR': case '3BR': case '4BR': case '5BR':
      return <HomeIcon sx={{ fontSize: 14 }} />;
    case 'Villa':
      return <ApartmentIcon sx={{ fontSize: 14 }} />;
    case 'Commercial':
      return <BusinessIcon sx={{ fontSize: 14 }} />;
    case 'Room':
    case 'Bed Space':
      return <MeetingRoomIcon sx={{ fontSize: 14 }} />;
    default:
      return <HomeWorkIcon sx={{ fontSize: 14 }} />;
  }
};

const UnitRegister: React.FC = () => {
  const navigate = useNavigate();

  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [contractFilter, setContractFilter] = useState(''); // '' | 'with' | 'without'

  // Edit dialog
  const emptyEdit = {
    unit_id: '', property_id: '', unit_number: '', unit_type: '', floor_number: '',
    balcony: 'Without Balcony', area_sqm: '', plot_number: '', makani_number: '',
    status: 'Vacant', unit_description: '',
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(emptyEdit);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openEdit = (unit: Unit) => {
    setEditError(null);
    setEditData({
      unit_id: unit.unit_id,
      property_id: unit.property_id,
      unit_number: unit.unit_number || '',
      unit_type: unit.unit_type || '',
      floor_number: unit.floor_number || '',
      balcony: unit.balcony || 'Without Balcony',
      area_sqm: unit.area_sqm != null ? String(unit.area_sqm) : '',
      plot_number: unit.plot_number || '',
      makani_number: unit.makani_number || '',
      status: unit.status || 'Vacant',
      unit_description: unit.unit_description || '',
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editData.unit_number.trim()) {
      setEditError('Unit number is required');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = {
        unit_number: editData.unit_number.trim(),
        unit_type: editData.unit_type || null,
        floor_number: editData.floor_number || null,
        balcony: editData.balcony || null,
        area_sqm: editData.area_sqm !== '' ? parseFloat(editData.area_sqm) : null,
        plot_number: editData.plot_number || null,
        makani_number: editData.makani_number || null,
        status: editData.status,
        unit_description: editData.unit_description || null,
      };
      const res = await api.put(`/properties/${editData.property_id}/units/${editData.unit_id}`, payload);
      setUnits(prev => prev.map(u => (u.unit_id === editData.unit_id ? { ...u, ...res.data } : u)));
      setEditOpen(false);
      setToast(`Unit ${payload.unit_number} updated`);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setEditError(typeof detail === 'string' ? detail : e.message || 'Failed to update unit');
    } finally {
      setEditSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [unitsRes, propertiesRes, tenantsRes] = await Promise.all([
        api.get('/properties/units/all'),
        api.get('/properties'),
        api.get('/tenants'),
      ]);

      setUnits(unitsRes.data);

      // Build property map
      const propMap: Record<string, Property> = {};
      propertiesRes.data.forEach((p: any) => {
        propMap[p.property_id] = p;
      });
      setProperties(propMap);

      // Build tenant map
      const tenantMap: Record<string, string> = {};
      tenantsRes.data.forEach((t: Tenant) => {
        tenantMap[t.tenant_id] = t.full_name + (t.trade_name ? ` (${t.trade_name})` : '');
      });
      setTenants(tenantMap);

    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to load unit data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived: unique unit types for filter
  const unitTypes = Array.from(new Set(units.map(u => u.unit_type).filter(Boolean))) as string[];

  // Filter logic
  const filtered = units.filter(unit => {
    const prop = properties[unit.property_id];
    const propName = prop?.property_name || '';
    const propCode = prop?.property_code || '';
    const tenantName = unit.tenant_id ? (tenants[unit.tenant_id] || '') : '';

    const matchSearch = !search ||
      unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      propName.toLowerCase().includes(search.toLowerCase()) ||
      propCode.toLowerCase().includes(search.toLowerCase()) ||
      tenantName.toLowerCase().includes(search.toLowerCase()) ||
      (unit.unit_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (unit.floor_number || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = !statusFilter || unit.status === statusFilter;
    const matchType = !unitTypeFilter || unit.unit_type === unitTypeFilter;
    const matchProperty = !propertyFilter || unit.property_id === propertyFilter;
    const matchContract =
      !contractFilter ||
      (contractFilter === 'with'    &&  !!unit.tenant_id) ||
      (contractFilter === 'without' && !unit.tenant_id);

    return matchSearch && matchStatus && matchType && matchProperty && matchContract;
  }).sort((a, b) => {
    const propA = properties[a.property_id]?.property_name || '';
    const propB = properties[b.property_id]?.property_name || '';
    const propCompare = propA.localeCompare(propB);
    if (propCompare !== 0) return propCompare;
    return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' });
  });

  // KPI stats
  const byStatus = (s: string) => units.filter(u => u.status === s).length;
  const withContract    = units.filter(u =>  !!u.tenant_id).length;
  const withoutContract = units.filter(u => !u.tenant_id).length;
  const totalAreaSqm = units.reduce((sum, u) => sum + Number(u.area_sqm || 0), 0);
  const occupancyRate = units.length > 0
    ? Math.round((byStatus('Occupied') / units.length) * 100)
    : 0;

  const kpis = [
    { label: 'Total Units',           value: units.length,          color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'With Tenancy Contract', value: withContract,           color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'No Contract (Staff)',   value: withoutContract,        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Used By Staff',         value: byStatus('Used By Staff'), color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    { label: 'Under Maintenance',     value: byStatus('Under Maintenance'), color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Occupancy Rate',        value: `${occupancyRate}%`,    color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
    {
      label: 'Total Area (SQM)',
      value: totalAreaSqm.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.15)',
    },
  ];

  const formatArea = (n: number | null) =>
    n != null ? `${Number(n).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} sqm` : '—';

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Page Header ───────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.2)', width: 40, height: 40 }}>
              <HomeWorkIcon sx={{ color: '#6366f1', fontSize: 22 }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="white">
              Unit Register
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" ml={7}>
            Complete register of all units across all properties — status, occupancy, area and tenant at a glance
          </Typography>
        </Box>
        <PdfExportButton title="Unit Register" />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {kpis.map(kpi => (
          <Card
            key={kpi.label}
            sx={{
              flex: '1 1 150px',
              background: kpi.bg,
              border: `1px solid ${kpi.color}33`,
              borderRadius: 2,
              cursor: 'default',
            }}
          >
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                textTransform="uppercase" fontSize={10} letterSpacing={0.8}>
                {kpi.label}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: kpi.color, mt: 0.3 }}>
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ── Occupancy Progress Bar ────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Portfolio Occupancy
          </Typography>
          <Typography variant="caption" color="#10b981" fontWeight={700}>
            {occupancyRate}% Occupied
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={occupancyRate}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 3 },
          }}
        />
      </Box>

      {/* ── Filters ───────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} mb={2.5} alignItems="center" flexWrap="wrap">
        <TextField
          placeholder="Search unit no., property, tenant, type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Filter by Property</InputLabel>
          <Select
            value={propertyFilter}
            label="Filter by Property"
            onChange={e => setPropertyFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Properties</MenuItem>
            {Object.values(properties).map(p => (
              <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Occupied">Occupied</MenuItem>
            <MenuItem value="Vacant">Vacant</MenuItem>
            <MenuItem value="Under Maintenance">Under Maintenance</MenuItem>
            <MenuItem value="Used By Staff">Used By Staff</MenuItem>
            <MenuItem value="Office Use">Office Use</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={unitTypeFilter}
            label="Filter by Type"
            onChange={e => setUnitTypeFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Types</MenuItem>
            {unitTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Tenancy Contract</InputLabel>
          <Select
            value={contractFilter}
            label="Tenancy Contract"
            onChange={e => setContractFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Units</MenuItem>
            <MenuItem value="with">With Tenancy Contract</MenuItem>
            <MenuItem value="without">No Contract (Staff / Other)</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" ml="auto !important">
          Showing {filtered.length} of {units.length} units
        </Typography>
      </Stack>

      {/* ── Table ─────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  },
                }}
              >
                <TableCell>#</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Unit Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Current Tenant</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <HomeWorkIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary" fontWeight={500}>No units found</Typography>
                    <Typography variant="caption" color="text.disabled">
                      Adjust your filters or add units from the Property Master page
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((unit, idx) => {
                  const prop = properties[unit.property_id];
                  const propName = prop?.property_name || '—';
                  const propEmirateComm = [prop?.emirate, prop?.community].filter(Boolean).join(', ');
                  const tenantName = unit.tenant_id ? (tenants[unit.tenant_id] || 'Tenant on record') : null;
                  const sc = statusConfig[unit.status] || { color: 'default' as const, bg: 'rgba(255,255,255,0.05)', text: '#94a3b8' };

                  return (
                    <TableRow
                      key={unit.unit_id}
                      sx={{
                        cursor: 'pointer',
                        '& td': { borderColor: 'rgba(255,255,255,0.04)' },
                        '&:hover': { background: 'rgba(99,102,241,0.06)' },
                        background: unit.status === 'Under Maintenance' ? 'rgba(239,68,68,0.03)' : 'transparent',
                      }}
                      onClick={() => navigate(`/properties/${unit.property_id}`, { state: { openUnitId: unit.unit_id } })}
                    >
                      {/* Row # */}
                      <TableCell>
                        <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                          {idx + 1}
                        </Typography>
                      </TableCell>

                      {/* Property */}
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography variant="body2" fontWeight={600} color="white" noWrap>
                          {propName}
                        </Typography>
                      </TableCell>

                      {/* Unit Number */}
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography variant="body2" fontWeight={700} color="#a5b4fc" fontFamily="monospace" noWrap>
                          {unit.unit_number}
                        </Typography>
                      </TableCell>

                      {/* Unit Type */}
                      <TableCell sx={{ minWidth: 200 }}>
                        <Stack direction="row" alignItems="center" spacing={0.6}>
                          <Box sx={{ color: 'text.disabled' }}>{unitTypeIcon(unit.unit_type)}</Box>
                          <Typography variant="body2" color="text.secondary">
                            {unit.unit_type || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Current Tenant */}
                      <TableCell sx={{ maxWidth: 160 }}>
                        {tenantName ? (
                          <Typography variant="body2" color="#34d399" fontWeight={500} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tenantName}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled" fontStyle="italic" noWrap>
                            Vacant
                          </Typography>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell align="center">
                        <Chip
                          label={unit.status}
                          size="small"
                          sx={{
                            bgcolor: sc.bg,
                            color: sc.text,
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            minWidth: 80,
                            border: `1px solid ${sc.text}33`,
                          }}
                        />
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center">
                        <Tooltip title="View Property Detail">
                          <IconButton
                            size="small"
                            onClick={e => { e.stopPropagation(); navigate(`/properties/${unit.property_id}`, { state: { openUnitId: unit.unit_id } }); }}
                            sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Unit">
                          <IconButton
                            size="small"
                            onClick={e => { e.stopPropagation(); openEdit(unit); }}
                            sx={{ ml: 0.5, color: '#f59e0b', '&:hover': { background: 'rgba(245,158,11,0.15)' } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Edit Unit Dialog ──────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => !editSaving && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Unit
          <Typography variant="body2" color="text.secondary">
            {properties[editData.property_id]?.property_name || ''}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Unit Number" required fullWidth value={editData.unit_number}
                onChange={e => setEditData({ ...editData, unit_number: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Unit Type" fullWidth value={editData.unit_type}
                onChange={e => setEditData({ ...editData, unit_type: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Floor Number" fullWidth value={editData.floor_number}
                onChange={e => setEditData({ ...editData, floor_number: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Balcony" fullWidth value={editData.balcony}
                onChange={e => setEditData({ ...editData, balcony: e.target.value })}>
                {['With Balcony', 'Without Balcony'].map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Area (SQM)" type="number" fullWidth value={editData.area_sqm}
                onChange={e => setEditData({ ...editData, area_sqm: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Status" fullWidth value={editData.status}
                onChange={e => setEditData({ ...editData, status: e.target.value })}>
                {Array.from(new Set(['Vacant', 'Occupied', 'Under Maintenance', 'Used By Staff', 'Office Use', editData.status]))
                  .filter(Boolean)
                  .map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Plot Number" fullWidth value={editData.plot_number}
                onChange={e => setEditData({ ...editData, plot_number: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Makani Number" fullWidth value={editData.makani_number}
                onChange={e => setEditData({ ...editData, makani_number: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description" fullWidth multiline minRows={2} value={editData.unit_description}
                onChange={e => setEditData({ ...editData, unit_description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}
            startIcon={editSaving ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}>
            {editSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />

      {/* ── Footer summary ────────────────────────────────────── */}
      {units.length > 0 && (
        <Stack direction="row" justifyContent="flex-end" mt={1.5} spacing={3}>
          <Typography variant="caption" color="text.disabled">
            Total portfolio area:{' '}
            <strong style={{ color: '#a78bfa' }}>
              {totalAreaSqm.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} sqm
            </strong>
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Occupancy rate:{' '}
            <strong style={{ color: '#10b981' }}>{occupancyRate}%</strong>
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default UnitRegister;
