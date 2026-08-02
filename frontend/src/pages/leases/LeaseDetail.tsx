import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button, Avatar, Chip, Grid,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LeasePaymentSchedule from './LeasePaymentSchedule';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`lease-tabpanel-${index}`} aria-labelledby={`lease-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const LeaseDetail: React.FC = () => {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    contract_start_date: '',
    contract_end_date: '',
    annual_rent: '',
    renewal_reason: ''
  });
  const [renewing, setRenewing] = useState(false);

  const fetchLease = useCallback(async () => {
    try {
      const res = await api.get(`/leases/${leaseId}`);
      setLease(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to fetch lease details');
    } finally {
      setLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRenewSubmit = async () => {
    if (!renewForm.contract_start_date || !renewForm.contract_end_date || !renewForm.annual_rent) {
      alert("Please fill in dates and rent amount.");
      return;
    }
    setRenewing(true);
    try {
      const payload = {
        renewal_reason: renewForm.renewal_reason,
        new_version: {
          ...currentVersion, // Copy existing details for simplicity, override with new dates/rent
          contract_start_date: renewForm.contract_start_date,
          contract_end_date: renewForm.contract_end_date,
          annual_rent: parseFloat(renewForm.annual_rent) || 0
        }
      };
      await api.post(`/leases/${leaseId}/renew`, payload);
      setRenewDialogOpen(false);
      fetchLease();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Failed to renew lease');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!lease) return <Alert severity="warning" sx={{ m: 3 }}>Lease not found.</Alert>;

  const currentVersion = lease.versions.find((v: any) => v.is_current_version) || lease.versions[lease.versions.length - 1];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            Back
          </Button>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <AssignmentIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Lease #{lease.lease_number}</Typography>
            <Typography variant="body2" color="text.secondary">Version: {currentVersion?.version_number} | Status: <Chip label={lease.status} size="small" sx={{ ml: 1, bgcolor: lease.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: lease.status === 'Active' ? '#10b981' : '#64748b' }} /></Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AutorenewIcon />} onClick={() => setRenewDialogOpen(true)}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Renew Lease
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
            <Tab label="Current Version Details" />
            <Tab label="Version History" />
            <Tab label="Payment Schedule" />
          </Tabs>
        </Box>

        <CustomTabPanel value={tabValue} index={0}>
          {currentVersion ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Contract Info</Typography>
                <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">Start Date</Typography><Typography color="white" fontWeight={500}>{currentVersion.contract_start_date}</Typography></Grid>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">End Date</Typography><Typography color="white" fontWeight={500}>{currentVersion.contract_end_date}</Typography></Grid>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">Annual Rent</Typography><Typography color="white" fontWeight={500}>{currentVersion.annual_rent} {currentVersion.currency}</Typography></Grid>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">Payment Freq</Typography><Typography color="white" fontWeight={500}>{currentVersion.payment_frequency}</Typography></Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>References</Typography>
                <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">Ejari Number</Typography><Typography color="white" fontWeight={500}>{currentVersion.ejari_number || '—'}</Typography></Grid>
                    <Grid item xs={6}><Typography color="text.secondary" variant="body2">Ref Number</Typography><Typography color="white" fontWeight={500}>{currentVersion.contract_reference || '—'}</Typography></Grid>
                    <Grid item xs={12}><Typography color="text.secondary" variant="body2">Tenant ID</Typography><Typography color="white" fontWeight={500} sx={{ cursor: 'pointer', color: '#6366f1' }} onClick={() => navigate(`/tenants-leases/tenants/${lease.tenant_id}`)}>{lease.tenant_id}</Typography></Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No active version found.</Alert>
          )}
        </CustomTabPanel>

        <CustomTabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            {lease.versions.map((v: any) => (
              <Grid item xs={12} key={v.version_id}>
                <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2, borderLeft: v.is_current_version ? '4px solid #10b981' : '4px solid #64748b' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" color="white">Version {v.version_number}</Typography>
                      <Typography variant="body2" color="text.secondary">{v.contract_start_date} to {v.contract_end_date}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="white">{v.annual_rent} {v.currency}</Typography>
                      {v.is_current_version ? <Chip label="Current" size="small" color="success" /> : <Chip label="Superseded" size="small" />}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CustomTabPanel>
        
        <CustomTabPanel value={tabValue} index={2}>
          {currentVersion ? (
            <LeasePaymentSchedule versionId={currentVersion.version_id} />
          ) : (
             <Alert severity="info">No active version found.</Alert>
          )}
        </CustomTabPanel>
      </Paper>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white', minWidth: 400 } }}>
        <DialogTitle>Renew Lease</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="New Start Date" type="date" InputLabelProps={{ shrink: true }} fullWidth value={renewForm.contract_start_date} onChange={(e) => setRenewForm({...renewForm, contract_start_date: e.target.value})} />
            <TextField label="New End Date" type="date" InputLabelProps={{ shrink: true }} fullWidth value={renewForm.contract_end_date} onChange={(e) => setRenewForm({...renewForm, contract_end_date: e.target.value})} />
            <TextField label="New Annual Rent" type="number" fullWidth value={renewForm.annual_rent} onChange={(e) => setRenewForm({...renewForm, annual_rent: e.target.value})} />
            <TextField label="Renewal Reason (Optional)" fullWidth value={renewForm.renewal_reason} onChange={(e) => setRenewForm({...renewForm, renewal_reason: e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenewDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleRenewSubmit} variant="contained" disabled={renewing} sx={{ bgcolor: '#6366f1' }}>
            {renewing ? <CircularProgress size={20} /> : 'Confirm Renewal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaseDetail;
