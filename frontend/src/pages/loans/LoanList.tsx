import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Alert, IconButton,
  Tooltip, TextField, MenuItem, Grid, Stack, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  Active: 'success', Closed: 'default', Restructured: 'warning', Defaulted: 'error',
};

const LoanList: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [form, setForm] = useState({ lender_name: '', principal_amount: '', loan_type: '', status: 'Active', start_date: '', end_date: '', interest_rate: '', loan_term_months: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/loans', { params });
      setLoans(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [filterStatus]);

  const totalOutstanding = loans.reduce((s, l) => s + parseFloat(l.outstanding_balance || l.principal_amount || 0), 0);
  const activeCount = loans.filter(l => l.status === 'Active').length;

  const handleSave = async () => {
    if (!form.lender_name || !form.principal_amount) return setFormError('Lender name and principal amount are required');
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/loans', {
        ...form,
        principal_amount: parseFloat(form.principal_amount),
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
        loan_term_months: form.loan_term_months ? parseInt(form.loan_term_months) : null,
      });
      setAddDialogOpen(false);
      setForm({ lender_name: '', principal_amount: '', loan_type: '', status: 'Active', start_date: '', end_date: '', interest_rate: '', loan_term_months: '', notes: '' });
      fetchLoans();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  };

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
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalanceIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>Loan Register</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {activeCount} active · AED {totalOutstanding.toLocaleString('en-AE', { minimumFractionDigits: 2 })} outstanding
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="Loan Register" />
          <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          New Loan
        </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Loans', value: loans.length, color: '#6366f1' },
          { label: 'Active Loans', value: activeCount, color: '#22c55e' },
          { label: 'Total Outstanding', value: `AED ${(totalOutstanding / 1000000).toFixed(2)}M`, color: '#f59e0b' },
          { label: 'Closed Loans', value: loans.filter(l => l.status === 'Closed').length, color: '#94a3b8' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Paper sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${kpi.color}30`, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>{kpi.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterListIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600} sx={{ color: '#94a3b8' }}>Filter</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={inputSx}>
              <MenuItem value="">All</MenuItem>
              {['Active', 'Closed', 'Restructured', 'Defaulted'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button onClick={() => setFilterStatus('')} size="small" sx={{ color: '#64748b' }}>Clear</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: '#0ea5e9' }} /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', textTransform: 'uppercase' } }}>
                <TableCell>Reference</TableCell>
                <TableCell>Lender</TableCell>
                <TableCell>Loan Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell align="right">Principal (AED)</TableCell>
                <TableCell align="right">Outstanding (AED)</TableCell>
                <TableCell align="right">LTV %</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>No loans found. Click "New Loan" to add one.</TableCell>
                </TableRow>
              ) : loans.map(loan => {
                const ltv = loan.loan_to_value_ratio ? parseFloat(loan.loan_to_value_ratio) : null;
                return (
                  <TableRow
                    key={loan.loan_id}
                    sx={{ '&:hover': { background: 'rgba(14,165,233,0.06)' }, cursor: 'pointer', '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.3 } }}
                    onClick={() => navigate(`/loans/${loan.loan_id}`)}
                  >
                    <TableCell sx={{ color: '#0ea5e9', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>{loan.loan_reference}</TableCell>
                    <TableCell sx={{ color: '#e2e8f0', fontWeight: 500 }}>{loan.lender_name}</TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>{loan.loan_type || '—'}</TableCell>
                    <TableCell sx={{ color: '#94a3b8' }}>{loan.start_date ? formatDate(loan.start_date) : '—'}</TableCell>
                    <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 500 }}>
                      {parseFloat(loan.principal_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                      {parseFloat(loan.outstanding_balance || loan.principal_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">
                      {ltv != null ? (
                        <Box>
                          <Typography variant="body2" sx={{ color: ltv > 75 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{ltv.toFixed(1)}%</Typography>
                          <LinearProgress variant="determinate" value={Math.min(ltv, 100)} sx={{ height: 4, borderRadius: 2, mt: 0.3, '& .MuiLinearProgress-bar': { background: ltv > 75 ? '#ef4444' : '#22c55e' } }} />
                        </Box>
                      ) : <Typography sx={{ color: '#475569' }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={loan.status} color={statusColors[loan.status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <Tooltip title="View Detail">
                        <IconButton size="small" onClick={() => navigate(`/loans/${loan.loan_id}`)} sx={{ color: '#0ea5e9' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Loan Inline Form */}
      {addDialogOpen && (
        <Paper sx={{ mt: 3, p: 3, borderRadius: 2, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.25)' }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#0ea5e9', mb: 2 }}>New Loan</Typography>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Lender Name *" value={form.lender_name} onChange={e => setForm(f => ({ ...f, lender_name: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Loan Type" value={form.loan_type} onChange={e => setForm(f => ({ ...f, loan_type: e.target.value }))} sx={inputSx}>
                {['Mortgage', 'Personal', 'Corporate', 'Islamic', 'Other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Principal Amount (AED) *" type="number" value={form.principal_amount} onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Interest Rate (% p.a.)" type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Loan Term (Months)" type="number" value={form.loan_term_months} onChange={e => setForm(f => ({ ...f, loan_term_months: e.target.value }))} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} sx={inputSx}>
                {['Active', 'Closed', 'Restructured', 'Defaulted'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} sx={inputSx} /></Grid>
          </Grid>
          <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
            <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', fontWeight: 600, borderRadius: 2 }}>
              {saving ? 'Saving…' : 'Create Loan'}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default LoanList;
