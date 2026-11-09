/**
 * Labour Camp Cash Receipt Entry
 * ===============================
 * Module 11 — Labour Camp Management / Rental Collection
 * Technical Instruction Sheet: Labour Camp Cash Collection / Cash Receipt Entry
 *
 * Two views:
 *   1. Register (list of all receipts)
 *   2. Entry form (create new draft / view existing)
 *
 * Key business rules enforced in UI:
 *   - Contract combo box loads ONLY Labour Camp leases
 *   - Monthly Rent auto-populates and is read-only
 *   - Duplicate contract detection before API call
 *   - Live Header Total vs Grid Total footer (with colour)
 *   - POST button disabled when totals mismatch
 *   - Posted receipts are fully read-only
 */

import React, { useEffect, useState, useCallback } from 'react';
import { formatDate } from '../../utils/dateUtils';
import {
  Box, Typography, Paper, Grid, Button, Chip, CircularProgress, Alert,
  Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, MenuItem, Tooltip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampLease {
  lease_id: string;
  lease_reference: string;
  unit_number: string;
  resident_name: string;
  monthly_rate: number;
  end_date: string | null;
  status: string;
}

interface ReceiptLine {
  id: string; // client-side UUID for React keys
  camp_lease_id: string;
  lease_reference: string;
  unit_number: string;
  resident_name: string;
  contract_monthly_rent: number;
  rent_amount_received: string; // string for controlled input
  current_expiry_date: string | null;
  remarks: string;
}

interface ReceiptListItem {
  receipt_id: string;
  receipt_number: string;
  receipt_date: string;
  total_amount: number;
  received_from: string | null;
  status: string;
  line_count: number;
  created_at: string;
  posted_at: string | null;
}

// ─── Status Chips ─────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: 'default' | 'info' | 'success' | 'error' | 'warning'; label: string }> = {
  Draft:    { color: 'info',    label: 'Draft'    },
  Posted:   { color: 'success', label: 'Posted'   },
  Cancelled:{ color: 'default', label: 'Cancelled'},
  Reversed: { color: 'error',   label: 'Reversed' },
};

