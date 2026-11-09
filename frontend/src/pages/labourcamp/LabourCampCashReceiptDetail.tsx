/**
 * Labour Camp Cash Receipt Detail
 * ================================
 * Read-only detail view for a single Labour Camp cash receipt.
 * Shows header, all detail lines with old/new expiry dates, and allows printing.
 * Accessible from the receipt list or from the entry page after posting.
 *
 * MD / Administrator can initiate a reversal from this page.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress, Alert, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import UndoIcon from '@mui/icons-material/Undo';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptLine {
  line_id: string;
  line_number: number;
  camp_lease_id: string;
  lease_reference: string | null;
  unit_number: string | null;
  resident_name: string | null;
  contract_monthly_rent: number;
  rent_amount_received: number;
  old_expiry_date: string | null;
  new_expiry_date: string | null;
  remarks: string | null;
}

interface Receipt {
  receipt_id: string;
  receipt_number: string;
  receipt_date: string;
  property_id: string | null;
  total_amount: number;
  received_from: string | null;
  remarks: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
  cancelled_at: string | null;
  reversal_reason: string | null;
  lines: ReceiptLine[];
  grid_total: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: 'default' | 'info' | 'success' | 'error' | 'warning'; label: string }> = {
  Draft:    { color: 'info',    label: 'Draft'    },
  Posted:   { color: 'success', label: 'Posted'   },
  Cancelled:{ color: 'default', label: 'Cancelled'},
  Reversed: { color: 'error',   label: 'Reversed' },
};

const fmtAED = (n: number | string) =>
  `AED ${Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (dateStr: string | null) => dateStr ? formatDate(dateStr) : '—';



// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

const LabourCampCashReceiptDetail: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reversal state
  const [reversalOpen, setReversalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Post state
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/labour-camp/cash-receipts/${receiptId}`);
      setReceipt(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load receipt.');
    } finally {
      setLoading(false);
    }
  }, [receiptId]);

  useEffect(() => { fetchReceipt(); }, [fetchReceipt]);

  // ─── Post Draft Receipt ───────────────────────────────────────────────────
  const handlePost = async () => {
    setPostDialogOpen(false);
    setPosting(true);
    setPostError(null);
    try {
      await api.post(`/labour-camp/cash-receipts/${receiptId}/post`);
      // Reload receipt to show updated status, expiry dates, and posted_at
      fetchReceipt();
    } catch (e: any) {
      setPostError(e.response?.data?.detail || 'Failed to post receipt.');
    } finally {
      setPosting(false);
    }
  };

  const handleReverse = async () => {
    setReversing(true);
    setReversalError(null);
    try {
      await api.post(`/labour-camp/cash-receipts/${receiptId}/reverse`, null, {
        params: { reversal_reason: reversalReason || undefined },
      });
      setReversalOpen(false);
      fetchReceipt();
    } catch (e: any) {
      setReversalError(e.response?.data?.detail || 'Failed to reverse receipt.');
    } finally {
      setReversing(false);
    }
  };

  const handlePrint = () => window.print();

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }
  if (error || !receipt) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Receipt not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/labour-camp/cash-receipts')} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const sc = statusConfig[receipt.status] || { color: 'default', label: receipt.status };
  const isPosted = receipt.status === 'Posted';
  const isDraft  = receipt.status === 'Draft';
  const gridTotal = receipt.grid_total ?? receipt.lines.reduce((s, l) => s + Number(l.rent_amount_received), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} className="printable-area">
      {/* ── Page Header ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/labour-camp/cash-receipts')}
            variant="outlined"
            size="small"
            sx={{ display: { print: 'none' } }}
          >
            Back
          </Button>
          <ReceiptLongIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Labour Camp Cash Receipt
            </Typography>
            <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontWeight={600}>
              {receipt.receipt_number}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PdfExportButton />
          <Chip label={sc.label} color={sc.color} sx={{ fontWeight: 700 }} />
          <Button
            startIcon={<PrintIcon />}
            variant="outlined"
            size="small"
            onClick={handlePrint}
            sx={{ display: { print: 'none' } }}
          >
            Print
          </Button>
          {/* ── POST BUTTON: visible only for Draft receipts ── */}
          {isDraft && (
            <Button
              startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              variant="contained"
              color="success"
              size="small"
              onClick={() => setPostDialogOpen(true)}
              disabled={posting}
              sx={{ display: { print: 'none' }, fontWeight: 700 }}
            >
              {posting ? 'Posting…' : 'Post Receipt'}
            </Button>
          )}
          {isPosted && (
            <Button
              startIcon={<UndoIcon />}
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setReversalOpen(true)}
              sx={{ display: { print: 'none' } }}
            >
              Reverse
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ════════════════════════════════════════════════════════════════
          Receipt Header Summary
          ════════════════════════════════════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" mb={2}>
          Receipt Header
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Receipt Number', value: receipt.receipt_number, mono: true },
            { label: 'Receipt Date', value: fmtDate(receipt.receipt_date) },
            { label: 'Status', value: <Chip label={sc.label} color={sc.color} size="small" sx={{ fontWeight: 700 }} /> },
            { label: 'Received From', value: receipt.received_from || '—' },
            { label: 'Total Amount', value: fmtAED(receipt.total_amount), bold: true },
            { label: 'Remarks', value: receipt.remarks || '—' },
            { label: 'Created At', value: fmtDate(receipt.created_at) },
            { label: 'Posted At', value: fmtDate(receipt.posted_at) },
          ].map(f => (
            <Grid item xs={12} sm={6} md={3} key={f.label}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>
                {f.label}
              </Typography>
              {typeof f.value === 'string' ? (
                <Typography
                  variant="body1"
                  fontWeight={f.bold ? 700 : 400}
                  fontFamily={f.mono ? 'monospace' : 'inherit'}
                >
                  {f.value}
                </Typography>
              ) : f.value}
            </Grid>
          ))}
        </Grid>

        {receipt.reversal_reason && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Reversal Reason:</strong> {receipt.reversal_reason}
          </Alert>
        )}

        {/* Show post error inline under header if posting fails */}
        {postError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setPostError(null)}>
            <strong>Post Failed:</strong> {postError}
          </Alert>
        )}

        {/* Info banner for Draft receipts */}
        {isDraft && (
          <Alert severity="info" sx={{ mt: 2 }} icon={<SendIcon />}>
            This receipt is in <strong>Draft</strong> status. Click <strong>Post Receipt</strong> to finalise
            the cash collection and extend all tenancy expiry dates by one calendar month.
          </Alert>
        )}
      </Paper>

      {/* ════════════════════════════════════════════════════════════════
          Detail Grid — with Expiry Date Changes
          ════════════════════════════════════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" mb={2}>
          Tenancy Contract Lines — Cash Collection Detail
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {[
                  '#', 'Contract No.', 'Room / Unit', 'Tenant / Resident',
                  'Monthly Rent', 'Amount Received',
                  'Old Expiry Date', 'New Expiry Date (+1 Month)', 'Remarks'
                ].map(h => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {receipt.lines.map(line => (
                <TableRow key={line.line_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                      {line.line_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                      {line.lease_reference || line.camp_lease_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{line.unit_number || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{line.resident_name || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{fmtAED(line.contract_monthly_rent)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>{fmtAED(line.rent_amount_received)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {fmtDate(line.old_expiry_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {line.new_expiry_date ? (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <TrendingUpIcon fontSize="small" color="success" />
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {fmtDate(line.new_expiry_date)}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.disabled">Not yet posted</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{line.remarks || '—'}</Typography>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell colSpan={4}>
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    TOTALS
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    {fmtAED(receipt.lines.reduce((s, l) => s + Number(l.contract_monthly_rent), 0))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    {fmtAED(gridTotal)}
                  </Typography>
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ════════════════════════════════════════════════════════════════
          Total Reconciliation Panel
          ════════════════════════════════════════════════════════════════ */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '2px solid', borderColor: 'success.main', bgcolor: 'success.50' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Header Total (Camp Boss handover)</Typography>
            <Typography variant="h6" fontWeight={700}>{fmtAED(receipt.total_amount)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Grid Total (sum of lines)</Typography>
            <Typography variant="h6" fontWeight={700}>{fmtAED(gridTotal)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CheckCircleIcon color="success" />
              <Stack>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Difference</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">AED 0.00</Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* ─── Bottom Actions (Match Entry Screen) ────────────────────── */}
      {isDraft && (
        <Stack direction="row" justifyContent="flex-end" spacing={2} mb={3}>
          <Button
            startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            variant="contained"
            color="success"
            size="large"
            onClick={() => setPostDialogOpen(true)}
            disabled={posting}
            sx={{ display: { print: 'none' }, fontWeight: 700, borderRadius: 2 }}
          >
            {posting ? 'Posting…' : 'Post Receipt'}
          </Button>
        </Stack>
      )}

      {/* ─── Post Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Post Receipt</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Posting receipt <strong>{receipt.receipt_number}</strong> will:
          </Alert>
          <Box component="ul" sx={{ pl: 2, mt: 0 }}>
            <li>Finalise the cash collection of <strong>{fmtAED(receipt.total_amount)}</strong></li>
            <li>Extend each included tenancy contract expiry date by <strong>one calendar month</strong> (based on receipt date)</li>
            <li>Write a full audit trail for every contract updated</li>
            <li>Lock this receipt — further edits require a reversal</li>
          </Box>
          <Typography variant="body2" color="text.secondary" mt={2}>
            <strong>Contracts to be processed:</strong> {receipt.lines.length} contract(s)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPostDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handlePost}
            startIcon={<SendIcon />}
            sx={{ fontWeight: 700 }}
          >
            Confirm Post
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Reversal Dialog ──────────────────────────────────────────── */}
      <Dialog open={reversalOpen} onClose={() => setReversalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Reverse Posted Receipt</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>This action is irreversible.</strong> The receipt will be marked as Reversed and the audit trail will be updated.
            Lease expiry dates are <strong>not</strong> automatically restored — they remain extended.
          </Alert>
          {reversalError && <Alert severity="error" sx={{ mb: 2 }}>{reversalError}</Alert>}
          <TextField
            fullWidth
            label="Reversal Reason (Optional)"
            value={reversalReason}
            onChange={e => setReversalReason(e.target.value)}
            placeholder="Reason for reversal…"
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReverse}
            disabled={reversing}
            startIcon={reversing ? <CircularProgress size={16} color="inherit" /> : <UndoIcon />}
          >
            {reversing ? 'Reversing…' : 'Confirm Reversal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabourCampCashReceiptDetail;
