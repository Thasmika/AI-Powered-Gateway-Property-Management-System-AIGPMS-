import React, { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, CircularProgress, Alert, Tabs, Tab, TextField, MenuItem, Tooltip, IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Collapse, InputAdornment, Divider, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PostAddIcon from '@mui/icons-material/PostAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { printPaymentVoucher, printExpense, printExpenseList, printVoucherList } from '../../utils/printVoucher';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { renderPdf } from '../../utils/pdfExport';
import PaymentVoucherDialog, { fmtAmount } from '../../components/PaymentVoucherDialog';
import PaymentVoucherEntry from '../loans/PaymentVoucherEntry';
import ExpenseReports from './ExpenseReports';

const payStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Unpaid: 'error', 'Partially Paid': 'warning', Paid: 'success',
};
const pvStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Pending: 'warning', Approved: 'success', Rejected: 'error', Cancelled: 'default',
};
const classColor: Record<string, string> = { General: '#6366f1', Property: '#f59e0b' };

const filterFieldSx = {
  '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  '& label': { color: '#94a3b8' },
  '& .MuiSvgIcon-root': { color: '#94a3b8' },
};
const dialogPaperSx = { background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 };

const ExpensesAndPV: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_KEYS = ['', 'pv', 'reports'];
  const tab = Math.max(0, TAB_KEYS.indexOf(searchParams.get('tab') || ''));
  const setTab = (t: number) => setSearchParams(TAB_KEYS[t] ? { tab: TAB_KEYS[t] } : {}, { replace: true });

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [fClass, setFClass] = useState('');
  const [fPay, setFPay] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  // PV dialog
  const [pvOpen, setPvOpen] = useState(false);
  const [pvExpense, setPvExpense] = useState<any | null>(null);
  const [pvEditing, setPvEditing] = useState<any | null>(null);
  const [pvView, setPvView] = useState<any | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'expense' | 'pv'; row: any } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canModify = ['Managing Director', 'Accountant', 'Administrator'].includes(role || '');

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/expenses', { params: { limit: 5000 } });
      setExpenses(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    Promise.all([
      api.get('/expenses/categories').catch(() => ({ data: [] })),
      api.get('/properties', { params: { limit: 1000 } }).catch(() => ({ data: [] })),
    ]).then(([c, p]) => {
      setCategories(Object.fromEntries((c.data || []).map((x: any) => [x.category_id, x.category_name])));
      setProperties(Object.fromEntries((p.data || []).map((x: any) => [x.property_id, x.property_name])));
    });
  }, []);

  const filtered = useMemo(() => expenses.filter(e => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [e.expense_reference, e.payee_name, e.description, e.invoice_number, categories[e.category_id], properties[e.property_id],
        ...(e.payment_vouchers || []).flatMap((v: any) => [v.voucher_number, v.payee_name, v.purpose])];
      if (!hay.some(x => String(x || '').toLowerCase().includes(q))) return false;
    }
    if (fClass && e.expense_class !== fClass) return false;
    if (fPay && e.payment_status !== fPay) return false;
    const d = (e.invoice_date || e.created_at || '').slice(0, 10);
    if (fFrom && (!d || d < fFrom)) return false;
    if (fTo && (!d || d > fTo)) return false;
    return true;
  }), [expenses, search, fClass, fPay, fFrom, fTo, categories, properties]);

  const totals = filtered.reduce((t, e) => ({
    total: t.total + parseFloat(e.total_amount || 0),
    paid: t.paid + parseFloat(e.paid_amount || 0),
    balance: t.balance + parseFloat(e.balance_amount || 0),
    pvs: t.pvs + (e.voucher_count || 0),
  }), { total: 0, paid: 0, balance: 0, pvs: 0 });

  const filtersActive = !!(search || fClass || fPay || fFrom || fTo);
  const clearFilters = () => { setSearch(''); setFClass(''); setFPay(''); setFFrom(''); setFTo(''); };

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allExpanded = filtered.length > 0 && filtered.every(e => expanded.has(e.expense_id));
  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(filtered.map(e => e.expense_id)));

  const openAddPV = (exp: any) => { setPvExpense(exp); setPvEditing(null); setPvOpen(true); };
  const openEditPV = (exp: any, pv: any) => { setPvExpense(exp); setPvEditing(pv); setPvOpen(true); };

  const handlePvSaved = (pv: any, isEdit: boolean) => {
    setPvOpen(false);
    setMsg({ type: 'success', text: isEdit ? `Payment voucher ${pv.voucher_number} updated` : `Payment voucher ${pv.voucher_number} issued under ${pv.expense_reference || 'expense'}` });
    if (pv.expense_id) setExpanded(prev => new Set(prev).add(pv.expense_id));
    fetchExpenses();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { kind, row } = deleteTarget;
    try {
      if (kind === 'expense') {
        await api.delete(`/expenses/${row.expense_id}`);
        setMsg({ type: 'success', text: `Expense ${row.expense_reference} deleted` });
      } else {
        await api.delete(`/loans/payment-vouchers/${row.voucher_id}`);
        setMsg({ type: 'success', text: `Payment voucher ${row.voucher_number} deleted` });
      }
      fetchExpenses();
    } catch (e: any) {
      const d = e.response?.data?.detail;
      setMsg({ type: 'error', text: typeof d === 'string' ? d : 'Delete failed' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) return setMsg({ type: 'error', text: 'No expenses to export for the selected filters' });
    const rows: any[] = [];
    filtered.forEach((e, i) => {
      rows.push({
        'No': `${i + 1}`, 'Type': 'Expense', 'Reference': e.expense_reference, 'Class': e.expense_class,
        'Date': e.invoice_date ? formatDate(e.invoice_date) : '', 'Payee': e.payee_name,
        'Category': categories[e.category_id] || '', 'Property': properties[e.property_id] || '',
        'Description / Purpose': e.description || '', 'Bank': '', 'Method': e.payment_method || '',
        'Expense Total': parseFloat(e.total_amount || 0), 'PV Amount': '', 'Paid': parseFloat(e.paid_amount || 0),
        'Balance': parseFloat(e.balance_amount || 0), 'Status': e.payment_status,
      });
      (e.payment_vouchers || []).forEach((v: any, j: number) => rows.push({
        'No': `${i + 1}.${j + 1}`, 'Type': 'PV', 'Reference': v.voucher_number, 'Class': '',
        'Date': v.created_at ? formatDate(v.created_at) : '', 'Payee': v.payee_name, 'Category': '', 'Property': '',
        'Description / Purpose': v.purpose || '', 'Bank': v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '',
        'Method': v.payment_method || '', 'Expense Total': '', 'PV Amount': parseFloat(v.amount || 0), 'Paid': '', 'Balance': '',
        'Status': v.approval_status,
      }));
    });
    rows.push({ 'No': 'TOTAL', 'Expense Total': totals.total, 'Paid': totals.paid, 'Balance': totals.balance });
    const headers = Object.keys(rows[0]);
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = headers.map(h => ({ wch: Math.min(45, Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)) + 2) }));
    ['Expense Total', 'PV Amount', 'Paid', 'Balance'].forEach(h => {
      const c = headers.indexOf(h);
      for (let r = 1; r <= rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = '#,##0.00';
      }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses & PV');
    XLSX.writeFile(wb, `Expenses_and_PV_${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const describeFilters = () => [
    search && `Search: ${search}`, fClass && `Class: ${fClass}`, fPay && `Payment: ${fPay}`,
    fFrom && `From: ${formatDate(fFrom)}`, fTo && `To: ${formatDate(fTo)}`,
  ].filter(Boolean).join('  |  ');

  const handlePrintExpenses = () => {
    if (filtered.length === 0) return setMsg({ type: 'error', text: 'No expenses to print for the selected filters' });
    printExpenseList(filtered, { filters: describeFilters(), names: { category: categories, property: properties } });
  };

  // PVs of the expenses currently shown, in expense order.
  const handlePrintPVs = () => {
    const pvs = filtered.flatMap(e => e.payment_vouchers || []);
    if (pvs.length === 0) return setMsg({ type: 'error', text: 'No payment vouchers to print for the selected filters' });
    printVoucherList(pvs, { filters: describeFilters() });
  };

  // PDF built from data (not the screen), so every expense lists its PVs even when collapsed.
  const handleExportPdf = () => {
    if (filtered.length === 0) return setMsg({ type: 'error', text: 'No expenses to export for the selected filters' });
    const body: (string | { content: string; colSpan: number })[][] = [];
    filtered.forEach((e, i) => {
      body.push([
        `${i + 1})`,
        `${e.expense_reference}\n${e.expense_class}`,
        e.invoice_date ? formatDate(e.invoice_date) : '-',
        e.payee_name || '-',
        [categories[e.category_id], e.property_id ? properties[e.property_id] : '', e.description].filter(Boolean).join('\n') || '-',
        fmtAmount(e.total_amount),
        fmtAmount(e.paid_amount),
        fmtAmount(e.balance_amount),
        e.payment_status,
      ]);
      const pvs: any[] = e.payment_vouchers || [];
      if (pvs.length === 0) {
        body.push(['', { content: '      No payment vouchers issued', colSpan: 8 }]);
      }
      pvs.forEach((v, j) => body.push([
        `   ${i + 1}.${j + 1}`,
        `   PV: ${v.voucher_number}`,
        v.created_at ? formatDate(v.created_at) : '-',
        v.payee_name || '-',
        [v.purpose, v.bank_name ? `Bank: ${v.bank_name} (${v.bank_account_number || ''})` : '', v.payment_method ? `Method: ${v.payment_method}` : '']
          .filter(Boolean).join('\n') || '-',
        '',
        fmtAmount(v.amount),
        '',
        v.approval_status,
      ]));
    });
    const filterNotes = describeFilters();
    renderPdf([
      {
        kind: 'fields', pairs: [
          [`Expenses (${filtered.length})`, `AED ${fmtAmount(totals.total)}`],
          [`Paid via ${totals.pvs} PV${totals.pvs === 1 ? '' : 's'}`, `AED ${fmtAmount(totals.paid)}`],
          ['Outstanding Balance', `AED ${fmtAmount(totals.balance)}`],
          ['Unpaid / Partially Paid / Paid', `${filtered.filter(e => e.payment_status === 'Unpaid').length} / ${filtered.filter(e => e.payment_status === 'Partially Paid').length} / ${filtered.filter(e => e.payment_status === 'Paid').length}`],
          ...(filterNotes ? [['Filters', filterNotes] as [string, string]] : []),
        ],
      },
      {
        kind: 'table',
        head: ['No', 'Expense / PV #', 'Date', 'Payee', 'Details', 'Total (AED)', 'Paid (AED)', 'Balance (AED)', 'Status'],
        body,
        foot: [['', 'TOTAL', '', '', '', fmtAmount(totals.total), fmtAmount(totals.paid), fmtAmount(totals.balance), '']],
      },
    ], {
      title: 'Expenses & Payment Vouchers',
      subtitle: 'Each expense followed by the payment vouchers issued against it',
      fileName: 'Expenses_and_PV',
      orientation: 'landscape',
    });
  };

  const pvViewRows: [string, React.ReactNode][] = pvView ? [
    ['Voucher #', pvView.voucher_number],
    ['Expense', pvView.expense_reference || '—'],
    ['Status', <Chip size="small" label={pvView.approval_status} color={pvStatusColor[pvView.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />],
    ['Payee', pvView.payee_name],
    ['Payee Type', pvView.payee_type || '—'],
    ['Paid From (Bank)', pvView.bank_name ? `${pvView.bank_name} — ${pvView.bank_account_name} (${pvView.bank_account_number})` : '—'],
    ['Payment Method', pvView.payment_method || '—'],
    ['Amount', `${pvView.currency || 'AED'} ${fmtAmount(pvView.amount)}`],
    ['Purpose', pvView.purpose || '—'],
    ['Notes', pvView.notes || '—'],
    ['Created', pvView.created_at ? formatDate(pvView.created_at) : '—'],
  ] : [];

  const headSx = { '& th': { fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' } };

  const renderVouchers = (exp: any, idx: number) => {
    const pvs: any[] = exp.payment_vouchers || [];
    return (
      <Box sx={{ ml: { xs: 1, md: 7 }, mr: 1, my: 1.5, borderLeft: '2px solid rgba(139,92,246,0.4)', pl: 2 }}>
        {pvs.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#64748b', py: 1 }}>No payment vouchers issued for this expense yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { ...headSx['& th'], fontSize: '0.68rem', color: '#8b5cf6' } }}>
                <TableCell>No</TableCell>
                <TableCell>Voucher #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Paid From</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell align="right">Amount (AED)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pvs.map((v, j) => (
                <TableRow key={v.voucher_id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.04)', py: 0.8, fontSize: '0.8rem' } }}>
                  <TableCell sx={{ color: '#64748b' }}>{idx + 1}.{j + 1}</TableCell>
                  <TableCell sx={{ color: '#a78bfa', fontWeight: 600, fontFamily: 'monospace' }}>{v.voucher_number}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.created_at ? formatDate(v.created_at) : '—'}</TableCell>
                  <TableCell sx={{ color: '#e2e8f0' }}>{v.payee_name}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8' }}>{v.payment_method || '—'}</TableCell>
                  <TableCell sx={{ color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.purpose || '—'}</TableCell>
                  <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{fmtAmount(v.amount)}</TableCell>
                  <TableCell><Chip size="small" label={v.approval_status} color={pvStatusColor[v.approval_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.66rem', height: 20 }} /></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.25} justifyContent="center">
                      <Tooltip title="View"><IconButton size="small" onClick={() => setPvView(v)} sx={{ color: '#8b5cf6' }}><VisibilityIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                      <Tooltip title="Print"><IconButton size="small" onClick={() => printPaymentVoucher(v)} sx={{ color: '#22c55e' }}><PrintIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                      {canModify && <>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditPV(exp, v)} sx={{ color: '#f59e0b' }}><EditIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget({ kind: 'pv', row: v })} sx={{ color: '#ef4444' }}><DeleteIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                      </>}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {canModify && parseFloat(exp.balance_amount || 0) > 0 && (
          <Button size="small" startIcon={<PostAddIcon />} onClick={() => openAddPV(exp)} sx={{ mt: 1, color: '#a78bfa', textTransform: 'none' }}>
            Add payment voucher (balance AED {fmtAmount(exp.balance_amount)})
          </Button>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptLongIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>Expenses &amp; Payment Vouchers</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>Create an expense, then issue one or more payment vouchers against it</Typography>
          </Box>
        </Box>
        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }} data-pdf-ignore>
            <Button variant="outlined" onClick={handlePrintExpenses} startIcon={<PrintIcon />}
              sx={{ color: '#818cf8', borderColor: '#818cf866', '&:hover': { borderColor: '#818cf8', bgcolor: 'rgba(129,140,248,0.08)' } }}>
              Print Expenses
            </Button>
            <Button variant="outlined" onClick={handlePrintPVs} startIcon={<PrintIcon />}
              sx={{ color: '#a78bfa', borderColor: '#a78bfa66', '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(167,139,250,0.08)' } }}>
              Print PVs
            </Button>
            <Button variant="outlined" onClick={handleExportPdf} startIcon={<PictureAsPdfIcon />}
              sx={{ color: '#f87171', borderColor: '#f8717166', '&:hover': { borderColor: '#f87171', bgcolor: 'rgba(248,113,113,0.08)' } }}>
              Download PDF
            </Button>
            <Button variant="outlined" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}
              sx={{ color: '#10b981', borderColor: '#10b98166', '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(16,185,129,0.08)' } }}>
              Download Excel
            </Button>
            {canModify && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/expenses/new')}
                sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 600, borderRadius: 2, px: 3 }}>
                New Expense
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Paper data-pdf-ignore sx={{ mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          px: 2,
          '& .MuiTab-root': { color: '#94a3b8', fontWeight: 600, textTransform: 'none', minWidth: 180 },
          '& .Mui-selected': { color: '#6366f1' },
          '& .MuiTabs-indicator': { background: '#6366f1', height: 3, borderRadius: 2 },
        }}>
          <Tab label="Expenses & PVs" />
          <Tab label="PV Register" />
          <Tab label="Reports" />
        </Tabs>
      </Paper>

      {tab === 2 ? (
        <ExpenseReports expenses={expenses} categories={categories} properties={properties} />
      ) : tab === 1 ? (
        <PaymentVoucherEntry embedded onChanged={fetchExpenses} />
      ) : (
        <>
          {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

          {/* Summary */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            {[
              { label: `Expenses (${filtered.length})`, value: `AED ${fmtAmount(totals.total)}`, color: '#6366f1' },
              { label: `Paid via ${totals.pvs} PV${totals.pvs === 1 ? '' : 's'}`, value: `AED ${fmtAmount(totals.paid)}`, color: '#22c55e' },
              { label: 'Outstanding Balance', value: `AED ${fmtAmount(totals.balance)}`, color: '#f59e0b' },
              { label: 'Unpaid / Partially Paid', value: `${filtered.filter(e => e.payment_status === 'Unpaid').length} / ${filtered.filter(e => e.payment_status === 'Partially Paid').length}`, color: '#ef4444' },
            ].map(k => (
              <Paper key={k.label} sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${k.color}30`, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: k.color, fontWeight: 800 }}>{k.value}</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>{k.label}</Typography>
              </Paper>
            ))}
          </Box>

          {/* Filters */}
          <Paper data-pdf-ignore sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
                <FilterListIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Filters</Typography>
              </Box>
              <TextField size="small" label="Search" placeholder="Expense #, PV #, payee…" value={search} onChange={e => setSearch(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#64748b' }} /></InputAdornment> } }}
                sx={{ ...filterFieldSx, width: 250 }} />
              <TextField select size="small" label="Class" value={fClass} onChange={e => setFClass(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 150 }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="General">General</MenuItem>
                <MenuItem value="Property">Property</MenuItem>
              </TextField>
              <TextField select size="small" label="Payment Status" value={fPay} onChange={e => setFPay(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...filterFieldSx, width: 170 }}>
                <MenuItem value="">All</MenuItem>
                {Object.keys(payStatusColor).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <DatePicker label="From Date" format="DD/MM/YYYY" value={fFrom ? dayjs(fFrom) : null}
                onChange={v => setFFrom(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
                slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 170 } } }} />
              <DatePicker label="To Date" format="DD/MM/YYYY" value={fTo ? dayjs(fTo) : null}
                onChange={v => setFTo(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
                slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 170 } } }} />
              <Button onClick={clearFilters} disabled={!filtersActive} size="small" sx={{ color: '#64748b' }}>Clear Filters</Button>
              <Box flex={1} />
              <Button size="small" onClick={toggleAll} startIcon={allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />} sx={{ color: '#a78bfa', textTransform: 'none' }}>
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </Button>
            </Box>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}><CircularProgress sx={{ color: '#6366f1' }} /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={headSx}>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>No</TableCell>
                    <TableCell>Expense #</TableCell>
                    <TableCell>Payee</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Property</TableCell>
                    <TableCell>Invoice Date</TableCell>
                    <TableCell align="right">Total (AED)</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 4, color: '#64748b' }}>
                        {expenses.length === 0 ? 'No expenses yet — click New Expense to create one' : 'No expenses match the selected filters'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((e, i) => {
                    const open = expanded.has(e.expense_id);
                    const total = parseFloat(e.total_amount || 0);
                    const paidPct = total > 0 ? Math.min(100, (parseFloat(e.paid_amount || 0) / total) * 100) : 0;
                    return (
                      <Fragment key={e.expense_id}>
                        <TableRow onClick={() => toggle(e.expense_id)}
                          sx={{ cursor: 'pointer', background: open ? 'rgba(99,102,241,0.06)' : undefined, '&:hover': { background: 'rgba(99,102,241,0.08)' }, '& td': { borderBottom: open ? 'none' : '1px solid rgba(255,255,255,0.05)', py: 1.1 } }}>
                          <TableCell>
                            <IconButton size="small" sx={{ color: '#94a3b8' }}>{open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}</IconButton>
                          </TableCell>
                          <TableCell sx={{ color: '#64748b', fontWeight: 700 }}>{i + 1})</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography sx={{ color: '#818cf8', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.expense_reference}</Typography>
                            <Stack direction="row" spacing={0.5} mt={0.3}>
                              <Chip size="small" label={e.expense_class} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, background: `${classColor[e.expense_class]}20`, color: classColor[e.expense_class] }} />
                              <Chip size="small" label={`${e.voucher_count || 0} PV`} sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }} />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color: '#e2e8f0', fontWeight: 500 }}>{e.payee_name}</TableCell>
                          <TableCell sx={{ color: '#94a3b8' }}>{categories[e.category_id] || '—'}</TableCell>
                          <TableCell sx={{ color: '#94a3b8' }}>{e.property_id ? (properties[e.property_id] || '—') : '—'}</TableCell>
                          <TableCell sx={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{e.invoice_date ? formatDate(e.invoice_date) : '—'}</TableCell>
                          <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{fmtAmount(e.total_amount)}</TableCell>
                          <TableCell align="right" sx={{ color: '#22c55e', fontWeight: 600 }}>{fmtAmount(e.paid_amount)}</TableCell>
                          <TableCell align="right" sx={{ color: parseFloat(e.balance_amount || 0) > 0 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{fmtAmount(e.balance_amount)}</TableCell>
                          <TableCell sx={{ minWidth: 110 }}>
                            <Chip size="small" label={e.payment_status} color={payStatusColor[e.payment_status] || 'default'} sx={{ fontWeight: 600, fontSize: '0.68rem' }} />
                            <LinearProgress variant="determinate" value={paidPct} sx={{ mt: 0.6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: '#22c55e' } }} />
                          </TableCell>
                          <TableCell align="center" onClick={ev => ev.stopPropagation()}>
                            <Stack direction="row" spacing={0.25} justifyContent="center">
                              {canModify && (
                                <Tooltip title={parseFloat(e.balance_amount || 0) > 0 ? 'Add payment voucher' : 'Fully paid'}>
                                  <span>
                                    <IconButton size="small" disabled={parseFloat(e.balance_amount || 0) <= 0} onClick={() => openAddPV(e)} sx={{ color: '#a78bfa' }}>
                                      <PostAddIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              <Tooltip title="Print expense">
                                <IconButton size="small" onClick={() => printExpense(e, { category: categories[e.category_id], property: properties[e.property_id] })} sx={{ color: '#22c55e' }}>
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View expense"><IconButton size="small" onClick={() => navigate(`/expenses/${e.expense_id}`)} sx={{ color: '#6366f1' }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                              {canModify && <>
                                <Tooltip title="Edit expense"><IconButton size="small" onClick={() => navigate(`/expenses/${e.expense_id}/edit`)} sx={{ color: '#f59e0b' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title={e.voucher_count > 0 ? 'Delete its payment vouchers first' : 'Delete expense'}>
                                  <span>
                                    <IconButton size="small" disabled={e.voucher_count > 0} onClick={() => setDeleteTarget({ kind: 'expense', row: e })} sx={{ color: '#ef4444' }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </>}
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={12} sx={{ p: 0, borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none', background: 'rgba(139,92,246,0.03)' }}>
                            <Collapse in={open} timeout="auto" unmountOnExit>{renderVouchers(e, i)}</Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <PaymentVoucherDialog
        open={pvOpen}
        expense={pvExpense}
        voucher={pvEditing}
        onClose={() => setPvOpen(false)}
        onSaved={handlePvSaved}
      />

      {/* PV view */}
      <Dialog open={!!pvView} onClose={() => setPvView(null)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Payment Voucher Details</DialogTitle>
        <DialogContent>
          {pvViewRows.map(([label, value], i) => (
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
          {pvView && <Button startIcon={<PrintIcon />} onClick={() => printPaymentVoucher(pvView)} sx={{ color: '#22c55e' }}>Print</Button>}
          <Button onClick={() => setPvView(null)} sx={{ color: '#94a3b8' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>
          {deleteTarget?.kind === 'pv' ? 'Delete Payment Voucher' : 'Delete Expense'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8' }}>
            {deleteTarget?.kind === 'pv' ? (
              <>Delete voucher <strong style={{ color: '#e2e8f0' }}>{deleteTarget.row.voucher_number}</strong> ({deleteTarget.row.payee_name}, AED {fmtAmount(deleteTarget.row.amount)})?
                The amount will be added back to the expense balance.</>
            ) : deleteTarget ? (
              <>Delete expense <strong style={{ color: '#e2e8f0' }}>{deleteTarget.row.expense_reference}</strong> ({deleteTarget.row.payee_name}, AED {fmtAmount(deleteTarget.row.total_amount)})?</>
            ) : null}
            {' '}This cannot be undone.
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

export default ExpensesAndPV;