const fmtAED = (n: number | string) =>
  `AED ${Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayStr = () => new Date().toISOString().split('T')[0];

let _lineCounter = 0;
const nextId = () => `line-${++_lineCounter}`;

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

const LabourCampCashReceipt: React.FC = () => {
  const navigate = useNavigate();

  // ── View State ────────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'entry'>('list');
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  // ── List State ────────────────────────────────────────────────────────────
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  // ── Lease Combo Data ──────────────────────────────────────────────────────
  const [availableLeases, setAvailableLeases] = useState<CampLease[]>([]);
  const [leasesLoading, setLeasesLoading] = useState(false);

  // ── Entry Form State ──────────────────────────────────────────────────────
  const [receiptDate, setReceiptDate] = useState(todayStr());
  const [totalAmount, setTotalAmount] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('Draft');

  // ── Confirmation Dialog ───────────────────────────────────────────────────
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [deleteReceiptNum, setDeleteReceiptNum] = useState<string>('');

  // ─── Derived Values ───────────────────────────────────────────────────────
  const gridTotal = lines.reduce((sum, ln) => sum + (parseFloat(ln.rent_amount_received) || 0), 0);
  const headerTotal = parseFloat(totalAmount) || 0;
  const difference = gridTotal - headerTotal;
  // Only "match" when there is actual data — empty form should show neutral, not green
  const hasContent = lines.length > 0 && headerTotal > 0;
  const totalsMatch = hasContent && Math.abs(difference) < 0.01;
  const isReadOnly = currentStatus !== 'Draft' || Boolean(editingReceiptId && currentStatus === 'Posted');
  const canPost = !isReadOnly && totalsMatch && lines.length > 0 && headerTotal > 0 && receiptDate;

  // ─── Fetch List ───────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/labour-camp/cash-receipts', { params });
      setReceipts(res.data);
    } catch (e: any) {
      setListError(e.response?.data?.detail || 'Failed to load receipts.');
    } finally {
      setListLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ─── Fetch Leases for Combo Box ───────────────────────────────────────────
  const fetchLeases = async () => {
    setLeasesLoading(true);
    try {
      // include_expired=true: show all non-terminated Labour Camp leases so
      // monthly-renewable contracts near/past expiry still appear in the list
      const res = await api.get('/labour-camp/cash-receipts/leases', {
        params: { include_expired: true },
      });
      setAvailableLeases(res.data);
    } catch {
      setAvailableLeases([]);
    } finally {
      setLeasesLoading(false);
    }
  };

  // ─── Open New Entry Form ──────────────────────────────────────────────────
  const openNewEntry = () => {
    setEditingReceiptId(null);
    setReceiptDate(todayStr());
    setTotalAmount('');
    setReceivedFrom('');
    setRemarks('');
    setLines([]);
    setFormError(null);
    setSuccessMsg(null);
    setCurrentStatus('Draft');
    fetchLeases();
    setView('entry');
  };

  // ─── Open Existing Receipt (read-only for Posted) ─────────────────────────
  const openDetail = (id: string) => {
    navigate(`/labour-camp/cash-receipts/${id}`);
  };

  // ─── Delete Draft Receipt ─────────────────────────────────────────────────
  const handleDeleteReceipt = async () => {
    if (!deleteReceiptId) return;
    try {
      await api.delete(`/labour-camp/cash-receipts/${deleteReceiptId}`);
      setDeleteReceiptId(null);
      fetchList();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete receipt.');
      setDeleteReceiptId(null);
    }
  };

  // ─── Add Detail Line ──────────────────────────────────────────────────────
  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: nextId(),
        camp_lease_id: '',
        lease_reference: '',
        unit_number: '',
        resident_name: '',
        contract_monthly_rent: 0,
        rent_amount_received: '',
        current_expiry_date: null,
        remarks: '',
      },
    ]);
  };

  // ─── Remove Detail Line ───────────────────────────────────────────────────
  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(ln => ln.id !== lineId));
  };

  // ─── Select Contract from Combo Box ──────────────────────────────────────
  const handleLeaseSelect = (lineId: string, lease: CampLease | null) => {
    if (!lease) {
      setLines(prev => prev.map(ln =>
        ln.id === lineId
          ? { ...ln, camp_lease_id: '', lease_reference: '', unit_number: '', resident_name: '', contract_monthly_rent: 0, current_expiry_date: null }
          : ln
      ));
      return;
    }

    // Block duplicate contract selection
    const alreadyUsed = lines.some(ln => ln.id !== lineId && ln.camp_lease_id === lease.lease_id);
    if (alreadyUsed) {
      setFormError(`Contract ${lease.lease_reference} is already in this receipt. Each contract may appear only once.`);
      return;
    }
    setFormError(null);

    setLines(prev => prev.map(ln =>
      ln.id === lineId
        ? {
            ...ln,
            camp_lease_id: lease.lease_id,
            lease_reference: lease.lease_reference,
            unit_number: lease.unit_number,
            resident_name: lease.resident_name,
            contract_monthly_rent: lease.monthly_rate,
            current_expiry_date: lease.end_date,
            // Default received amount to monthly rent
            rent_amount_received: ln.rent_amount_received || String(lease.monthly_rate),
          }
        : ln
    ));
  };

  // ─── Update Received Amount ───────────────────────────────────────────────
  const handleAmountChange = (lineId: string, value: string) => {
    setLines(prev => prev.map(ln =>
      ln.id === lineId ? { ...ln, rent_amount_received: value } : ln
    ));
  };

  // ─── Update Line Remarks ──────────────────────────────────────────────────
  const handleLineRemarks = (lineId: string, value: string) => {
    setLines(prev => prev.map(ln =>
      ln.id === lineId ? { ...ln, remarks: value } : ln
    ));
  };

  // ─── Save Draft ───────────────────────────────────────────────────────────
  const saveDraft = async () => {
    setFormError(null);
    setSuccessMsg(null);

    if (!receiptDate) { setFormError('Receipt Date is required.'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { setFormError('Total Amount must be greater than zero.'); return; }
    if (lines.length === 0) { setFormError('At least one tenancy contract line is required.'); return; }

    const unselected = lines.find(ln => !ln.camp_lease_id);
    if (unselected) { setFormError('All lines must have a Tenancy Contract selected.'); return; }
    const zeroAmount = lines.find(ln => !(parseFloat(ln.rent_amount_received) > 0));
    if (zeroAmount) { setFormError('All Rent Amount Received values must be greater than zero.'); return; }

    if (!totalsMatch) {
      setFormError(
        `Header Total (${fmtAED(headerTotal)}) does not match Grid Total (${fmtAED(gridTotal)}). ` +
        `Difference: ${fmtAED(Math.abs(difference))}. Please verify before saving.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        receipt_date: receiptDate,
        total_amount: parseFloat(totalAmount),
        received_from: receivedFrom || null,
        remarks: remarks || null,
        lines: lines.map(ln => ({
          camp_lease_id: ln.camp_lease_id,
          rent_amount_received: parseFloat(ln.rent_amount_received),
          remarks: ln.remarks || null,
        })),
      };
      const res = await api.post('/labour-camp/cash-receipts', payload);
      setEditingReceiptId(res.data.receipt_id);
      setCurrentStatus('Draft');
      setSuccessMsg(`Receipt ${res.data.receipt_number} saved as Draft.`);
      fetchList();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Post Receipt ─────────────────────────────────────────────────────────
  const confirmPost = async () => {
    setPostDialogOpen(false);
    if (!editingReceiptId) { await saveDraft(); return; }
    setPosting(true);
    setFormError(null);
    try {
      const res = await api.post(`/labour-camp/cash-receipts/${editingReceiptId}/post`);
      setCurrentStatus('Posted');
      setSuccessMsg(`Receipt ${res.data.receipt_number} posted successfully. All ${res.data.lines.length} lease expiry dates extended by 1 month.`);
      fetchList();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to post receipt.');
    } finally {
      setPosting(false);
    }
  };

  // ─── Cancel Draft ─────────────────────────────────────────────────────────
  const confirmCancel = async () => {
    setCancelDialogOpen(false);
    if (!editingReceiptId) { setView('list'); return; }
    try {
      await api.post(`/labour-camp/cash-receipts/${editingReceiptId}/cancel`);
      setView('list');
      fetchList();
    } catch (e: any) {
      setFormError(e.response?.data?.detail || 'Failed to cancel receipt.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ═════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ── Page Header ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <ReceiptLongIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>Labour Camp Cash Receipts</Typography>
              <Typography variant="body2" color="text.secondary">
                Cash collection register — Camp Boss handover to Head Office
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Labour Camp Cash Receipts" />
            <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewEntry}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            New Receipt
          </Button>
          </Box>
        </Stack>

        {/* ── Filters ── */}
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              select size="small" label="Status" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {['Draft','Posted','Cancelled','Reversed'].map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <Button size="small" onClick={fetchList} variant="outlined">Refresh</Button>
          </Stack>
        </Paper>

        {/* ── Table ── */}
        {listLoading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : listError ? (
          <Alert severity="error">{listError}</Alert>
        ) : receipts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No receipts found. Click <strong>New Receipt</strong> to begin.</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  {['Receipt No.', 'Date', 'Received From', 'Total Amount', 'Lines', 'Status', 'Posted At', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {receipts.map(r => {
                  const sc = statusConfig[r.status] || { color: 'default', label: r.status };
                  return (
                    <TableRow key={r.receipt_id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.receipt_number}</TableCell>
                      <TableCell>{r.receipt_date}</TableCell>
                      <TableCell>{r.received_from || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{fmtAED(r.total_amount)}</TableCell>
                      <TableCell align="center">{r.line_count}</TableCell>
                      <TableCell>
                        <Chip label={sc.label} color={sc.color} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>{r.posted_at ? formatDate(r.posted_at) : '—'}</TableCell>
                      <TableCell>
                        <Tooltip title="View Detail">
                          <IconButton size="small" onClick={() => openDetail(r.receipt_id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                          <Tooltip title="Delete Receipt">
                            <IconButton
                              size="small"
                              sx={{ color: 'error.main', ml: 0.5 }}
                              onClick={() => { setDeleteReceiptId(r.receipt_id); setDeleteReceiptNum(r.receipt_number); }}
                            >
                              <DeleteIcon fontSize="small" />
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

        {/* Delete Confirm Dialog */}
        <Dialog open={Boolean(deleteReceiptId)} onClose={() => setDeleteReceiptId(null)}>
          <DialogTitle>Delete Receipt</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete <strong>{deleteReceiptNum}</strong>? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteReceiptId(null)}>Cancel</Button>
            <Button onClick={handleDeleteReceipt} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER — ENTRY FORM
  // ═════════════════════════════════════════════════════════════════════════

  const isPosted = currentStatus === 'Posted';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <IconButton onClick={() => setView('list')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <ReceiptLongIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        <Box flexGrow={1}>
          <Typography variant="h5" fontWeight={700}>
            {editingReceiptId ? 'Labour Camp Cash Receipt' : 'New Labour Camp Cash Receipt'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Labour Camp → Cash Collection
          </Typography>
        </Box>
        {currentStatus && (
          <Chip
            label={statusConfig[currentStatus]?.label || currentStatus}
            color={statusConfig[currentStatus]?.color || 'default'}
            sx={{ fontWeight: 700 }}
          />
        )}
      </Stack>

      {/* ── Alerts ── */}
      {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ════════════════════════════════════════════════════════════════
          PANEL A — Receipt Header
          ════════════════════════════════════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main" mb={2}>
          Panel A — Receipt Header
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth label="Receipt Number" size="small"
              value={editingReceiptId ? '(Auto Generated)' : 'LCCR-YYYY-NNNN (Auto)'}
              disabled
              helperText="System generated on save"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth label="Receipt Date" type="date" size="small"
              value={receiptDate}
              onChange={e => !isPosted && setReceiptDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPosted}
              helperText="Date of cash handover"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth label="Property" size="small"
              value="Labour Camp (Auto-Assigned)"
              disabled
              helperText="Fixed to Labour Camp property"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth label="Received From (Camp Boss)" size="small"
              value={receivedFrom}
              onChange={e => !isPosted && setReceivedFrom(e.target.value)}
              placeholder="e.g. Ahmed Al Farsi — Camp Supervisor"
              disabled={isPosted}
              helperText="Optional"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth label="Total Amount (AED)" size="small"
              type="number"
              value={totalAmount}
              onChange={e => !isPosted && setTotalAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }}
              required
              disabled={isPosted}
              helperText="Total cash physically handed over by Camp Boss"
              error={totalAmount !== '' && headerTotal <= 0}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              fullWidth label="Remarks" size="small"
              value={remarks}
              onChange={e => !isPosted && setRemarks(e.target.value)}
              placeholder="Optional notes about this collection event"
              disabled={isPosted}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ════════════════════════════════════════════════════════════════
          PANEL B — Detail Grid
          ════════════════════════════════════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={700} color="primary.main">
            Panel B — Tenancy Contract Lines
          </Typography>
          {!isPosted && (
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={addLine}
              disabled={leasesLoading}
              sx={{ borderRadius: 2 }}
            >
              Add Contract Line
            </Button>
          )}
        </Stack>

        {leasesLoading && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Loading Labour Camp contracts…</Typography>
          </Box>
        )}

        {lines.length === 0 ? (
          <Box
            sx={{
              p: 4, textAlign: 'center', border: '2px dashed',
              borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover',
            }}
          >
            <Typography color="text.secondary">
              {isPosted ? 'No lines on this receipt.' : 'Click "Add Contract Line" to start entering contracts.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Tenancy Contract No.</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>Room / Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Tenant / Resident</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 130 }}>Monthly Rent</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Rent Amount Received</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }}>Contract Expiry</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Remarks</TableCell>
                  {!isPosted && <TableCell sx={{ fontWeight: 700, width: 48 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => {
                  const selectedLease = availableLeases.find(l => l.lease_id === line.camp_lease_id) || null;
                  return (
                    <TableRow
                      key={line.id}
                      sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                    >
                      {/* Line No */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {idx + 1}
                        </Typography>
                      </TableCell>

                      {/* Contract Combo Box */}
                      <TableCell>
                        {isPosted ? (
                          <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                            {line.lease_reference}
                          </Typography>
                        ) : (
                          <Autocomplete
                            size="small"
                            options={availableLeases}
                            value={selectedLease}
                            getOptionLabel={l => `${l.lease_reference} — Room ${l.unit_number}`}
                            getOptionDisabled={l => lines.some(ln => ln.id !== line.id && ln.camp_lease_id === l.lease_id)}
                            onChange={(_, v) => handleLeaseSelect(line.id, v)}
                            renderOption={(props, l) => (
                              <li {...props} key={l.lease_id}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{l.lease_reference}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Room {l.unit_number} · {l.resident_name} · AED {Number(l.monthly_rate).toLocaleString()}
                                  </Typography>
                                </Box>
                              </li>
                            )}
                            renderInput={params => (
                              <TextField
                                {...params}
                                placeholder="Select contract…"
                                required
                                error={!line.camp_lease_id}
                                sx={{ minWidth: 220 }}
                              />
                            )}
                            noOptionsText="No Labour Camp contracts found"
                            sx={{ minWidth: 220 }}
                          />
                        )}
                      </TableCell>

                      {/* Room / Unit */}
                      <TableCell>
                        <Typography variant="body2">{line.unit_number || '—'}</Typography>
                      </TableCell>

                      {/* Resident Name */}
                      <TableCell>
                        <Typography variant="body2" noWrap>{line.resident_name || '—'}</Typography>
                      </TableCell>

                      {/* Monthly Rent — Read Only */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.camp_lease_id ? fmtAED(line.contract_monthly_rent) : ''}
                          disabled
                          inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>

                      {/* Rent Amount Received — Editable */}
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.rent_amount_received}
                          onChange={e => handleAmountChange(line.id, e.target.value)}
                          disabled={isPosted || !line.camp_lease_id}
                          error={line.camp_lease_id && !(parseFloat(line.rent_amount_received) > 0)}
                          InputProps={{ startAdornment: <InputAdornment position="start">AED</InputAdornment> }}
                          inputProps={{ style: { textAlign: 'right' }, min: 0 }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>

                      {/* Contract Expiry — Read Only */}
                      <TableCell>
                        <Typography variant="body2" color={line.current_expiry_date ? 'text.primary' : 'text.disabled'}>
                          {line.current_expiry_date
                            ? formatDate(line.current_expiry_date)
                            : '—'}
                        </Typography>
                      </TableCell>

                      {/* Line Remarks */}
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.remarks}
                          onChange={e => handleLineRemarks(line.id, e.target.value)}
                          disabled={isPosted}
                          placeholder="Optional"
                          sx={{ width: 140 }}
                        />
                      </TableCell>

                      {/* Remove Button */}
                      {!isPosted && (
                        <TableCell>
                          <Tooltip title="Remove line">
                            <IconButton size="small" color="error" onClick={() => removeLine(line.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ════════════════════════════════════════════════════════════════
          Footer — Total Comparison Panel (PM Requirement §16)
          ════════════════════════════════════════════════════════════════ */}
      <Paper
        sx={{
          p: 2.5, mb: 3, borderRadius: 2,
          border: '2px solid',
          borderColor: !hasContent ? 'divider' : totalsMatch ? 'success.main' : 'warning.main',
          bgcolor: !hasContent ? 'transparent' : totalsMatch ? 'success.50' : 'warning.50',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Header Total</Typography>
              <Typography variant="h6" fontWeight={700} color={headerTotal > 0 ? 'text.primary' : 'text.disabled'}>
                {fmtAED(headerTotal)}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Grid Total</Typography>
              <Typography variant="h6" fontWeight={700} color={gridTotal > 0 ? 'text.primary' : 'text.disabled'}>
                {fmtAED(gridTotal)}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {!hasContent ? (
                <ReceiptLongIcon sx={{ color: 'text.disabled' }} />
              ) : totalsMatch ? (
                <CheckCircleIcon color="success" />
              ) : (
                <WarningAmberIcon color="warning" />
              )}
              <Stack>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Difference</Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={!hasContent ? 'text.disabled' : totalsMatch ? 'success.main' : 'warning.main'}
                >
                  {!hasContent ? '—' : totalsMatch ? 'AED 0.00 ✓' : fmtAED(Math.abs(difference))}
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        {hasContent && !totalsMatch && (
          <Alert severity="warning" sx={{ mt: 1.5 }} icon={<WarningAmberIcon />}>
            <strong>Total amount does not match the total rent entered in the detail lines.</strong>
            {' '}Please verify the collection before saving. Difference: {fmtAED(Math.abs(difference))}
          </Alert>
        )}
        {hasContent && totalsMatch && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            <strong>Totals match.</strong>
            {' '}Header Total equals Grid Total — this receipt is ready to post.
          </Alert>
        )}
      </Paper>

      {/* ════════════════════════════════════════════════════════════════
          Action Buttons
          ════════════════════════════════════════════════════════════════ */}
      {!isPosted && (
        <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => setCancelDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            {editingReceiptId ? 'Cancel Receipt' : 'Discard'}
          </Button>
          <Button
            variant="outlined"
            onClick={saveDraft}
            disabled={saving}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <Tooltip
            title={
              !totalsMatch
                ? 'Header Total must equal Grid Total before posting'
                : !editingReceiptId
                ? 'Save Draft first, then Post'
                : ''
            }
          >
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={() => {
                  if (!editingReceiptId) {
                    setFormError('Please Save Draft first, then use Post Receipt.');
                    return;
                  }
                  setPostDialogOpen(true);
                }}
                disabled={!canPost || posting || !editingReceiptId}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                {posting ? 'Posting…' : 'Post Receipt'}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      )}

      {isPosted && (
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setView('list')}
            sx={{ borderRadius: 2 }}
          >
            Back to List
          </Button>
        </Stack>
      )}

      {/* ─── Post Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Post Receipt</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Posting this receipt will:
          </Alert>
          <Box component="ul" sx={{ pl: 2, mt: 0 }}>
            <li>Finalise the cash collection of <strong>{fmtAED(headerTotal)}</strong></li>
            <li>Extend each included tenancy contract expiry date by <strong>one calendar month</strong></li>
            <li>Write a full audit trail for every contract updated</li>
            <li>Lock this receipt — further edits require a reversal</li>
          </Box>
          <Typography variant="body2" color="text.secondary" mt={2}>
            <strong>Contracts to be processed:</strong> {lines.length} contract(s)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPostDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={confirmPost} sx={{ fontWeight: 700 }}>
            Confirm Post
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Cancel Confirmation Dialog ───────────────────────────────── */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Receipt?</DialogTitle>
        <DialogContent>
          <Typography>
            {editingReceiptId
              ? 'This will cancel the draft receipt. The action cannot be undone.'
              : 'Discard this new entry? No data will be saved.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Editing</Button>
          <Button variant="contained" color="error" onClick={confirmCancel}>
            {editingReceiptId ? 'Cancel Receipt' : 'Discard'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabourCampCashReceipt;
