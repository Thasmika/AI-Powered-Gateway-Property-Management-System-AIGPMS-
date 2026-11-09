import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem, Chip,
  CircularProgress, Alert, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Divider, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default',
};

const PAYEE_TYPES = ['Supplier', 'Contractor', 'Bank', 'Loan Provider', 'Sister Company', 'Other'];
const PAYMENT_METHODS = ['Cheque', 'Transfer', 'PDC', 'Cash', 'Other'];

const PaymentVoucherEntry: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    payee_name: '', payee_type: '', amount: '', currency: 'AED',
    purpose: '', payment_method: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/payment-vouchers', { params: { limit: 200 } });
      setVouchers(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load payment vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleSave = async () => {
    if (!form.payee_name || !form.amount) return setFormError('Payee name and amount are required');
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/loans/payment-vouchers', {
        ...form,
        amount: parseFloat(form.amount),
      });
      setShowForm(false);
      setForm({ payee_name: '', payee_type: '', amount: '', currency: 'AED', purpose: '', payment_method: '', notes: '' });
      setActionMsg({ type: 'success', text: 'Payment voucher created successfully' });
      fetchVouchers();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to create voucher');
    } finally {
      setSaving(false);
    }
  };

  const canApprove = user?.role === 'Managing Director' || user?.role === 'Administrator';

  const handleApprove = async (voucherId: string) => {
    setActionLoading(voucherId);
    try {
      await api.post(`/loans/payment-vouchers/${voucherId}/approve`, {});
      setActionMsg({ type: 'success', text: 'Payment voucher approved' });
      fetchVouchers();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Approval failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (voucherId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActionLoading(voucherId);
    try {
      await api.post(`/loans/payment-vouchers/${voucherId}/reject`, { reason });
      setActionMsg({ type: 'success', text: 'Payment voucher rejected' });
      fetchVouchers();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Rejection failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const totalPending = vouchers.filter(v => v.approval_status === 'Pending').reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const totalApproved = vouchers.filter(v => v.approval_status === 'Approved').reduce((s, v) => s + parseFloat(v.amount || 0), 0);

  const inputSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
    '& .MuiSvgIcon-root': { color: '#94a3b8' },
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <IconButton onClick={() => navigate('/loans')} sx={{ color: '#94a3b8' }}><ArrowBackIcon /></IconButton>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>Payment Vouchers</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {vouchers.length} vouchers · AED {totalPending.toLocaleString('en-AE', { minimumFractionDigits: 2 })} pending · AED {totalApproved.toLocaleString('en-AE', { minimumFractionDigits: 2 })} approved
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(!showForm)}
          sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          New Voucher
        </Button>
      </Box>

      {actionMsg && (
        <Alert severity={actionMsg.type} sx={{ mb: 2 }} onClose={() => setActionMsg(null)}>{actionMsg.text}</Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Vouchers', value: vouchers.length, color: '#8b5cf6' },
          { label: 'Pending Approval', value: vouchers.filter(v => v.approval_status === 'Pending').length, color: '#f59e0b' },
          { label: 'Approved (AED)', value: `${(totalApproved / 1000).toFixed(0)}K`, color: '#22c55e' },
          { label: 'Pending (AED)', value: `${(totalPending / 1000).toFixed(0)}K`, color: '#ef4444' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Paper sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${kpi.color}30`, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>{kpi.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* New Voucher Form */}
      {showForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Typography variant="overline" sx={{ color: '#8b5cf6', fontWeight: 700, letterSpacing: 1.5, mb: 2, display: 'block' }}>New Payment Voucher</Typography>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Payee Name *" value={form.payee_name} onChange={e => setForm(f => ({ ...f, payee_name: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={3}>
              <TextField select fullWidth label="Payee Type" value={form.payee_type} onChange={e => setForm(f => ({ ...f, payee_type: e.target.value }))} sx={inputSx}>
                {PAYEE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField select fullWidth label="Payment Method" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} sx={inputSx}>
                {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Amount (AED) *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={8}><TextField fullWidth label="Purpose" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} sx={inputSx} /></Grid>
          </Grid>
          <Stack direction="row" spacing={2} mt={2.5} justifyContent="flex-end">
            <Button onClick={() => setShowForm(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />} onClick={handleSave} disabled={saving}
              sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2 }}>
              {saving ? 'Saving…' : 'Create Voucher'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Vouchers Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: '#8b5cf6' }} /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', textTransform: 'uppercase' } }}>
                <TableCell>Voucher #</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Payee Type</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount (AED)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Prepared By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>No payment vouchers yet</TableCell>
                </TableRow>
              ) : vouchers.map(v => (
                <TableRow key={v.voucher_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.2 }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                  <TableCell sx={{ color: '#8b5cf6', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>{v.voucher_number}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 500 }}>{v.payee_name}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.payee_type || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purpose || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.payment_method || '—'}</TableCell>
                  <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                    {parseFloat(v.amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={v.approval_status} color={statusColors[v.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>{v.prepared_by?.slice(0, 8) || '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {canApprove && v.approval_status === 'Pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" onClick={() => handleApprove(v.voucher_id)} disabled={actionLoading === v.voucher_id} sx={{ color: '#22c55e' }}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" onClick={() => handleReject(v.voucher_id)} disabled={actionLoading === v.voucher_id} sx={{ color: '#ef4444' }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PaymentVoucherEntry;
