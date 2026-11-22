import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Chip,
  CircularProgress, Alert, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, InputAdornment
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { printPaymentVoucher, printVoucherList } from '../../utils/printVoucher';
import PdfExportButton from '../../components/PdfExportButton';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import PaymentVoucherDialog, { PAYEE_TYPES, PAYMENT_METHODS, bankLabel, fmtAmount } from '../../components/PaymentVoucherDialog';
import type { BankAccount } from '../../components/PaymentVoucherDialog';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default',
};

const NO_BANK = '__none__';
const LINKED = '__linked__';
const UNLINKED = '__unlinked__';

interface Props {
  /** Rendered as a tab inside the Expenses & PV page (no back button / page title). */
  embedded?: boolean;
  /** Called after a voucher is created, edited or deleted so a parent can refresh. */
  onChanged?: () => void;
}

const voucherBankLabel = (v: any) => v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '';

const PaymentVoucherEntry: React.FC<Props> = ({ embedded = false, onChanged }) => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Filters
  const [fBank, setFBank] = useState('');
  const [fLink, setFLink] = useState('');
  const [search, setSearch] = useState('');
  const [fPayeeType, setFPayeeType] = useState('');
  const [fMethod, setFMethod] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const canModify = ['Managing Director', 'Accountant', 'Administrator'].includes(role || '');

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans/payment-vouchers', { params: { limit: 5000 } });
      setVouchers(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load payment vouchers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    const [b, e] = await Promise.all([
      api.get('/pdc-issued/bank-accounts').catch(() => ({ data: [] })),
      api.get('/expenses', { params: { limit: 5000 } }).catch(() => ({ data: [] })),
    ]);
    setBanks(b.data);
    setExpenses(e.data);
  };

  useEffect(() => { fetchVouchers(); fetchMasters(); }, []);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (v: any) => { setEditing(v); setFormOpen(true); };

  const handleSaved = (_: any, isEdit: boolean) => {
    setFormOpen(false);
    setEditing(null);
    setActionMsg({ type: 'success', text: isEdit ? 'Payment voucher updated successfully' : 'Payment voucher issued successfully' });
    fetchVouchers();
    fetchMasters();
    onChanged?.();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/loans/payment-vouchers/${deleteTarget.voucher_id}`);
      setActionMsg({ type: 'success', text: `Payment voucher ${deleteTarget.voucher_number} deleted` });
      fetchVouchers();
      fetchMasters();
      onChanged?.();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Delete failed' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtersActive = !!(search || fLink || fBank || fPayeeType || fMethod || fStatus || fFrom || fTo);
  const clearFilters = () => { setSearch(''); setFLink(''); setFBank(''); setFPayeeType(''); setFMethod(''); setFStatus(''); setFFrom(''); setFTo(''); };

  const filtered = vouchers.filter(v => {
    const q = search.trim().toLowerCase();
    if (q && ![v.voucher_number, v.expense_reference, v.payee_name, v.purpose, v.notes, v.bank_name].some(x => String(x || '').toLowerCase().includes(q))) return false;
    if (fLink === LINKED ? !v.expense_id : fLink === UNLINKED ? !!v.expense_id : (fLink && v.expense_id !== fLink)) return false;
    if (fBank === NO_BANK ? !!v.bank_account_id : (fBank && v.bank_account_id !== fBank)) return false;
    if (fPayeeType && v.payee_type !== fPayeeType) return false;
    if (fMethod && v.payment_method !== fMethod) return false;
    if (fStatus && v.approval_status !== fStatus) return false;
    const d = v.created_at ? String(v.created_at).slice(0, 10) : '';
    if (fFrom && (!d || d < fFrom)) return false;
    if (fTo && (!d || d > fTo)) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, v) => s + parseFloat(v.amount || 0), 0);

  // Bank-wise totals of the vouchers currently shown
  type BankTotal = { key: string; label: string; count: number; total: number };
  const bankSummary: BankTotal[] = Object.values(filtered.reduce((acc: Record<string, BankTotal>, v) => {
    const key = v.bank_account_id || NO_BANK;
    const label = v.bank_account_id ? voucherBankLabel(v) : 'No bank (Cash / not set)';
    acc[key] = acc[key] || { key, label, count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += parseFloat(v.amount || 0);
    return acc;
  }, {} as Record<string, BankTotal>)).sort((a, b) => b.total - a.total);
  const now = new Date();
  const thisMonthCount = filtered.filter(v => {
    const d = v.created_at ? new Date(v.created_at) : null;
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  // ── Excel export of the vouchers currently shown (respects filters) ──
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      setActionMsg({ type: 'error', text: 'No vouchers to export for the selected filters' });
      return;
    }
    const rows: any[] = filtered.map(v => ({
      'Voucher #': v.voucher_number,
      'Date': v.created_at ? formatDate(v.created_at) : '',
      'Expense Ref': v.expense_reference || '',
      'Payee': v.payee_name || '',
      'Payee Type': v.payee_type || '',
      'Bank': v.bank_name || '',
      'Account No': v.bank_account_number || '',
      'Purpose': v.purpose || '',
      'Payment Method': v.payment_method || '',
      'Currency': v.currency || 'AED',
      'Amount': parseFloat(v.amount || 0),
      'Status': v.approval_status || '',
      'Notes': v.notes || '',
    }));
    rows.push({ 'Voucher #': 'TOTAL', 'Amount': totalAmount });
    const headers = Object.keys(rows[0]);
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = headers.map(h => ({
      wch: Math.min(45, Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)) + 2),
    }));
    const amountCol = headers.indexOf('Amount');
    for (let r = 1; r <= rows.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: amountCol })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: headers.length - 1 } }) };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Vouchers');
    const bankRows: any[] = bankSummary.map(b => ({ 'Bank Account': b.label, 'Vouchers': b.count, 'Amount (AED)': b.total }));
    bankRows.push({ 'Bank Account': 'TOTAL', 'Vouchers': filtered.length, 'Amount (AED)': totalAmount });
    const ws2 = XLSX.utils.json_to_sheet(bankRows);
    ws2['!cols'] = [{ wch: Math.max(14, ...bankRows.map(r => String(r['Bank Account']).length)) + 2 }, { wch: 10 }, { wch: 16 }];
    for (let r = 1; r <= bankRows.length; r++) {
      const cell = ws2[XLSX.utils.encode_cell({ r, c: 2 })];
      if (cell && cell.t === 'n') cell.z = '#,##0.00';
    }
    XLSX.utils.book_append_sheet(wb, ws2, 'By Bank');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Payment_Vouchers_${stamp}.xlsx`);
  };

  const filterFieldSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
    '& label': { color: '#94a3b8' },
    '& input::-webkit-calendar-picker-indicator': { filter: 'invert(0.7)' },
  };

  const dialogPaperSx = { background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 };

  const viewRows: [string, React.ReactNode][] = viewTarget ? [
    ['Voucher #', viewTarget.voucher_number],
    ['Status', <Chip size="small" label={viewTarget.approval_status} color={statusColors[viewTarget.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />],
    ['Expense', viewTarget.expense_reference || 'Not linked'],
    ['Payee', viewTarget.payee_name],
    ['Payee Type', viewTarget.payee_type || '—'],
    ['Paid From (Bank)', viewTarget.bank_name ? `${viewTarget.bank_name} — ${viewTarget.bank_account_name} (${viewTarget.bank_account_number})` : '—'],
    ['Payment Method', viewTarget.payment_method || '—'],
    ['Amount', `${viewTarget.currency || 'AED'} ${fmtAmount(viewTarget.amount)}`],
    ['Purpose', viewTarget.purpose || '—'],
    ['Notes', viewTarget.notes || '—'],
    ['Created', viewTarget.created_at ? formatDate(viewTarget.created_at) : '—'],
    ['Last Updated', viewTarget.updated_at ? formatDate(viewTarget.updated_at) : '—'],
  ] : [];

  return (
    <Box sx={{ p: embedded ? 0 : 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {!embedded && <IconButton onClick={() => navigate('/loans')} sx={{ color: '#94a3b8' }}><ArrowBackIcon /></IconButton>}
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant={embedded ? 'h6' : 'h5'} fontWeight={700} sx={{ color: '#e2e8f0' }}>{embedded ? 'PV Register — all payment vouchers' : 'Payment Vouchers'}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {filtersActive ? `${filtered.length} of ${vouchers.length}` : vouchers.length} vouchers · AED {fmtAmount(totalAmount)} total
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }} data-pdf-ignore>
          <Button variant="outlined" startIcon={<PrintIcon />}
            onClick={() => filtered.length
              ? printVoucherList(filtered, { filters: filtersActive ? 'Filtered list (see PV Register filters)' : '' })
              : setActionMsg({ type: 'error', text: 'No vouchers to print for the selected filters' })}
            sx={{ color: '#a78bfa', borderColor: '#a78bfa66', '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(167,139,250,0.08)' } }}>
            Print List
          </Button>
          <PdfExportButton title="Payment Vouchers" fileName="Payment_Vouchers" sections={false} />
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            startIcon={<FileDownloadIcon />}
            sx={{ color: '#10b981', borderColor: '#10b98166', '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(16,185,129,0.08)' } }}
          >
            Download Excel
          </Button>
          {canModify && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNew}
              sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2, px: 3 }}
            >
              New Voucher
            </Button>
          )}
        </Box>
      </Box>

      {actionMsg && (
        <Alert severity={actionMsg.type} sx={{ mb: 2 }} onClose={() => setActionMsg(null)}>{actionMsg.text}</Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Vouchers', value: filtered.length, color: '#8b5cf6' },
          { label: 'Issued This Month', value: thisMonthCount, color: '#f59e0b' },
          { label: 'Total Issued (AED)', value: fmtAmount(totalAmount), color: '#22c55e' },
        ].map(kpi => (
          <Paper key={kpi.label} sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${kpi.color}30`, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 800 }}>{kpi.value}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>{kpi.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper data-pdf-ignore sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
            <FilterListIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Filters</Typography>
          </Box>
          <TextField size="small" label="Search" placeholder="Voucher #, payee, purpose…" value={search} onChange={e => setSearch(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#64748b' }} /></InputAdornment> } }}
            sx={{ ...filterFieldSx, width: 260 }} />
          <TextField select size="small" label="Expense" value={fLink} onChange={e => setFLink(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 200 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value={LINKED}>Linked to an expense</MenuItem>
            <MenuItem value={UNLINKED}>Not linked</MenuItem>
            {expenses.filter(e => e.voucher_count > 0).map(e => <MenuItem key={e.expense_id} value={e.expense_id}>{e.expense_reference} — {e.payee_name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Bank" value={fBank} onChange={e => setFBank(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 220 }}>
            <MenuItem value="">All</MenuItem>
            {banks.map(b => <MenuItem key={b.account_id} value={b.account_id}>{bankLabel(b)}</MenuItem>)}
            <MenuItem value={NO_BANK}>No bank (Cash / not set)</MenuItem>
          </TextField>
          <TextField select size="small" label="Payee Type" value={fPayeeType} onChange={e => setFPayeeType(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 170 }}>
            <MenuItem value="">All</MenuItem>
            {PAYEE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Payment Method" value={fMethod} onChange={e => setFMethod(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 170 }}>
            <MenuItem value="">All</MenuItem>
            {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status" value={fStatus} onChange={e => setFStatus(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 150 }}>
            <MenuItem value="">All</MenuItem>
            {Object.keys(statusColors).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <DatePicker label="From Date"
            format="DD/MM/YYYY"
            value={fFrom ? dayjs(fFrom) : null}
            onChange={v => setFFrom(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
            slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 170 } } }} />
          <DatePicker label="To Date"
            format="DD/MM/YYYY"
            value={fTo ? dayjs(fTo) : null}
            onChange={v => setFTo(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
            slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 170 } } }} />
          <Button onClick={clearFilters} disabled={!filtersActive} size="small" sx={{ color: '#64748b' }}>
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Bank-wise summary */}
      {bankSummary.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <AccountBalanceIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>By Bank</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(260px, 1fr))' }, gap: 1.5 }}>
            {bankSummary.map(b => (
              <Box key={b.key} onClick={() => setFBank(fBank === b.key ? '' : b.key)}
                sx={{ p: 1.5, borderRadius: 1.5, cursor: 'pointer', border: `1px solid ${fBank === b.key ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`, background: fBank === b.key ? 'rgba(139,92,246,0.1)' : 'transparent', '&:hover': { borderColor: '#8b5cf6' } }}>
                <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }} noWrap title={b.label}>{b.label}</Typography>
                <Box display="flex" justifyContent="space-between" mt={0.5}>
                  <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>{b.count} voucher{b.count === 1 ? '' : 's'}</Typography>
                  <Typography sx={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>AED {fmtAmount(b.total)}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
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
                <TableCell>Expense</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Payee Type</TableCell>
                <TableCell>Bank</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount (AED)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: '#64748b' }}>
                    {vouchers.length === 0 ? 'No payment vouchers yet' : 'No vouchers match the selected filters'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.voucher_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.2 }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                  <TableCell sx={{ color: '#8b5cf6', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>{v.voucher_number}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {v.expense_reference
                      ? <Box component="span" onClick={() => navigate(`/expenses/${v.expense_id}`)} sx={{ color: '#a5b4fc', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{v.expense_reference}</Box>
                      : <Box component="span" sx={{ color: '#475569' }}>—</Box>}
                  </TableCell>
                  <TableCell sx={{ color: '#e2e8f0', fontWeight: 500 }}>{v.payee_name}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.payee_type || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{voucherBankLabel(v) || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purpose || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.payment_method || '—'}</TableCell>
                  <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{fmtAmount(v.amount)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={v.approval_status} color={statusColors[v.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{v.created_at ? formatDate(v.created_at) : '—'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => setViewTarget(v)} sx={{ color: '#8b5cf6' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print">
                        <IconButton size="small" onClick={() => printPaymentVoucher(v)} sx={{ color: '#22c55e' }}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canModify && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(v)} sx={{ color: '#f59e0b' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(v)} sx={{ color: '#ef4444' }}>
                              <DeleteIcon fontSize="small" />
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

      {/* View dialog */}
      <Dialog open={!!viewTarget} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Payment Voucher Details</DialogTitle>
        <DialogContent>
          {viewRows.map(([label, value], i) => (
            <Box key={label}>
              {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />}
              <Box display="flex" justifyContent="space-between" gap={2} py={1.2}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', minWidth: 130 }}>{label}</Typography>
                <Box sx={{ color: '#e2e8f0', fontSize: '0.9rem', textAlign: 'right', wordBreak: 'break-word' }}>{value}</Box>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {viewTarget && (
            <Button startIcon={<PrintIcon />} onClick={() => printPaymentVoucher(viewTarget)} sx={{ color: '#22c55e' }}>
              Print
            </Button>
          )}
          {canModify && viewTarget && (
            <Button startIcon={<EditIcon />} onClick={() => { const v = viewTarget; setViewTarget(null); openEdit(v); }} sx={{ color: '#f59e0b' }}>
              Edit
            </Button>
          )}
          <Button onClick={() => setViewTarget(null)} sx={{ color: '#94a3b8' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <PaymentVoucherDialog
        open={formOpen}
        voucher={editing}
        expenses={expenses}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Delete Payment Voucher</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8' }}>
            Delete voucher <strong style={{ color: '#e2e8f0' }}>{deleteTarget?.voucher_number}</strong> ({deleteTarget?.payee_name},
            AED {fmtAmount(deleteTarget?.amount)})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentVoucherEntry;
