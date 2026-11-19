import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem, Chip,
  CircularProgress, Alert, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, InputAdornment, Autocomplete
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { printPaymentVoucher } from '../../utils/printVoucher';
import PdfExportButton from '../../components/PdfExportButton';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default',
};

const PAYEE_TYPES = ['Supplier', 'Contractor', 'Bank', 'Loan Provider', 'Sister Company', 'Other'];
const PAYMENT_METHODS = ['Cheque', 'Transfer', 'PDC', 'Cash', 'Other'];

const EMPTY_FORM = {
  payee_id: '', payee_name: '', payee_type: '', bank_account_id: '', amount: '', currency: 'AED',
  purpose: '', payment_method: '', notes: ''
};

const NO_BANK = '__none__';

interface Payee { supplier_id: string; supplier_name: string; supplier_type: string | null; }
interface BankAccount { account_id: string; account_name: string; bank_name: string; account_number: string; }

const bankLabel = (b: BankAccount) => `${b.bank_name} — ${b.account_name} (${b.account_number})`;
const voucherBankLabel = (v: any) => v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '';

const EMPTY_PAYEE = { supplier_name: '', supplier_type: '', contact_number: '', email: '' };
const EMPTY_BANK = { bank_name: '', account_name: '', account_number: '', iban: '', branch: '' };

const fmtAmount = (v: any) => parseFloat(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 });

