import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, MenuItem, Autocomplete, Alert, ToggleButton, ToggleButtonGroup, FormControlLabel, Switch,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SummarizeIcon from '@mui/icons-material/Summarize';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { printReport } from '../../utils/printVoucher';
import type { PrintReportSection } from '../../utils/printVoucher';
import { renderPdf } from '../../utils/pdfExport';
import type { PdfBlock } from '../../utils/pdfExport';
import { fmtAmount } from '../../components/PaymentVoucherDialog';

type ReportType = 'expense' | 'range' | 'pv' | 'property';
type Section = PrintReportSection;
interface Report { title: string; subtitle?: string; summary: [string, string][]; sections: Section[] }

const VOID = ['Rejected', 'Cancelled'];
const NO_PROPERTY = 'General / no property';
const num = (v: any) => parseFloat(v || 0) || 0;
const day = (v: any) => (v ? String(v).slice(0, 10) : '');
const inRange = (d: string, from: string, to: string) => (!from || (d && d >= from)) && (!to || (d && d <= to));

const fieldSx = {
  '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
  '& label': { color: '#94a3b8' },
  '& .MuiSvgIcon-root': { color: '#94a3b8' },
};

interface Props {
  expenses: any[];
  categories: Record<string, string>;
  properties: Record<string, string>;
}

