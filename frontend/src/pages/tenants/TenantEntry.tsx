import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const TenantEntry: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const isEditMode = Boolean(tenantId);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    tenant_type: 'Individual',
    full_name: '',
    trade_name: '',
    id_number: '',
    id_type: 'Emirates ID',
    id_expiry: '',
    passport_number: '',
    passport_expiry_date: '',
    nationality: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    employer: '',
    emergency_contact: '',
    status: 'Active',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode) {
      const fetchTenant = async () => {
        try {
          const res = await api.get(`/tenants/${tenantId}`);
          const data = res.data;
          setFormData({
            tenant_type: data.tenant_type || 'Individual',
            full_name: data.full_name || '',
            trade_name: data.trade_name || '',
            id_number: data.id_number || '',
            id_type: data.id_type || 'Emirates ID',
            id_expiry: data.id_expiry ? data.id_expiry.split('T')[0] : '',
            passport_number: data.passport_number || '',
            passport_expiry_date: data.passport_expiry_date ? data.passport_expiry_date.split('T')[0] : '',
            nationality: data.nationality || '',
            email: data.email || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            address: data.address || '',
            employer: data.employer || '',
            emergency_contact: data.emergency_contact || '',
            status: data.status || 'Active',
            notes: data.notes || ''
          });
        } catch (e: any) {
          setError(e.response?.data?.detail || e.message || 'Failed to fetch tenant details');
        } finally {
          setLoading(false);
        }
      };
      fetchTenant();
    }
  }, [isEditMode, tenantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name) {
      setError('Full Name is required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        id_expiry: formData.id_expiry ? formData.id_expiry : null,
        passport_expiry_date: formData.passport_expiry_date ? formData.passport_expiry_date : null,
        email: formData.email ? formData.email : null
      };

      if (isEditMode) {
        await api.put(`/tenants/${tenantId}`, payload);
        navigate(`/tenants-leases/tenants/${tenantId}`);
      } else {
        const res = await api.post('/tenants', payload);
        navigate(`/tenants-leases/tenants/${res.data.tenant_id}`);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || `Failed to ${isEditMode ? 'update' : 'create'} tenant`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(isEditMode ? `/tenants-leases/tenants/${tenantId}` : '/tenants-leases/tenants')}
          sx={{ color: 'text.secondary' }}>Back</Button>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
          <PersonAddIcon />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>{isEditMode ? 'Edit Tenant' : 'Create New Tenant'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Basic Details</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="tenant_type" label="Tenant Type" value={formData.tenant_type} onChange={handleChange} fullWidth select>
                {['Individual', 'Company'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="full_name" label="Full Name *" value={formData.full_name} onChange={handleChange} fullWidth />
            </Grid>
            {formData.tenant_type === 'Company' && (
              <Grid item xs={12} md={6}>
                <TextField name="trade_name" label="Trade Name" value={formData.trade_name} onChange={handleChange} fullWidth />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField name="status" label="Status" value={formData.status} onChange={handleChange} fullWidth select>
                {['Active', 'Inactive', 'Blacklisted'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Identification</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="id_type" label="ID Type" value={formData.id_type} onChange={handleChange} fullWidth select>
                {['Emirates ID', 'Passport', 'Trade License'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="id_number" label="ID Number" value={formData.id_number} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="id_expiry" label="ID Expiry" type="date" InputLabelProps={{ shrink: true }} value={formData.id_expiry} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField name="nationality" label="Nationality" value={formData.nationality} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="passport_number" label="Passport Number" value={formData.passport_number} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="passport_expiry_date" label="Passport Expiry" type="date" InputLabelProps={{ shrink: true }} value={formData.passport_expiry_date} onChange={handleChange} fullWidth />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Contact Information</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="phone" label="Phone" value={formData.phone} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="whatsapp" label="WhatsApp" value={formData.whatsapp} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField name="address" label="Address" value={formData.address} onChange={handleChange} fullWidth multiline rows={2} />
            </Grid>

            {formData.tenant_type === 'Individual' && (
              <>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Additional Info</Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField name="employer" label="Employer" value={formData.employer} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField name="emergency_contact" label="Emergency Contact" value={formData.emergency_contact} onChange={handleChange} fullWidth />
                </Grid>
              </>
            )}

            <Grid item xs={12} sx={{ mt: 2 }}>
              <TextField name="notes" label="Notes" value={formData.notes} onChange={handleChange} fullWidth multiline rows={3} />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(isEditMode ? `/tenants-leases/tenants/${tenantId}` : '/tenants-leases/tenants')} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
                {saving ? <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} /> : (isEditMode ? 'Update Tenant' : 'Create Tenant')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default TenantEntry;
