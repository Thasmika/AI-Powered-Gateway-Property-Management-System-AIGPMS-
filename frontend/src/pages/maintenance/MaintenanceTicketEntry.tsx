import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Alert,
  CircularProgress, Divider, Stack, Chip, InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import BuildIcon from '@mui/icons-material/Build';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const priorityColors: Record<string, 'default' | 'warning' | 'error' | 'info' | 'success'> = {
  Low: 'default',
  Medium: 'info',
  High: 'warning',
  Critical: 'error',
};

const MaintenanceTicketEntry: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reference data
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    property_id: '',
    unit_id: '',
    category_id: '',
    priority: 'Medium',
    title: '',
    description: '',
    tenant_id: '',
    reported_by: '',
    reported_date: new Date().toISOString().split('T')[0],
    target_completion_date: '',
    supplier_name: '',
    lpo_number: '',
    lpo_amount: '',
    estimated_cost: '',
    internal_notes: '',
  });

  const loadRef = async () => {
    try {
      const [propRes, catRes, tenRes] = await Promise.all([
        api.get('/properties', { params: { limit: 200 } }),
        api.get('/maintenance-tickets/categories', { params: { is_active: true } }),
        api.get('/tenants', { params: { limit: 200 } }),
      ]);
      setProperties(propRes.data);
      setCategories(catRes.data);
      setTenants(tenRes.data);
    } catch {}
  };

  useEffect(() => { loadRef(); }, []);

  const loadUnits = async (propertyId: string) => {
    if (!propertyId) { setUnits([]); return; }
    try {
      const res = await api.get(`/properties/${propertyId}/units`);
      setUnits(res.data);
    } catch {}
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'property_id') {
      setForm(prev => ({ ...prev, property_id: value, unit_id: '' }));
      loadUnits(value);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!form.property_id || !form.category_id || !form.title || !form.reported_date) {
      setError('Property, Category, Title, and Reported Date are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        property_id: form.property_id,
        category_id: form.category_id,
        priority: form.priority,
        title: form.title,
        description: form.description || null,
        reported_date: form.reported_date,
        internal_notes: form.internal_notes || null,
      };
      if (form.unit_id) payload.unit_id = form.unit_id;
      if (form.tenant_id) payload.tenant_id = form.tenant_id;
      if (form.reported_by) payload.reported_by = form.reported_by;
      if (form.target_completion_date) payload.target_completion_date = form.target_completion_date;
      if (form.supplier_name) payload.supplier_name = form.supplier_name;
      if (form.lpo_number) payload.lpo_number = form.lpo_number;
      if (form.lpo_amount) payload.lpo_amount = parseFloat(form.lpo_amount);
      if (form.estimated_cost) payload.estimated_cost = parseFloat(form.estimated_cost);

      const res = await api.post('/maintenance-tickets', payload);
      setSuccess(`Ticket ${res.data.ticket_number} raised successfully.`);
      setTimeout(() => navigate(`/maintenance/${res.data.ticket_id}`), 1500);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create maintenance ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3} maxWidth={900} mx="auto">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/maintenance')} sx={{ mb: 1 }}>
            Back to Maintenance
          </Button>
          <Typography variant="h5" fontWeight={700}>
            <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Raise Maintenance Ticket
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new work order for property maintenance
          </Typography>
        </Box>
        <Chip
          label={`Priority: ${form.priority}`}
          color={priorityColors[form.priority]}
          size="medium"
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Section A — Location */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
          A — Location
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            select fullWidth required label="Property" size="small"
            value={form.property_id} onChange={e => handleChange('property_id', e.target.value)}
          >
            <MenuItem value="">— Select Property —</MenuItem>
            {properties.map(p => (
              <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth label="Unit (Optional)" size="small"
            value={form.unit_id} onChange={e => handleChange('unit_id', e.target.value)}
            disabled={!form.property_id}
          >
            <MenuItem value="">— No Specific Unit —</MenuItem>
            {units.map(u => (
              <MenuItem key={u.unit_id} value={u.unit_id}>{u.unit_number} — {u.unit_type}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth label="Tenant (Optional)" size="small"
            value={form.tenant_id} onChange={e => handleChange('tenant_id', e.target.value)}
          >
            <MenuItem value="">— No Tenant Link —</MenuItem>
            {tenants.map(t => (
              <MenuItem key={t.tenant_id} value={t.tenant_id}>{t.full_name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth label="Reported By (Name)" size="small"
            value={form.reported_by} onChange={e => handleChange('reported_by', e.target.value)}
            placeholder="e.g. Building Manager or Tenant name"
          />
        </Box>
      </Paper>

      {/* Section B — Classification */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
          B — Classification
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            select fullWidth required label="Category" size="small"
            value={form.category_id} onChange={e => handleChange('category_id', e.target.value)}
          >
            <MenuItem value="">— Select Category —</MenuItem>
            {categories.map(c => (
              <MenuItem key={c.category_id} value={c.category_id}>{c.category_name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth required label="Priority" size="small"
            value={form.priority} onChange={e => handleChange('priority', e.target.value)}
          >
            {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <TextField
              fullWidth required label="Title / Summary" size="small"
              value={form.title} onChange={e => handleChange('title', e.target.value)}
              placeholder="Brief title of the maintenance issue"
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <TextField
              fullWidth multiline rows={3} label="Description" size="small"
              value={form.description} onChange={e => handleChange('description', e.target.value)}
              placeholder="Detailed description of the issue..."
            />
          </Box>
        </Box>
      </Paper>

      {/* Section C — Dates & Costs */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
          C — Dates & Cost Estimates
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Reported Date *</Typography>
            <TextField
              fullWidth required type="date" size="small"
              inputProps={{ style: { colorScheme: 'dark' } }}
              value={form.reported_date} onChange={e => handleChange('reported_date', e.target.value)}
            />
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Target Completion Date</Typography>
            <TextField
              fullWidth type="date" size="small"
              inputProps={{ style: { colorScheme: 'dark' } }}
              value={form.target_completion_date}
              onChange={e => handleChange('target_completion_date', e.target.value)}
            />
          </Stack>
          <TextField
            fullWidth label="Estimated Cost" type="number" size="small"
            InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }}
            value={form.estimated_cost}
            onChange={e => handleChange('estimated_cost', e.target.value)}
          />
        </Box>
      </Paper>

      {/* Section D — Supplier / LPO */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
          D — Supplier / LPO (if applicable)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth label="Supplier / Contractor Name" size="small"
            value={form.supplier_name} onChange={e => handleChange('supplier_name', e.target.value)}
          />
          <TextField
            fullWidth label="LPO Number" size="small"
            value={form.lpo_number} onChange={e => handleChange('lpo_number', e.target.value)}
          />
          <TextField
            fullWidth label="LPO Amount" type="number" size="small"
            InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }}
            value={form.lpo_amount} onChange={e => handleChange('lpo_amount', e.target.value)}
          />
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <TextField
              fullWidth multiline rows={2} label="Internal Notes" size="small"
              value={form.internal_notes} onChange={e => handleChange('internal_notes', e.target.value)}
              placeholder="Internal remarks (not visible to tenant)"
            />
          </Box>
        </Box>
      </Paper>

      {/* Actions */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={() => navigate('/maintenance')}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Raise Ticket'}
        </Button>
      </Stack>
    </Box>
  );
};

export default MaintenanceTicketEntry;
