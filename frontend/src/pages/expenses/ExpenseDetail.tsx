import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress, Alert, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Stack, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, LinearProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachmentIcon from '@mui/icons-material/Attachment';
import PieChartIcon from '@mui/icons-material/PieChart';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';
import PaymentVoucherDialog, { fmtAmount } from '../../components/PaymentVoucherDialog';
import { printPaymentVoucher } from '../../utils/printVoucher';
import PostAddIcon from '@mui/icons-material/PostAdd';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'warning', Approved: 'success', Rejected: 'error', 'On Hold': 'info',
};

const classColor: Record<string, string> = { General: '#6366f1', Property: '#f59e0b' };

const ExpenseDetail: React.FC = () => {
  const { expenseId } = useParams<{ expenseId: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pvOpen, setPvOpen] = useState(false);
  const [pvEditing, setPvEditing] = useState<any | null>(null);

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses/${expenseId}`);
      setExpense(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load expense');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpense(); }, [expenseId]);

  const canApprove = role === 'Managing Director' || role === 'Administrator';
  const canModify = ['Managing Director', 'Accountant', 'Administrator'].includes(role || '');

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/expenses/${expenseId}/approve`, { reason: 'Approved by ' + user?.username });
      setActionMsg({ type: 'success', text: 'Expense approved successfully' });
      fetchExpense();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/expenses/${expenseId}/reject`, { reason: rejectReason });
      setActionMsg({ type: 'success', text: 'Expense rejected' });
      setRejectDialogOpen(false);
      fetchExpense();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}><CircularProgress sx={{ color: '#6366f1' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!expense) return null;

  const totalAmt = parseFloat(expense.total_amount || 0);
  const paidPct = totalAmt > 0 ? Math.min(100, (parseFloat(expense.paid_amount || 0) / totalAmt) * 100) : 0;

  const InfoRow: React.FC<{ label: string; value: React.ReactNode; align?: 'left' | 'right'; pdfBlank?: boolean }> = ({ label, value, align = 'right', pdfBlank = false }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Typography variant="body2" sx={{ color: '#64748b', minWidth: 160 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500, textAlign: align, flex: 1 }}>{pdfBlank ? <span data-pdf-blank>{value || '—'}</span> : (value || '—')}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/expenses')} sx={{ color: '#94a3b8' }}><ArrowBackIcon /></IconButton>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `linear-gradient(135deg, ${classColor[expense.expense_class]}, ${classColor[expense.expense_class]}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptLongIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>{expense.expense_reference}</Typography>
            <Stack direction="row" spacing={1} mt={0.5}>
              <Chip size="small" label={expense.expense_class} sx={{ background: `${classColor[expense.expense_class]}20`, color: classColor[expense.expense_class], fontWeight: 700, fontSize: '0.7rem' }} />
              <Chip size="small" label={expense.approval_status} color={statusColors[expense.approval_status] || 'default'} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
              {expense.is_shared && <Chip size="small" label="Shared" color="info" sx={{ fontSize: '0.68rem' }} />}
            </Stack>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <PdfExportButton />
        {canApprove && expense.approval_status === 'Pending' && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleApprove}
              disabled={actionLoading}
              sx={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', fontWeight: 600, borderRadius: 2 }}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => setRejectDialogOpen(true)}
              disabled={actionLoading}
              sx={{ color: '#ef4444', borderColor: '#ef4444', fontWeight: 600, borderRadius: 2 }}
            >
              Reject
            </Button>
          </Stack>
        )}
        </Stack>
      </Box>

      {actionMsg && (
        <Alert severity={actionMsg.type} sx={{ mb: 2 }} onClose={() => setActionMsg(null)}>{actionMsg.text}</Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
            <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: 'block' }}>Expense Information</Typography>
            <InfoRow align="left" label="Payee / Supplier" value={expense.payee_name} />
            <InfoRow align="left" label="Description" value={expense.description} />
            <InfoRow align="left" label="Invoice Date" value={expense.invoice_date ? formatDate(expense.invoice_date) : '—'} />
            <InfoRow align="left" label="Invoice Number" value={expense.invoice_number} />
            <InfoRow align="left" label="Payment Method" value={expense.payment_method} />
            {expense.payment_voucher_ref && <InfoRow align="left" label="Legacy PV Ref" value={expense.payment_voucher_ref} />}
            {expense.expense_class === 'Property' && (
              <>
                <InfoRow align="left" label="Property ID" value={expense.property_id} />
                <InfoRow align="left" label="Unit ID" value={expense.unit_id} />
                <InfoRow align="left" label="Maintenance Ticket" value={expense.maintenance_ticket_id} />
                <InfoRow align="left" label="LPO Reference" value={expense.lpo_id} />
              </>
            )}
            <InfoRow align="left" label="Notes" value={expense.notes} />
          </Paper>

          {/* Allocation Table */}
          {expense.is_shared && expense.allocations && expense.allocations.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PieChartIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="overline" sx={{ color: '#f59e0b', fontWeight: 700, letterSpacing: 1.2 }}>Shared Allocation Breakdown</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                      <TableCell>Property</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expense.allocations.map((alloc: any) => (
                      <TableRow key={alloc.allocation_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                        <TableCell sx={{ color: '#e2e8f0' }}>{alloc.property_id || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={alloc.allocation_method} sx={{ fontSize: '0.68rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} />
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#e2e8f0' }}>
                          {alloc.allocation_percentage != null ? `${parseFloat(alloc.allocation_percentage).toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                          {alloc.allocation_amount != null ? `AED ${parseFloat(alloc.allocation_amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>

        {/* Right Column — Financials & Status */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
            <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: 'block' }}>Financial Summary</Typography>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" fontWeight={800} sx={{ color: '#e2e8f0', letterSpacing: -1 }}>
                AED {parseFloat(expense.total_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Total Amount</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 2 }} />
            <InfoRow label="Base Amount" value={`AED ${parseFloat(expense.amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`} />
            <InfoRow label="Tax Amount" value={`AED ${parseFloat(expense.tax_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`} />
            <InfoRow label={`Paid (${expense.voucher_count || 0} PV)`} value={`AED ${fmtAmount(expense.paid_amount)}`} />
            <InfoRow label="Balance" value={`AED ${fmtAmount(expense.balance_amount)}`} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.5}>
              <Chip size="small" label={expense.payment_status}
                color={expense.payment_status === 'Paid' ? 'success' : expense.payment_status === 'Partially Paid' ? 'warning' : 'error'}
                sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
              <Typography variant="caption" sx={{ color: '#64748b' }}>{paidPct.toFixed(0)}% paid</Typography>
            </Box>
            <LinearProgress variant="determinate" value={paidPct}
              sx={{ mt: 0.8, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: '#22c55e' } }} />
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.2, mb: 1.5, display: 'block' }}>Approval Workflow</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {['Created', 'Pending Review', 'Approved / Rejected'].map((step, i) => {
                const isActive =
                  (i === 0) ||
                  (i === 1 && expense.approval_status === 'Pending') ||
                  (i === 2 && ['Approved', 'Rejected'].includes(expense.approval_status));
                return (
                  <Box key={step} display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.07)', flexShrink: 0 }}>
                      <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{i + 1}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: isActive ? '#e2e8f0' : '#475569', fontWeight: isActive ? 600 : 400 }}>{step}</Typography>
                  </Box>
                );
              })}
            </Box>
            {expense.approved_by && (
              <Box mt={2} pt={2} sx={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <InfoRow pdfBlank label="Approved/Rejected By" value={expense.approved_by} />
                <InfoRow label="Action At" value={expense.approved_at ? formatDate(expense.approved_at) : '—'} />
              </Box>
            )}
            <Box mt={2} pt={2} sx={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <InfoRow pdfBlank label="Created By" value={expense.created_by} />
              <InfoRow label="Created At" value={expense.created_at ? formatDate(expense.created_at) : '—'} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Payment Vouchers issued under this expense */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.25)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="overline" sx={{ color: '#8b5cf6', fontWeight: 700, letterSpacing: 1.2 }}>
            Payment Vouchers ({expense.voucher_count || 0})
          </Typography>
          {canModify && parseFloat(expense.balance_amount || 0) > 0 && (
            <Button size="small" variant="contained" startIcon={<PostAddIcon />} data-pdf-ignore
              onClick={() => { setPvEditing(null); setPvOpen(true); }}
              sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2 }}>
              Add Payment Voucher
            </Button>
          )}
        </Box>
        {(expense.payment_vouchers || []).length === 0 ? (
          <Typography variant="body2" sx={{ color: '#64748b' }}>No payment vouchers issued for this expense yet.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                  <TableCell>No</TableCell>
                  <TableCell>Voucher #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Payee</TableCell>
                  <TableCell>Paid From</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount (AED)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center" data-pdf-ignore>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expense.payment_vouchers.map((v: any, i: number) => (
                  <TableRow key={v.voucher_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' } }}>
                    <TableCell sx={{ color: '#64748b !important' }}>{i + 1}</TableCell>
                    <TableCell sx={{ color: '#a78bfa !important', fontFamily: 'monospace', fontWeight: 600 }}>{v.voucher_number}</TableCell>
                    <TableCell>{v.created_at ? formatDate(v.created_at) : '—'}</TableCell>
                    <TableCell>{v.payee_name}</TableCell>
                    <TableCell>{v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '—'}</TableCell>
                    <TableCell>{v.payment_method || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtAmount(v.amount)}</TableCell>
                    <TableCell><Chip size="small" label={v.approval_status} color={statusColors[v.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.68rem' }} /></TableCell>
                    <TableCell align="center" data-pdf-ignore>
                      <Tooltip title="Print"><IconButton size="small" onClick={() => printPaymentVoucher(v)} sx={{ color: '#22c55e' }}><PrintIcon fontSize="small" /></IconButton></Tooltip>
                      {canModify && (
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => { setPvEditing(v); setPvOpen(true); }} sx={{ color: '#f59e0b' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <PaymentVoucherDialog
        open={pvOpen}
        expense={expense}
        voucher={pvEditing}
        onClose={() => setPvOpen(false)}
        onSaved={(pv, isEdit) => {
          setPvOpen(false);
          setActionMsg({ type: 'success', text: isEdit ? `Payment voucher ${pv.voucher_number} updated` : `Payment voucher ${pv.voucher_number} issued` });
          fetchExpense();
        }}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' } }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Reject Expense</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth autoFocus multiline rows={3}
            label="Rejection Reason *"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            sx={{ mt: 1, '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }, '& label': { color: '#94a3b8' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} variant="contained"
            sx={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', fontWeight: 600 }}>
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseDetail;
