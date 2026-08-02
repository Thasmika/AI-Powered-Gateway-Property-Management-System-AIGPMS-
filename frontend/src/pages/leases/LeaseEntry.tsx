import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const LeaseEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tenantIdParam = queryParams.get('tenantId');
  
  const [formData, setFormData] = useState({
    lease_number: '',
    property_id: '',
    unit_id: '',
    tenant_id: tenantIdParam || '',
    lease_type: 'Residential',
    status: 'Active',
    
    // Initial Version fields
    contract_start_date: '',
    contract_end_date: '',
    annual_rent: '',
    currency: 'AED',
    payment_frequency: 'Monthly',
    number_of_cheques: '4',
    security_deposit: '',
    agent_commission: '',
    municipality_fee: '',
    ejari_number: '',
    contract_reference: '',
    notes: ''
  });
  
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [propsRes, tenantsRes] = await Promise.all([
          api.get('/properties'),
          api.get('/tenants')
        ]);
        setProperties(propsRes.data);
        setTenants(tenantsRes.data);
      } catch (e: any) {
        setError(e.response?.data?.detail || e.message || 'Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Fetch units when property changes
  useEffect(() => {
    const fetchUnits = async () => {
      if (!formData.property_id) {
        setUnits([]);
        return;
      }
      try {
        const res = await api.get(`/properties/${formData.property_id}`);
        setUnits(res.data.units || []);
        // reset unit_id if it's not in the new list
        setFormData(prev => ({ ...prev, unit_id: '' }));
      } catch (e: any) {
        console.error("Failed to fetch units", e);
      }
    };
    fetchUnits();
  }, [formData.property_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lease_number || !formData.property_id || !formData.unit_id || !formData.tenant_id) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        lease_number: formData.lease_number,
        property_id: formData.property_id,
        unit_id: formData.unit_id,
        tenant_id: formData.tenant_id,
        lease_type: formData.lease_type,
        status: formData.status,
        initial_version: {
          contract_start_date: formData.contract_start_date,
          contract_end_date: formData.contract_end_date,
          annual_rent: parseFloat(formData.annual_rent) || 0,
          currency: formData.currency,
          payment_frequency: formData.payment_frequency,
          number_of_cheques: parseInt(formData.number_of_cheques) || 1,
          security_deposit: parseFloat(formData.security_deposit) || 0,
          agent_commission: parseFloat(formData.agent_commission) || 0,
          municipality_fee: parseFloat(formData.municipality_fee) || 0,
          ejari_number: formData.ejari_number,
          contract_reference: formData.contract_reference,
          notes: formData.notes
        }
      };

      const res = await api.post('/leases', payload);
      navigate(`/tenants-leases/leases/${res.data.lease_id}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to create lease');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
          <AssignmentIcon />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Create New Lease</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Lease Details</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="lease_number" label="Lease Number *" value={formData.lease_number} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="lease_type" label="Lease Type" value={formData.lease_type} onChange={handleChange} fullWidth select>
                {['Residential', 'Commercial', 'Labour Camp'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="tenant_id" label="Tenant *" value={formData.tenant_id} onChange={handleChange} fullWidth select>
                {tenants.map(t => (
                  <MenuItem key={t.tenant_id} value={t.tenant_id}>{t.full_name} {t.trade_name ? `(${t.trade_name})` : ''}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField name="property_id" label="Property *" value={formData.property_id} onChange={handleChange} fullWidth select>
                {properties.map(p => (
                  <MenuItem key={p.property_id} value={p.property_id}>{p.property_name} ({p.property_code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="unit_id" label="Unit *" value={formData.unit_id} onChange={handleChange} fullWidth select disabled={!formData.property_id}>
                {units.map(u => (
                  <MenuItem key={u.unit_id} value={u.unit_id}>{u.unit_number} ({u.unit_type})</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Contract Terms</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="contract_start_date" label="Start Date *" type="date" InputLabelProps={{ shrink: true }} value={formData.contract_start_date} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="contract_end_date" label="End Date *" type="date" InputLabelProps={{ shrink: true }} value={formData.contract_end_date} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="annual_rent" label="Annual Rent *" type="number" value={formData.annual_rent} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="currency" label="Currency" value={formData.currency} onChange={handleChange} fullWidth select>
                {['AED', 'USD', 'EUR'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField name="payment_frequency" label="Payment Frequency" value={formData.payment_frequency} onChange={handleChange} fullWidth select>
                {['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="number_of_cheques" label="Number of Cheques" type="number" value={formData.number_of_cheques} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="security_deposit" label="Security Deposit" type="number" value={formData.security_deposit} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="ejari_number" label="Ejari Number" value={formData.ejari_number} onChange={handleChange} fullWidth />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Additional Info</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="agent_commission" label="Agent Commission" type="number" value={formData.agent_commission} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="municipality_fee" label="Municipality Fee" type="number" value={formData.municipality_fee} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="contract_reference" label="Contract Reference" value={formData.contract_reference} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField name="notes" label="Notes" value={formData.notes} onChange={handleChange} fullWidth multiline rows={2} />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
                {saving ? <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} /> : 'Create Lease'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default LeaseEntry;