const PaymentVoucherEntry: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Master lists
  const [payees, setPayees] = useState<Payee[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);

  // Add payee / bank dialogs
  const [payeeDialog, setPayeeDialog] = useState(false);
  const [newPayee, setNewPayee] = useState(EMPTY_PAYEE);
  const [bankDialog, setBankDialog] = useState(false);
  const [newBank, setNewBank] = useState(EMPTY_BANK);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Filters
  const [fBank, setFBank] = useState('');
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
      const res = await api.get('/loans/payment-vouchers', { params: { limit: 200 } });
      setVouchers(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load payment vouchers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    const [p, b] = await Promise.all([
      api.get('/master/suppliers', { params: { active_only: true } }).catch(() => ({ data: [] })),
      api.get('/pdc-issued/bank-accounts').catch(() => ({ data: [] })),
    ]);
    setPayees(p.data);
    setBanks(b.data);
  };

  useEffect(() => { fetchVouchers(); fetchMasters(); }, []);

  const openPayeeDialog = () => { setNewPayee(EMPTY_PAYEE); setDialogError(null); setPayeeDialog(true); };
  const openBankDialog = () => { setNewBank(EMPTY_BANK); setDialogError(null); setBankDialog(true); };

  const savePayee = async () => {
    if (!newPayee.supplier_name.trim()) return setDialogError('Payee name is required');
    setDialogSaving(true); setDialogError(null);
    try {
      const res = await api.post('/master/suppliers', {
        supplier_name: newPayee.supplier_name.trim(),
        supplier_type: newPayee.supplier_type || null,
        contact_number: newPayee.contact_number.trim() || null,
        email: newPayee.email.trim() || null,
      });
      const p: Payee = res.data;
      setPayees(prev => [...prev, p].sort((a, b) => a.supplier_name.localeCompare(b.supplier_name)));
      setForm(f => ({
        ...f, payee_id: p.supplier_id, payee_name: p.supplier_name,
        payee_type: p.supplier_type && PAYEE_TYPES.includes(p.supplier_type) ? p.supplier_type : f.payee_type,
      }));
      setPayeeDialog(false);
    } catch (e: any) {
      const d = e.response?.data?.detail;
      setDialogError(typeof d === 'string' ? d : 'Failed to add payee');
    } finally { setDialogSaving(false); }
  };

  const saveBank = async () => {
    if (!newBank.bank_name.trim() || !newBank.account_name.trim() || !newBank.account_number.trim())
      return setDialogError('Bank name, account name and account number are required');
    setDialogSaving(true); setDialogError(null);
    try {
      const res = await api.post('/pdc-issued/bank-accounts', {
        bank_name: newBank.bank_name.trim(),
        account_name: newBank.account_name.trim(),
        account_number: newBank.account_number.trim(),
        iban: newBank.iban.trim() || null,
        branch: newBank.branch.trim() || null,
      });
      const b: BankAccount = res.data;
      setBanks(prev => [...prev, b].sort((x, y) => bankLabel(x).localeCompare(bankLabel(y))));
      setForm(f => ({ ...f, bank_account_id: b.account_id }));
      setBankDialog(false);
    } catch (e: any) {
      const d = e.response?.data?.detail;
      setDialogError(typeof d === 'string' ? d : 'Failed to add bank account');
    } finally { setDialogSaving(false); }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openNew = () => {
    if (showForm && !editingId) { closeForm(); return; }
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.voucher_id);
    setForm({
      payee_id: v.payee_id || '',
      payee_name: v.payee_name || '',
      payee_type: v.payee_type || '',
      bank_account_id: v.bank_account_id || '',
      amount: v.amount != null ? String(v.amount) : '',
      currency: v.currency || 'AED',
      purpose: v.purpose || '',
      payment_method: v.payment_method || '',
      notes: v.notes || '',
    });
    setFormError(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleSave = async () => {
    if (!form.payee_id || !form.amount) return setFormError('Payee and amount are required');
    if (!form.bank_account_id && form.payment_method !== 'Cash') return setFormError('Select the bank account the payment is issued from (not required for Cash)');
    if (parseFloat(form.amount) <= 0) return setFormError('Amount must be greater than 0');
    setSaving(true);
    setFormError(null);
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      payee_type: form.payee_type || null,
      bank_account_id: form.bank_account_id || null,
      payment_method: form.payment_method || null,
      purpose: form.purpose || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await api.put(`/loans/payment-vouchers/${editingId}`, payload);
        setActionMsg({ type: 'success', text: 'Payment voucher updated successfully' });
      } else {
        await api.post('/loans/payment-vouchers', payload);
        setActionMsg({ type: 'success', text: 'Payment voucher issued successfully' });
      }
      closeForm();
      fetchVouchers();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setFormError(typeof detail === 'string' ? detail : (editingId ? 'Failed to update voucher' : 'Failed to create voucher'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/loans/payment-vouchers/${deleteTarget.voucher_id}`);
      setActionMsg({ type: 'success', text: `Payment voucher ${deleteTarget.voucher_number} deleted` });
      if (editingId === deleteTarget.voucher_id) closeForm();
      fetchVouchers();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.response?.data?.detail || 'Delete failed' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtersActive = !!(search || fBank || fPayeeType || fMethod || fStatus || fFrom || fTo);
  const clearFilters = () => { setSearch(''); setFBank(''); setFPayeeType(''); setFMethod(''); setFStatus(''); setFFrom(''); setFTo(''); };

  const filtered = vouchers.filter(v => {
    const q = search.trim().toLowerCase();
    if (q && ![v.voucher_number, v.payee_name, v.purpose, v.notes, v.bank_name].some(x => String(x || '').toLowerCase().includes(q))) return false;
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

  const inputSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
    '& .MuiSvgIcon-root': { color: '#94a3b8' },
  };

  // ── Excel export of the vouchers currently shown (respects filters) ──
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      setActionMsg({ type: 'error', text: 'No vouchers to export for the selected filters' });
      return;
    }
    const rows: any[] = filtered.map(v => ({
      'Voucher #': v.voucher_number,
      'Date': v.created_at ? formatDate(v.created_at) : '',
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
              {filtersActive ? `${filtered.length} of ${vouchers.length}` : vouchers.length} vouchers · AED {fmtAmount(totalAmount)} total
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }} data-pdf-ignore>
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

      {/* New / Edit Voucher Form */}
      {showForm && (
        <Paper ref={formRef} data-pdf-ignore sx={{ p: 3, mb: 3, borderRadius: 2, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Typography variant="overline" sx={{ color: '#8b5cf6', fontWeight: 700, letterSpacing: 1.5, mb: 2, display: 'block' }}>
            {editingId ? `Edit Payment Voucher ${vouchers.find(v => v.voucher_id === editingId)?.voucher_number || ''}` : 'New Payment Voucher'}
          </Typography>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  fullWidth
                  options={payees}
                  value={payees.find(p => p.supplier_id === form.payee_id) || null}
                  onChange={(_, p) => setForm(f => ({
                    ...f,
                    payee_id: p?.supplier_id || '',
                    payee_name: p?.supplier_name || '',
                    payee_type: p?.supplier_type && PAYEE_TYPES.includes(p.supplier_type) ? p.supplier_type : f.payee_type,
                  }))}
                  getOptionLabel={p => p.supplier_name}
                  isOptionEqualToValue={(o, v) => o.supplier_id === v.supplier_id}
                  noOptionsText="No payees — click + to add one"
                  renderInput={params => <TextField {...params} label="Payee *" sx={inputSx} />}
                />
                <Tooltip title="Add new payee">
                  <IconButton onClick={openPayeeDialog} sx={{ mt: 1, color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.4)' }}>
                    <PersonAddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth label="Payee Type" value={form.payee_type} onChange={e => setForm(f => ({ ...f, payee_type: e.target.value }))} sx={inputSx}>
                {PAYEE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth label="Payment Method" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} sx={inputSx}>
                {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  fullWidth
                  options={banks}
                  value={banks.find(b => b.account_id === form.bank_account_id) || null}
                  onChange={(_, b) => setForm(f => ({ ...f, bank_account_id: b?.account_id || '' }))}
                  getOptionLabel={bankLabel}
                  isOptionEqualToValue={(o, v) => o.account_id === v.account_id}
                  noOptionsText="No bank accounts — click + to add one"
                  renderInput={params => <TextField {...params} label={form.payment_method === 'Cash' ? 'Paid From (Bank)' : 'Paid From (Bank) *'} error={!!formError && !form.bank_account_id && form.payment_method !== 'Cash'} helperText={!!formError && !form.bank_account_id && form.payment_method !== 'Cash' ? 'Required unless method is Cash' : undefined} sx={inputSx} />}
                />
                <Tooltip title="Add new bank account">
                  <IconButton onClick={openBankDialog} sx={{ mt: 1, color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.4)' }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}><TextField fullWidth label="Amount (AED) *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} sx={inputSx} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Purpose" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} sx={inputSx} /></Grid>
            <Grid size={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} sx={inputSx} /></Grid>
          </Grid>
          <Stack direction="row" spacing={2} mt={2.5} justifyContent="flex-end" alignItems="center">
            {formError && <Typography variant="body2" sx={{ color: '#f87171', mr: 'auto' }}>{formError}</Typography>}
            <Button onClick={closeForm} sx={{ color: '#94a3b8' }}>Cancel</Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />} onClick={handleSave} disabled={saving}
              sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2 }}>
              {saving ? 'Saving…' : editingId ? 'Update Voucher' : 'Create Voucher'}
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
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: '#64748b' }}>
                    {vouchers.length === 0 ? 'No payment vouchers yet' : 'No vouchers match the selected filters'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.voucher_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.2 }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                  <TableCell sx={{ color: '#8b5cf6', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>{v.voucher_number}</TableCell>
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

      {/* Add payee dialog */}
      <Dialog open={payeeDialog} onClose={() => !dialogSaving && setPayeeDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Add Payee</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Stack spacing={2} mt={1}>
            <TextField autoFocus fullWidth label="Payee Name *" value={newPayee.supplier_name} onChange={e => setNewPayee(p => ({ ...p, supplier_name: e.target.value }))} sx={inputSx} />
            <TextField select fullWidth label="Payee Type" value={newPayee.supplier_type} onChange={e => setNewPayee(p => ({ ...p, supplier_type: e.target.value }))} sx={inputSx}>
              <MenuItem value="">— None —</MenuItem>
              {PAYEE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Contact Number" value={newPayee.contact_number} onChange={e => setNewPayee(p => ({ ...p, contact_number: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="Email" value={newPayee.email} onChange={e => setNewPayee(p => ({ ...p, email: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayeeDialog(false)} disabled={dialogSaving} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" onClick={savePayee} disabled={dialogSaving}
            startIcon={dialogSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PersonAddIcon />}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600 }}>
            {dialogSaving ? 'Saving…' : 'Add Payee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add bank account dialog */}
      <Dialog open={bankDialog} onClose={() => !dialogSaving && setBankDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Add Bank Account</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Stack spacing={2} mt={1}>
            <TextField autoFocus fullWidth label="Bank Name *" placeholder="e.g. Emirates NBD" value={newBank.bank_name} onChange={e => setNewBank(b => ({ ...b, bank_name: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="Account Name *" value={newBank.account_name} onChange={e => setNewBank(b => ({ ...b, account_name: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="Account Number *" value={newBank.account_number} onChange={e => setNewBank(b => ({ ...b, account_number: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="IBAN" value={newBank.iban} onChange={e => setNewBank(b => ({ ...b, iban: e.target.value }))} sx={inputSx} />
            <TextField fullWidth label="Branch" value={newBank.branch} onChange={e => setNewBank(b => ({ ...b, branch: e.target.value }))} sx={inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBankDialog(false)} disabled={dialogSaving} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" onClick={saveBank} disabled={dialogSaving}
            startIcon={dialogSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AccountBalanceIcon />}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600 }}>
            {dialogSaving ? 'Saving…' : 'Add Bank Account'}
          </Button>
        </DialogActions>
      </Dialog>

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
