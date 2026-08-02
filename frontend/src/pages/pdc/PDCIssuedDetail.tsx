import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, CircularProgress, Avatar, Alert, Divider, IconButton
} from '@mui/material';
import OutboxIcon from '@mui/icons-material/Outbox';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PDCIssuedDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [pdc, setPdc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchPdc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pdc-issued/${id}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load PDC detail');
      setPdc(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => { fetchPdc(); }, [fetchPdc]);

  const handleAction = async (action: string, extraPayload: any = {}) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pdc-issued/${id}/${action}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(extraPayload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Failed to ${action} PDC`);
      }
      fetchPdc();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error && !pdc) return <Alert severity="error">{error}</Alert>;
  if (!pdc) return <Alert severity="info">PDC not found</Alert>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Approved': return 'primary';
      case 'Issued': return 'info';
      case 'Cleared': return 'success';
      case 'Returned': return 'error';
      case 'Due Soon': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/pdc-issued')} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: '#ec489920', color: '#ec4899', width: 48, height: 48 }}>
          <OutboxIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>{pdc.pdc_issue_reference}</Typography>
          <Typography variant="body2" color="text.secondary">Issued PDC Details</Typography>
        </Box>
        <Chip label={pdc.status} color={getStatusColor(pdc.status) as any} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Action Bar */}
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {pdc.status === 'Draft' && user?.role_name === 'Managing Director' && (
          <Button variant="contained" color="primary" startIcon={<CheckCircleIcon />} 
            onClick={() => handleAction('approve')} disabled={actionLoading}>
            Approve PDC
          </Button>
        )}
        {pdc.status === 'Approved' && (
          <Button variant="contained" color="info" startIcon={<SendIcon />} 
            onClick={() => handleAction('issue')} disabled={actionLoading}>
            Mark as Issued
          </Button>
        )}
        {(pdc.status === 'Issued' || pdc.status === 'Due Soon') && (
          <>
            <Button variant="contained" color="success" startIcon={<AccountBalanceIcon />} 
              onClick={() => handleAction('clear')} disabled={actionLoading}>
              Mark Cleared
            </Button>
            <Button variant="contained" color="error" startIcon={<AssignmentReturnIcon />} 
              onClick={() => handleAction('return', { reason: 'Returned by bank' })} disabled={actionLoading}>
              Record Return
            </Button>
          </>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Cheque Details</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Payee</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.payee_name}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Payee Type</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.payee_type || '—'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Amount</Typography>
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 700 }}>AED {Number(pdc.cheque_amount).toLocaleString()}</Typography>
              </Grid>
              
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Cheque No.</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.cheque_number}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Cheque Date</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.cheque_date}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Date Issued</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.date_issued || '—'}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Purpose</Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>{pdc.purpose || '—'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Workflow</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Prepared By</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{pdc.prepared_by || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Approved By</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{pdc.approved_by || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Approved At</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{pdc.approved_at ? new Date(pdc.approved_at).toLocaleString() : '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Cleared At</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{pdc.cleared_at ? new Date(pdc.cleared_at).toLocaleString() : '—'}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PDCIssuedDetail;