const ExpenseReports: React.FC<Props> = ({ expenses, categories, properties }) => {
  const [type, setType] = useState<ReportType>('expense');
  const [vouchers, setVouchers] = useState<any[]>([]);

  // Parameters
  const [expenseId, setExpenseId] = useState('');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [cls, setCls] = useState('');
  const [groupBy, setGroupBy] = useState<'bank' | 'payee' | 'method' | 'month' | 'expense'>('bank');
  const [pvScope, setPvScope] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [showDetail, setShowDetail] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState('');

  // All vouchers, including ones not linked to an expense (loan payments etc.)
  useEffect(() => {
    api.get('/loans/payment-vouchers', { params: { limit: 5000 } }).then(r => setVouchers(r.data)).catch(() => setVouchers([]));
  }, [expenses]);

  const propName = (id?: string | null) => (id ? properties[id] || 'Unknown property' : NO_PROPERTY);
  const pvBank = (v: any) => (v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : 'No bank (Cash / not set)');
  const periodLabel = from || to ? `${from ? formatDate(from) : 'Start'} to ${to ? formatDate(to) : 'Today'}` : 'All dates';

  const report: Report | null = useMemo(() => {
    // ── 1. Single expense statement ──
    if (type === 'expense') {
      const e = expenses.find(x => x.expense_id === expenseId);
      if (!e) return null;
      const pvs: any[] = e.payment_vouchers || [];
      return {
        title: `Expense Statement ${e.expense_reference}`,
        subtitle: `${e.expense_class} expense · ${e.payee_name}`,
        summary: [
          ['Expense #', e.expense_reference],
          ['Payee', e.payee_name || '-'],
          ['Category', categories[e.category_id] || '-'],
          ['Property', e.property_id ? propName(e.property_id) : '-'],
          ['Invoice Date / No', `${e.invoice_date ? formatDate(e.invoice_date) : '-'} / ${e.invoice_number || '-'}`],
          ['Total Amount', `AED ${fmtAmount(e.total_amount)}`],
          ['Paid', `AED ${fmtAmount(e.paid_amount)}`],
          ['Balance', `AED ${fmtAmount(e.balance_amount)}`],
          ['Payment Status', e.payment_status],
          ...(e.description ? [['Description', e.description] as [string, string]] : []),
        ],
        sections: [{
          heading: `Payment Vouchers (${pvs.length})`,
          head: ['No', 'Voucher #', 'Date', 'Payee', 'Paid From', 'Method', 'Purpose', 'Status', 'Amount (AED)'],
          rows: pvs.map((v, i) => [i + 1, v.voucher_number, formatDate(v.created_at), v.payee_name, pvBank(v), v.payment_method || '-', v.purpose || '-', v.approval_status, num(v.amount)]),
          foot: ['', 'Total paid', '', '', '', '', '', '', num(e.paid_amount)],
          money: [8],
        }],
      };
    }

    // ── 2. Date range: expenses incurred + payments made in the period ──
    if (type === 'range') {
      const exps = expenses.filter(e => inRange(day(e.invoice_date || e.created_at), from, to) && (!cls || e.expense_class === cls));
      const pvs = vouchers.filter(v => inRange(day(v.created_at), from, to) && !VOID.includes(v.approval_status));
      const t = exps.reduce((a, e) => ({ total: a.total + num(e.total_amount), paid: a.paid + num(e.paid_amount), bal: a.bal + num(e.balance_amount) }), { total: 0, paid: 0, bal: 0 });
      const pvTotal = pvs.reduce((s, v) => s + num(v.amount), 0);
      const sections: Section[] = [{
        heading: `Expenses in period (${exps.length})${cls ? ` - ${cls}` : ''}`,
        head: ['No', 'Expense #', 'Invoice Date', 'Payee', 'Category', 'Property', 'Total (AED)', 'Paid (AED)', 'Balance (AED)', 'Status'],
        rows: exps.map((e, i) => [i + 1, e.expense_reference, formatDate(e.invoice_date || e.created_at), e.payee_name, categories[e.category_id] || '-',
          e.property_id ? propName(e.property_id) : '-', num(e.total_amount), num(e.paid_amount), num(e.balance_amount), e.payment_status]),
        foot: ['', 'TOTAL', '', '', '', '', t.total, t.paid, t.bal, ''],
        money: [6, 7, 8],
      }];
      if (showDetail) sections.push({
        heading: `Payment vouchers issued in period (${pvs.length})`,
        head: ['No', 'Voucher #', 'Date', 'Expense #', 'Payee', 'Paid From', 'Method', 'Amount (AED)'],
        rows: pvs.map((v, i) => [i + 1, v.voucher_number, formatDate(v.created_at), v.expense_reference || '-', v.payee_name, pvBank(v), v.payment_method || '-', num(v.amount)]),
        foot: ['', 'TOTAL', '', '', '', '', '', pvTotal],
        money: [7],
      });
      return {
        title: 'Expenses by Date Range',
        subtitle: `Period: ${periodLabel}`,
        summary: [
          ['Period', periodLabel],
          ['Expenses', String(exps.length)],
          ['Total Expenses', `AED ${fmtAmount(t.total)}`],
          ['Paid against these', `AED ${fmtAmount(t.paid)}`],
          ['Outstanding', `AED ${fmtAmount(t.bal)}`],
          ['PVs issued in period', `${pvs.length} · AED ${fmtAmount(pvTotal)}`],
        ],
        sections,
      };
    }

    // ── 3. PV summary grouped by bank / payee / method / month / expense ──
    if (type === 'pv') {
      const pvs = vouchers.filter(v => inRange(day(v.created_at), from, to)
        && (pvScope === 'all' || (pvScope === 'linked' ? !!v.expense_id : !v.expense_id)));
      const keyOf = (v: any) => groupBy === 'bank' ? pvBank(v)
        : groupBy === 'payee' ? (v.payee_name || '-')
        : groupBy === 'method' ? (v.payment_method || 'Not set')
        : groupBy === 'month' ? dayjs(v.created_at).format('MMM YYYY')
        : (v.expense_reference || 'Not linked to an expense');
      const groups = new Map<string, { count: number; total: number; voidTotal: number; sortKey: string }>();
      pvs.forEach(v => {
        const k = keyOf(v);
        const g = groups.get(k) || { count: 0, total: 0, voidTotal: 0, sortKey: groupBy === 'month' ? day(v.created_at).slice(0, 7) : k };
        g.count += 1;
        if (VOID.includes(v.approval_status)) g.voidTotal += num(v.amount); else g.total += num(v.amount);
        groups.set(k, g);
      });
      const rowsG = [...groups.entries()].sort((a, b) => groupBy === 'month' ? a[1].sortKey.localeCompare(b[1].sortKey) : b[1].total - a[1].total);
      const total = rowsG.reduce((s, [, g]) => s + g.total, 0);
      const label = { bank: 'Bank Account', payee: 'Payee', method: 'Payment Method', month: 'Month', expense: 'Expense #' }[groupBy];
      const sections: Section[] = [{
        heading: `Summary by ${label}`,
        head: [label, 'Vouchers', 'Amount (AED)', '% of total'],
        rows: rowsG.map(([k, g]) => [k, g.count, g.total, total ? `${((g.total / total) * 100).toFixed(1)}%` : '-']),
        foot: ['TOTAL', pvs.length, total, '100%'],
        money: [2],
      }];
      if (showDetail) sections.push({
        heading: 'Voucher detail',
        head: ['No', 'Voucher #', 'Date', label, 'Payee', 'Expense #', 'Method', 'Status', 'Amount (AED)'],
        rows: [...pvs].sort((a, b) => keyOf(a).localeCompare(keyOf(b)) || day(a.created_at).localeCompare(day(b.created_at)))
          .map((v, i) => [i + 1, v.voucher_number, formatDate(v.created_at), keyOf(v), v.payee_name, v.expense_reference || '-', v.payment_method || '-', v.approval_status, num(v.amount)]),
        money: [8],
      });
      const voidCount = pvs.filter(v => VOID.includes(v.approval_status)).length;
      return {
        title: 'Payment Voucher Summary',
        subtitle: `Grouped by ${label} · ${periodLabel}`,
        summary: [
          ['Period', periodLabel],
          ['Vouchers', String(pvs.length)],
          ['Total Paid', `AED ${fmtAmount(total)}`],
          ['Scope', pvScope === 'all' ? 'All vouchers' : pvScope === 'linked' ? 'Linked to expenses' : 'Not linked'],
          ...(voidCount ? [['Rejected / Cancelled (excluded)', String(voidCount)] as [string, string]] : []),
        ],
        sections,
      };
    }

    // ── 4. Property-wise expenses (shared expenses split by their allocation) ──
    const exps = expenses.filter(e => inRange(day(e.invoice_date || e.created_at), from, to) && (!cls || e.expense_class === cls));
    type Share = { e: any; prop: string; total: number; paid: number; balance: number; note: string };
    const shares: Share[] = [];
    exps.forEach(e => {
      const total = num(e.total_amount);
      const allocs: any[] = e.is_shared ? (e.allocations || []).filter((a: any) => a.property_id) : [];
      if (allocs.length) {
        allocs.forEach(a => {
          const amt = a.allocation_amount != null ? num(a.allocation_amount) : total * num(a.allocation_percentage) / 100;
          const ratio = total ? amt / total : 0;
          shares.push({ e, prop: propName(a.property_id), total: amt, paid: num(e.paid_amount) * ratio, balance: num(e.balance_amount) * ratio, note: `Shared ${(ratio * 100).toFixed(1)}%` });
        });
      } else {
        shares.push({ e, prop: propName(e.property_id), total, paid: num(e.paid_amount), balance: num(e.balance_amount), note: '' });
      }
    });
    const filteredShares = propertyFilter ? shares.filter(s => s.prop === propertyFilter) : shares;
    const byProp = new Map<string, { count: number; total: number; paid: number; balance: number; items: Share[] }>();
    filteredShares.forEach(s => {
      const g = byProp.get(s.prop) || { count: 0, total: 0, paid: 0, balance: 0, items: [] };
      g.count += 1; g.total += s.total; g.paid += s.paid; g.balance += s.balance; g.items.push(s);
      byProp.set(s.prop, g);
    });
    const props = [...byProp.entries()].sort((a, b) => b[1].total - a[1].total);
    const tot = props.reduce((a, [, g]) => ({ total: a.total + g.total, paid: a.paid + g.paid, bal: a.bal + g.balance }), { total: 0, paid: 0, bal: 0 });
    const sections: Section[] = [{
      heading: 'Summary by property',
      head: ['Property', 'Expenses', 'Total (AED)', 'Paid (AED)', 'Balance (AED)', '% of total'],
      rows: props.map(([p, g]) => [p, g.count, g.total, g.paid, g.balance, tot.total ? `${((g.total / tot.total) * 100).toFixed(1)}%` : '-']),
      foot: ['TOTAL', filteredShares.length, tot.total, tot.paid, tot.bal, '100%'],
      money: [2, 3, 4],
    }];
    if (showDetail) props.forEach(([p, g]) => sections.push({
      heading: `${p} - ${g.count} expense${g.count === 1 ? '' : 's'}`,
      head: ['No', 'Expense #', 'Invoice Date', 'Payee', 'Category', 'PVs', 'Total (AED)', 'Paid (AED)', 'Balance (AED)', 'Status'],
      rows: g.items.map((s, i) => [i + 1, s.note ? `${s.e.expense_reference}\n${s.note}` : s.e.expense_reference, formatDate(s.e.invoice_date || s.e.created_at),
        s.e.payee_name, categories[s.e.category_id] || '-', (s.e.payment_vouchers || []).map((v: any) => v.voucher_number).join('\n') || '-',
        s.total, s.paid, s.balance, s.e.payment_status]),
      foot: ['', 'Subtotal', '', '', '', '', g.total, g.paid, g.balance, ''],
      money: [6, 7, 8],
    }));
    return {
      title: 'Property-wise Expenses',
      subtitle: `${propertyFilter || 'All properties'} · ${periodLabel}`,
      summary: [
        ['Period', periodLabel],
        ['Properties', String(props.length)],
        ['Total Expenses', `AED ${fmtAmount(tot.total)}`],
        ['Paid', `AED ${fmtAmount(tot.paid)}`],
        ['Outstanding', `AED ${fmtAmount(tot.bal)}`],
      ],
      sections,
    };
  }, [type, expenseId, from, to, cls, groupBy, pvScope, showDetail, propertyFilter, expenses, vouchers, categories, properties]);

  const propertyOptions = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach(e => {
      s.add(propName(e.property_id));
      (e.allocations || []).forEach((a: any) => a.property_id && s.add(propName(a.property_id)));
    });
    return [...s].sort();
  }, [expenses, properties]);

  // ── Outputs ──
  const display = (s: Section, v: string | number, i: number) => (typeof v === 'number' && s.money?.includes(i) ? fmtAmount(v) : String(v ?? ''));
  const fileBase = () => (report?.title || 'Report').replace(/[^A-Za-z0-9]+/g, '_');

  const exportExcel = () => {
    if (!report) return;
    const aoa: any[][] = [[report.title], ...(report.subtitle ? [[report.subtitle]] : []), []];
    report.summary.forEach(([k, v]) => aoa.push([k, v]));
    const moneyCells: [number, number][] = [];
    report.sections.forEach(s => {
      aoa.push([]);
      if (s.heading) aoa.push([s.heading]);
      aoa.push(s.head);
      [...s.rows, ...(s.foot ? [s.foot] : [])].forEach(row => {
        const r = aoa.length;
        row.forEach((v, c) => { if (typeof v === 'number' && s.money?.includes(c)) moneyCells.push([r, c]); });
        aoa.push(row.map(v => (typeof v === 'string' ? v.replace(/\n/g, ', ') : v)));
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    moneyCells.forEach(([r, c]) => { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (cell) cell.z = '#,##0.00'; });
    const cols = Math.max(...aoa.map(r => r.length));
    ws['!cols'] = Array.from({ length: cols }, (_, c) => ({ wch: Math.min(40, Math.max(10, ...aoa.slice(3).map(r => String(r[c] ?? '').length + 2))) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileBase()}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const exportPdf = () => {
    if (!report) return;
    const blocks: PdfBlock[] = [{ kind: 'fields', pairs: report.summary }];
    report.sections.forEach(s => {
      if (s.heading) blocks.push({ kind: 'heading', text: s.heading });
      blocks.push({
        kind: 'table', head: s.head,
        body: s.rows.map(r => r.map((v, i) => display(s, v, i))),
        foot: s.foot ? [s.foot.map((v, i) => display(s, v, i))] : [],
        emptyMessage: 'No records.',
      });
    });
    renderPdf(blocks, { title: report.title, subtitle: report.subtitle, fileName: fileBase(), orientation: 'landscape' });
  };

  const types: { key: ReportType; label: string; icon: React.ReactNode; hint: string }[] = [
    { key: 'expense', label: 'By Expense No', icon: <ReceiptLongIcon fontSize="small" />, hint: 'One expense with all its payment vouchers' },
    { key: 'range', label: 'Date Range', icon: <DateRangeIcon fontSize="small" />, hint: 'Expenses incurred and PVs issued in a period' },
    { key: 'pv', label: 'PV Summary', icon: <SummarizeIcon fontSize="small" />, hint: 'Payment vouchers totalled by bank, payee, method, month or expense' },
    { key: 'property', label: 'Property-wise', icon: <ApartmentIcon fontSize="small" />, hint: 'Expenses, paid and balance per property' },
  ];

  const dateInputs = (
    <>
      <DatePicker label="From Date" format="DD/MM/YYYY" value={from ? dayjs(from) : null}
        onChange={v => setFrom(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
        slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...fieldSx, width: 170 } } }} />
      <DatePicker label="To Date" format="DD/MM/YYYY" value={to ? dayjs(to) : null}
        onChange={v => setTo(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
        slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...fieldSx, width: 170 } } }} />
    </>
  );
  const classInput = (
    <TextField select size="small" label="Class" value={cls} onChange={e => setCls(e.target.value)}
      slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...fieldSx, width: 140 }}>
      <MenuItem value="">All</MenuItem>
      <MenuItem value="General">General</MenuItem>
      <MenuItem value="Property">Property</MenuItem>
    </TextField>
  );
  const detailSwitch = (label: string) => (
    <FormControlLabel control={<Switch size="small" checked={showDetail} onChange={e => setShowDetail(e.target.checked)} />}
      label={<Typography variant="body2" sx={{ color: '#94a3b8' }}>{label}</Typography>} />
  );

  return (
    <Box>
      {/* Report type */}
      <ToggleButtonGroup exclusive value={type} onChange={(_, v) => v && setType(v)} sx={{ mb: 1, flexWrap: 'wrap', gap: 1,
        '& .MuiToggleButton-root': { color: '#94a3b8', borderColor: 'rgba(255,255,255,0.12) !important', borderRadius: '8px !important', textTransform: 'none', fontWeight: 600, gap: 0.8, px: 2 },
        '& .Mui-selected': { color: '#fff !important', background: 'linear-gradient(135deg, #6366f1, #8b5cf6) !important' } }}>
        {types.map(t => <ToggleButton key={t.key} value={t.key}>{t.icon}{t.label}</ToggleButton>)}
      </ToggleButtonGroup>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>{types.find(t => t.key === type)?.hint}</Typography>

      {/* Parameters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          {type === 'expense' && (
            <Autocomplete sx={{ width: 460, maxWidth: '100%' }} size="small"
              options={expenses}
              value={expenses.find(e => e.expense_id === expenseId) || null}
              onChange={(_, e) => setExpenseId(e?.expense_id || '')}
              getOptionLabel={e => `${e.expense_reference} — ${e.payee_name} (AED ${fmtAmount(e.total_amount)})`}
              isOptionEqualToValue={(o, v) => o.expense_id === v.expense_id}
              renderInput={params => <TextField {...params} label="Expense No" placeholder="Type expense # or payee" sx={fieldSx} />} />
          )}
          {type === 'range' && <>{dateInputs}{classInput}{detailSwitch('Include PVs issued in period')}</>}
          {type === 'pv' && <>
            {dateInputs}
            <TextField select size="small" label="Group by" value={groupBy} onChange={e => setGroupBy(e.target.value as any)} sx={{ ...fieldSx, width: 170 }}>
              <MenuItem value="bank">Bank Account</MenuItem>
              <MenuItem value="payee">Payee</MenuItem>
              <MenuItem value="method">Payment Method</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </TextField>
            <TextField select size="small" label="Vouchers" value={pvScope} onChange={e => setPvScope(e.target.value as any)} sx={{ ...fieldSx, width: 190 }}>
              <MenuItem value="all">All vouchers</MenuItem>
              <MenuItem value="linked">Linked to expenses</MenuItem>
              <MenuItem value="unlinked">Not linked</MenuItem>
            </TextField>
            {detailSwitch('Show voucher detail')}
          </>}
          {type === 'property' && <>
            {dateInputs}
            <TextField select size="small" label="Property" value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} sx={{ ...fieldSx, width: 240 }}>
              <MenuItem value="">All properties</MenuItem>
              {propertyOptions.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            {classInput}
            {detailSwitch('Show expenses per property')}
          </>}
          {type !== 'expense' && (
            <Button size="small" onClick={() => { setFrom(''); setTo(''); }} sx={{ color: '#64748b' }}>All dates</Button>
          )}
          <Box flex={1} />
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!report} onClick={() => report && printReport(report)}
            sx={{ color: '#818cf8', borderColor: '#818cf866' }}>Print</Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} disabled={!report} onClick={exportExcel}
            sx={{ color: '#10b981', borderColor: '#10b98166' }}>Excel</Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} disabled={!report} onClick={exportPdf}
            sx={{ color: '#f87171', borderColor: '#f8717166' }}>PDF</Button>
        </Box>
      </Paper>

      {/* Preview */}
      {!report ? (
        <Alert severity="info">Select an expense number to see its statement.</Alert>
      ) : (
        <Paper sx={{ p: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{report.title}</Typography>
          {report.subtitle && <Typography variant="caption" sx={{ color: '#64748b' }}>{report.subtitle}</Typography>}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1.5, my: 2 }}>
            {report.summary.map(([k, v]) => (
              <Box key={k} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.72rem' }}>{k}</Typography>
                <Typography sx={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 700, wordBreak: 'break-word' }}>{v}</Typography>
              </Box>
            ))}
          </Box>
          {report.sections.map((s, si) => (
            <Box key={si} mb={3}>
              {s.heading && <Typography variant="subtitle2" sx={{ color: '#a78bfa', fontWeight: 700, mb: 1 }}>{s.heading}</Typography>}
              {s.rows.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#64748b' }}>No records.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' } }}>
                        {s.head.map((h, i) => <TableCell key={i} align={s.money?.includes(i) ? 'right' : 'left'}>{h}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {s.rows.map((r, ri) => (
                        <TableRow key={ri} sx={{ '& td': { color: '#e2e8f0', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-line' } }}>
                          {r.map((v, i) => <TableCell key={i} align={s.money?.includes(i) || typeof v === 'number' ? 'right' : 'left'}>{display(s, v, i)}</TableCell>)}
                        </TableRow>
                      ))}
                      {s.foot && (
                        <TableRow sx={{ '& td': { color: '#e2e8f0', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(99,102,241,0.1)', borderBottom: 'none' } }}>
                          {s.foot.map((v, i) => <TableCell key={i} align={s.money?.includes(i) || typeof v === 'number' ? 'right' : 'left'}>{display(s, v, i)}</TableCell>)}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default ExpenseReports;
