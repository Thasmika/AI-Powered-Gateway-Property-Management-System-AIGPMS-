import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress, Alert, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Stack, IconButton, TextField, MenuItem, LinearProgress, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  Pending: 'warning', Paid: 'success', Overdue: 'error', Waived: 'default',
};

const LoanDetail: React.FC = () => {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();

  const [loan, setLoan] = useState<any>(null);
  const [instalments, setInstalments] = useState<any[]>([]);
  const [pdcIssued, setPdcIssued] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add instalment form
  const [addInstForm, setAddInstForm] = useState({ instalment_number: 1, due_date: '', principal_amount: '', interest_amount: '', total_amount: '', notes: '' });
  const [showInstForm, setShowInstForm] = useState(false);
  const [instSaving, setInstSaving] = useState(false);
  const [instError, setInstError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loanRes, instRes] = await Promise.all([
        api.get(`/loans/${loanId}`),
        api.get(`/loans/${loanId}/instalments`),
      ]);
      setLoan(loanRes.data);
      setInstalments(instRes.data);
      // Pre-fill next instalment number
      setAddInstForm(f => ({ ...f, instalment_number: instRes.data.length + 1 }));
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [loanId]);

  // Auto-calculate total
  useEffect(() => {
    const p = parseFloat(addInstForm.principal_amount) || 0;
    const i = parseFloat(addInstForm.interest_amount) || 0;
    setAddInstForm(f => ({ ...f, total_amount: (p + i).toFixed(2) }));
  }, [addInstForm.principal_amount, addInstForm.interest_amount]);

  const handleAddInstalment = async () => {
    if (!addInstForm.due_date || !addInstForm.total_amount) return setInstError('Due date and total amount are required');
    setInstSaving(true);
    setInstError(null);
    try {
      await api.post(`/loans/${loanId}/instalments`, {
        instalment_number: addInstForm.instalment_number,
        due_date: addInstForm.due_date,
        principal_amount: parseFloat(addInstForm.principal_amount) || 0,
        interest_amount: parseFloat(addInstForm.interest_amount) || 0,
        total_amount: parseFloat(addInstForm.total_amount),
        notes: addInstForm.notes,
      });
      setShowInstForm(false);
      fetchData();
    } catch (e: any) {
      setInstError(e.response?.data?.detail || 'Failed to add instalment');
    } finally {
      setInstSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}><CircularProgress sx={{ color: '#0ea5e9' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!loan) return null;

  const outstanding = parseFloat(loan.outstanding_balance || loan.principal_amount || 0);
  const principal = parseFloat(loan.principal_amount || 0);
  const repaidPct = principal > 0 ? ((principal - outstanding) / principal) * 100 : 0;
  const ltv = loan.loan_to_value_ratio ? parseFloat(loan.loan_to_value_ratio) : null;

  const totalInstalmentValue = instalments.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const paidInstalments = instalments.filter(i => i.status === 'Paid').length;

  const inputSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
  };

  const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="body2" sx={{ color: '#64748b', minWidth: 160 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/loans')} sx={{ color: '#94a3b8' }}><ArrowBackIcon /></IconButton>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AccountBalanceIcon sx={{ color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>{loan.loan_reference}</Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip size="small" label={loan.status} color={loan.status === 'Active' ? 'success' : 'default'} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            {loan.loan_type && <Chip size="small" label={loan.loan_type} sx={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', fontWeight: 600, fontSize: '0.7rem' }} />}
          </Stack>
        </Box>
        <Box sx={{ ml: 'auto' }}><PdfExportButton /></Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Loan Details */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
            <Typography variant="overline" sx={{ color: '#0ea5e9', fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: 'block' }}>Loan Details</Typography>
            <InfoRow label="Lender" value={loan.lender_name} />
            <InfoRow label="Loan Type" value={loan.loan_type} />
            <InfoRow label="Currency" value={loan.currency} />
            <InfoRow label="Start Date" value={loan.start_date ? formatDate(loan.start_date) : '—'} />
            <InfoRow label="End Date" value={loan.end_date ? formatDate(loan.end_date) : '—'} />
            <InfoRow label="Term" value={loan.loan_term_months ? `${loan.loan_term_months} months` : '—'} />
            <InfoRow label="Interest Rate" value={loan.interest_rate ? `${parseFloat(loan.interest_rate).toFixed(2)}% p.a.` : '—'} />
            <InfoRow label="Notes" value={loan.notes} />
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="overline" sx={{ color: '#0ea5e9', fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: 'block' }}>Financial Position</Typography>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>Repayment Progress</Typography>
                <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700 }}>{repaidPct.toFixed(1)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={repaidPct} sx={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #22c55e, #16a34a)' } }} />
            </Box>
            <Box sx={{ textAlign: 'center', py: 2, background: 'rgba(14,165,233,0.08)', borderRadius: 2, mb: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#0ea5e9' }}>
                AED {outstanding.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Outstanding Balance</Typography>
            </Box>
            <InfoRow label="Principal" value={`AED ${principal.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`} />
            {ltv != null && (
              <Box mt={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Loan-to-Value (LTV)</Typography>
                  <Typography variant="caption" sx={{ color: ltv > 75 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{ltv.toFixed(1)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(ltv, 100)}
                  sx={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: ltv > 75 ? '#ef4444' : '#22c55e' } }} />
                {ltv > 75 && <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5, display: 'block' }}>⚠ LTV exceeds 75% threshold</Typography>}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right: Instalment Schedule */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="overline" sx={{ color: '#0ea5e9', fontWeight: 700, letterSpacing: 1.2 }}>Instalment Schedule</Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  {paidInstalments}/{instalments.length} paid · AED {totalInstalmentValue.toLocaleString('en-AE', { minimumFractionDigits: 2 })} total
                </Typography>
              </Box>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setShowInstForm(!showInstForm)}
                sx={{ background: 'rgba(14,165,233,0.15)', color: '#0ea5e9', borderRadius: 1.5, '&:hover': { background: 'rgba(14,165,233,0.25)' } }}>
                Add Instalment
              </Button>
            </Box>

            {/* Add Instalment Form */}
            {showInstForm && (
              <Paper sx={{ p: 2, mb: 2, borderRadius: 1.5, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                {instError && <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>{instError}</Alert>}
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}><TextField size="small" fullWidth label="#" type="number" value={addInstForm.instalment_number} onChange={e => setAddInstForm(f => ({ ...f, instalment_number: parseInt(e.target.value) }))} sx={inputSx} /></Grid>
                  <Grid item xs={6} sm={3}><TextField size="small" fullWidth label="Due Date *" type="date" value={addInstForm.due_date} onChange={e => setAddInstForm(f => ({ ...f, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} sx={inputSx} /></Grid>
                  <Grid item xs={6} sm={2}><TextField size="small" fullWidth label="Principal" type="number" value={addInstForm.principal_amount} onChange={e => setAddInstForm(f => ({ ...f, principal_amount: e.target.value }))} sx={inputSx} /></Grid>
                  <Grid item xs={6} sm={2}><TextField size="small" fullWidth label="Interest" type="number" value={addInstForm.interest_amount} onChange={e => setAddInstForm(f => ({ ...f, interest_amount: e.target.value }))} sx={inputSx} /></Grid>
                  <Grid item xs={12} sm={2}><TextField size="small" fullWidth label="Total *" value={addInstForm.total_amount} InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiInputBase-root': { ...inputSx['& .MuiInputBase-root'], fontWeight: 700 } }} /></Grid>
                </Grid>
                <Stack direction="row" spacing={1} mt={1.5} justifyContent="flex-end">
                  <Button size="small" onClick={() => setShowInstForm(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                  <Button size="small" variant="contained" onClick={handleAddInstalment} disabled={instSaving}
                    startIcon={<SaveIcon />}
                    sx={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', borderRadius: 1.5 }}>
                    {instSaving ? 'Saving…' : 'Add'}
                  </Button>
                </Stack>
              </Paper>
            )}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Principal</TableCell>
                    <TableCell align="right">Interest</TableCell>
                    <TableCell align="right">Total (AED)</TableCell>
                    <TableCell>PDC Issued</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instalments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: '#64748b' }}>No instalments. Click "Add Instalment" to build the schedule.</TableCell></TableRow>
                  ) : instalments.map(inst => (
                    <TableRow key={inst.instalment_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 } }}>
                      <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>{inst.instalment_number}</TableCell>
                      <TableCell sx={{ color: '#e2e8f0' }}>{inst.due_date ? formatDate(inst.due_date) : '—'}</TableCell>
                      <TableCell align="right" sx={{ color: '#94a3b8' }}>
                        {parseFloat(inst.principal_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#94a3b8' }}>
                        {parseFloat(inst.interest_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
                        {parseFloat(inst.total_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {inst.pdc_issued_id ? (
                          <Chip size="small" icon={<LinkIcon />} label="PDC Linked" color="info" sx={{ fontSize: '0.68rem', cursor: 'pointer' }} onClick={() => navigate(`/pdc-issued/${inst.pdc_issued_id}`)} />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#475569' }}>Not linked</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={inst.status} color={statusColors[inst.status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoanDetail;
