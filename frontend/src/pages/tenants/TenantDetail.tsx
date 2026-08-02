import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Avatar,
  Chip, Tabs, Tab
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AddIcon from '@mui/icons-material/Add';

interface TenantDetailData {
  tenant_id: string;
  tenant_type: string;
  full_name: string;
  trade_name: string | null;
  id_number: string | null;
  id_type: string | null;
  id_expiry: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  employer: string | null;
  emergency_contact: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TenantDetail: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchTenant = useCallback(async () => {
    try {
      const res = await api.get(`/tenants/${tenantId}`);
      setTenant(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!tenant) return <Alert severity="warning" sx={{ m: 3 }}>Tenant not found.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tenants-leases/tenants')} sx={{ color: 'text.secondary' }}>
            Back
          </Button>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>{tenant.full_name}</Typography>
            <Typography variant="body2" color="text.secondary">Tenant ID: {tenant.tenant_id}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/tenants-leases/tenants/${tenantId}/edit`)}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            Edit Tenant
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/tenants-leases/leases/new?tenantId=${tenantId}`)}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            New Lease
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
            <Tab label="Tenant Profile" />
            <Tab label="Lease History" />
            <Tab label="PDC History" />
          </Tabs>
        </Box>

        <CustomTabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Basic Information</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Type</Typography><Typography color="white" fontWeight={500}>{tenant.tenant_type}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Status</Typography>
                    <Chip label={tenant.status} size="small" sx={{ mt: 0.5, bgcolor: tenant.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: tenant.status === 'Active' ? '#10b981' : '#64748b' }} />
                  </Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Trade Name</Typography><Typography color="white" fontWeight={500}>{tenant.trade_name || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Nationality</Typography><Typography color="white" fontWeight={500}>{tenant.nationality || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Contact Information</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Email</Typography><Typography color="white" fontWeight={500}>{tenant.email || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Phone</Typography><Typography color="white" fontWeight={500}>{tenant.phone || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">WhatsApp</Typography><Typography color="white" fontWeight={500}>{tenant.whatsapp || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Address</Typography><Typography color="white" fontWeight={500}>{tenant.address || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Identification & Other</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Type</Typography><Typography color="white" fontWeight={500}>{tenant.id_type || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Number</Typography><Typography color="white" fontWeight={500}>{tenant.id_number || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Expiry</Typography><Typography color="white" fontWeight={500}>{tenant.id_expiry ? new Date(tenant.id_expiry).toLocaleDateString() : '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">Employer</Typography><Typography color="white" fontWeight={500}>{tenant.employer || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">Emergency Contact</Typography><Typography color="white" fontWeight={500}>{tenant.emergency_contact || '—'}</Typography></Grid>
                  <Grid item xs={12}><Typography color="text.secondary" variant="body2">Notes</Typography><Typography color="white" fontWeight={500}>{tenant.notes || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </CustomTabPanel>

        <CustomTabPanel value={tabValue} index={1}>
          <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            <ReceiptIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography>Lease history will be displayed here.</Typography>
          </Box>
        </CustomTabPanel>
        
        <CustomTabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            <Typography>PDC History will be implemented in Sprint 5.</Typography>
          </Box>
        </CustomTabPanel>

      </Paper>
    </Box>
  );
};

export default TenantDetail;
