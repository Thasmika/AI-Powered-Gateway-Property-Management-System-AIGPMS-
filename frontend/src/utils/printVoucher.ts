/**
 * Payment Voucher print utility.
 * Opens a clean, white A4 voucher in a new window and triggers the browser print dialog
 * (where the user can print or "Save as PDF").
 */
import { formatDate } from './dateUtils';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const below1000 = (n: number): string => {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')); }
  else if (n > 0) { parts.push(ONES[n]); }
  return parts.join(' ');
};

const integerToWords = (n: number): string => {
  if (n === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const parts: string[] = [];
  let i = 0;
  while (n > 0 && i < scales.length) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${below1000(chunk)}${scales[i] ? ' ' + scales[i] : ''}`);
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(' ');
};

export const amountToWords = (amount: number, currency = 'AED'): string => {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const fils = cents % 100;
  const sub = currency === 'AED' ? 'Fils' : 'Cents';
  return `${currency} ${integerToWords(whole)}${fils ? ` and ${integerToWords(fils)} ${sub}` : ''} Only`;
};

const esc = (v: any) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtAmount = (v: any) =>
  parseFloat(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const printPaymentVoucher = (v: any) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    alert('Please allow pop-ups for this site to print the voucher.');
    return;
  }
  const currency = v.currency || 'AED';
  const amount = parseFloat(v.amount || 0);
  const date = v.created_at ? formatDate(v.created_at) : '—';
  const row = (label: string, value: any) =>
    `<tr><th>${esc(label)}</th><td>${value ? esc(value) : '—'}</td></tr>`;

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Payment Voucher ${esc(v.voucher_number)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 13px; }
  .voucher { max-width: 760px; margin: 0 auto; border: 2px solid #222; padding: 24px 28px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 12px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  .brand small { display: block; font-size: 11px; font-weight: 400; color: #555; letter-spacing: 0; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 20px; letter-spacing: 2px; }
  .meta { margin-top: 6px; font-size: 12px; }
  .meta b { display: inline-block; min-width: 70px; text-align: left; }
  table.fields { width: 100%; border-collapse: collapse; margin-top: 18px; }
  table.fields th, table.fields td { border: 1px solid #999; padding: 8px 10px; text-align: left; vertical-align: top; }
  table.fields th { width: 30%; background: #f2f2f2; font-weight: 600; }
  .amount-box { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; border: 2px solid #222; padding: 10px 14px; }
  .amount-box .label { font-weight: 700; }
  .amount-box .value { font-size: 18px; font-weight: 800; }
  .words { margin-top: 8px; font-style: italic; }
  .signs { display: flex; justify-content: space-between; gap: 24px; margin-top: 70px; }
  .signs div { flex: 1; border-top: 1px solid #222; padding-top: 6px; text-align: center; font-size: 12px; }
  .foot { margin-top: 24px; font-size: 10px; color: #777; text-align: center; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="voucher">
    <div class="head">
      <div class="brand">AIGPMS<small>Property Management System</small></div>
      <div class="title">
        <h1>PAYMENT VOUCHER</h1>
        <div class="meta"><b>Voucher #</b> ${esc(v.voucher_number)}</div>
        <div class="meta"><b>Date</b> ${esc(date)}</div>
        <div class="meta"><b>Status</b> ${esc(v.approval_status || '—')}</div>
      </div>
    </div>
    <table class="fields">
      ${row('Paid To', v.payee_name)}
      ${row('Payee Type', v.payee_type)}
      ${row('Payment Method', v.payment_method)}
      ${row('Paid From (Bank)', v.bank_name ? `${v.bank_name} — ${v.bank_account_name || ''} (${v.bank_account_number || ''})` : '')}
      ${row('Purpose', v.purpose)}
      ${row('Notes', v.notes)}
    </table>
    <div class="amount-box">
      <span class="label">Amount</span>
      <span class="value">${esc(currency)} ${fmtAmount(amount)}</span>
    </div>
    <div class="words"><b>Amount in words:</b> ${esc(amountToWords(amount, currency))}</div>
    <div class="signs">
      <div>Prepared By</div>
      <div>Approved By</div>
      <div>Received By</div>
    </div>
    <div class="foot">Printed on ${esc(formatDate(new Date().toISOString()))}</div>
  </div>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
  win.document.close();
};

// ─────────────────────────────────────────────────────────────────────────────
// Expense sheet + list reports (Expenses & PV page)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 20px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  .brand small { display: block; font-size: 11px; font-weight: 400; color: #555; letter-spacing: 0; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 18px; letter-spacing: 1.5px; }
  .meta { margin-top: 4px; font-size: 11px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  table.fields th, table.fields td { border: 1px solid #999; padding: 6px 9px; text-align: left; vertical-align: top; }
  table.fields th { width: 22%; background: #f2f2f2; font-weight: 600; }
  table.list th, table.list td { border: 1px solid #bbb; padding: 5px 6px; text-align: left; vertical-align: top; }
  table.list th { background: #222; color: #fff; font-size: 11px; }
  table.list td.num, table.list th.num { text-align: right; white-space: nowrap; }
  table.list tfoot td { font-weight: 700; background: #eef; }
  tr { page-break-inside: avoid; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .summary div { flex: 1 1 160px; border: 1px solid #999; padding: 7px 9px; }
  .summary b { display: block; font-size: 14px; margin-top: 2px; }
  .filters { font-size: 11px; color: #444; margin-bottom: 10px; }
  h3 { font-size: 13px; margin: 18px 0 6px; }
  .signs { display: flex; justify-content: space-between; gap: 24px; margin-top: 60px; }
  .signs div { flex: 1; border-top: 1px solid #222; padding-top: 6px; text-align: center; font-size: 12px; }
  .foot { margin-top: 18px; font-size: 10px; color: #777; text-align: center; }
  @media print { body { padding: 0; } }
`;

const openPrintWindow = (title: string, body: string, landscape = false) => {
  const win = window.open('', '_blank', 'width=1000,height=1000');
  if (!win) {
    alert('Please allow pop-ups for this site to print.');
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${BASE_CSS}${landscape ? '@page { size: A4 landscape; }' : ''}</style></head>
<body>${body}
<div class="foot">Printed on ${esc(formatDate(new Date().toISOString()))}</div>
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
  win.document.close();
};

const header = (heading: string, metaLines: string[]) => `
  <div class="head">
    <div class="brand">AIGPMS<small>Property Management System</small></div>
    <div class="title"><h1>${esc(heading)}</h1>${metaLines.map(m => `<div class="meta">${m}</div>`).join('')}</div>
  </div>`;

/** One expense with the payment vouchers issued against it. */
export const printExpense = (e: any, names: { category?: string; property?: string } = {}) => {
  const row = (label: string, value: any) => `<tr><th>${esc(label)}</th><td>${value ? esc(value) : '—'}</td></tr>`;
  const pvs: any[] = e.payment_vouchers || [];
  const pvRows = pvs.map((v, i) => `<tr>
      <td>${i + 1}</td><td>${esc(v.voucher_number)}</td><td>${esc(v.created_at ? formatDate(v.created_at) : '—')}</td>
      <td>${esc(v.payee_name)}</td><td>${esc(v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '—')}</td>
      <td>${esc(v.payment_method || '—')}</td><td>${esc(v.approval_status)}</td><td class="num">${fmtAmount(v.amount)}</td></tr>`).join('');
  openPrintWindow(`Expense ${e.expense_reference}`, `
    ${header('EXPENSE', [`<b>Ref</b> ${esc(e.expense_reference)}`, `<b>Class</b> ${esc(e.expense_class)}`, `<b>Payment</b> ${esc(e.payment_status || '—')}`])}
    <table class="fields">
      ${row('Payee / Supplier', e.payee_name)}
      ${row('Category', names.category)}
      ${e.expense_class === 'Property' ? row('Property', names.property) : ''}
      ${row('Invoice Date', e.invoice_date ? formatDate(e.invoice_date) : '')}
      ${row('Invoice Number', e.invoice_number)}
      ${row('Description', e.description)}
      ${row('Notes', e.notes)}
      ${row('Base Amount', `AED ${fmtAmount(e.amount)}`)}
      ${row('Tax Amount', `AED ${fmtAmount(e.tax_amount)}`)}
      ${row('Total Amount', `AED ${fmtAmount(e.total_amount)}`)}
      ${row('Paid', `AED ${fmtAmount(e.paid_amount)}`)}
      ${row('Balance', `AED ${fmtAmount(e.balance_amount)}`)}
    </table>
    <h3>Payment Vouchers (${pvs.length})</h3>
    ${pvs.length ? `<table class="list">
      <thead><tr><th>No</th><th>Voucher #</th><th>Date</th><th>Payee</th><th>Paid From</th><th>Method</th><th>Status</th><th class="num">Amount (AED)</th></tr></thead>
      <tbody>${pvRows}</tbody>
      <tfoot><tr><td colspan="7">Total paid</td><td class="num">${fmtAmount(e.paid_amount)}</td></tr></tfoot>
    </table>` : '<div>No payment vouchers issued for this expense.</div>'}
    <div class="signs"><div>Prepared By</div><div>Checked By</div><div>Approved By</div></div>`);
};

/** Generic report: summary boxes + one or more titled tables. Numbers in `money` columns are formatted. */
export interface PrintReportSection {
  heading?: string;
  head: string[];
  rows: (string | number)[][];
  foot?: (string | number)[];
  money?: number[];
}
export const printReport = (r: { title: string; subtitle?: string; summary?: [string, string][]; sections: PrintReportSection[] }) => {
  const cell = (s: PrintReportSection, v: string | number, i: number) => {
    const money = s.money?.includes(i);
    const txt = typeof v === 'number' && money ? fmtAmount(v) : String(v ?? '');
    return `<td${money || typeof v === 'number' ? ' class="num"' : ''}>${esc(txt).replace(/\n/g, '<br>')}</td>`;
  };
  const body = r.sections.map(s => `
    ${s.heading ? `<h3>${esc(s.heading)}</h3>` : ''}
    ${s.rows.length === 0 ? '<div>No records.</div>' : `<table class="list">
      <thead><tr>${s.head.map((h, i) => `<th${s.money?.includes(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${s.rows.map(row => `<tr>${row.map((v, i) => cell(s, v, i)).join('')}</tr>`).join('')}</tbody>
      ${s.foot ? `<tfoot><tr>${s.foot.map((v, i) => cell(s, v, i)).join('')}</tr></tfoot>` : ''}
    </table>`}`).join('');
  openPrintWindow(r.title, `
    ${header(r.title.toUpperCase(), r.subtitle ? [esc(r.subtitle)] : [])}
    ${r.summary?.length ? `<div class="summary">${r.summary.map(([k, v]) => `<div>${esc(k)}<b>${esc(v)}</b></div>`).join('')}</div>` : ''}
    ${body}`, true);
};

interface ListOpts { filters?: string; names?: { category: Record<string, string>; property: Record<string, string> } }

/** List of expenses only (no PV rows). */
export const printExpenseList = (expenses: any[], opts: ListOpts = {}) => {
  const n = opts.names || { category: {}, property: {} };
  const sum = (k: string) => expenses.reduce((s, e) => s + parseFloat(e[k] || 0), 0);
  const rows = expenses.map((e, i) => `<tr>
      <td>${i + 1}</td><td>${esc(e.expense_reference)}</td><td>${esc(e.expense_class)}</td>
      <td>${esc(e.invoice_date ? formatDate(e.invoice_date) : '—')}</td><td>${esc(e.payee_name)}</td>
      <td>${esc(n.category[e.category_id] || '—')}</td><td>${esc((e.property_id && n.property[e.property_id]) || '—')}</td>
      <td class="num">${fmtAmount(e.total_amount)}</td><td class="num">${fmtAmount(e.paid_amount)}</td>
      <td class="num">${fmtAmount(e.balance_amount)}</td><td>${esc(e.payment_status)}</td><td class="num">${e.voucher_count || 0}</td></tr>`).join('');
  openPrintWindow('Expenses Report', `
    ${header('EXPENSES REPORT', [`<b>Records</b> ${expenses.length}`])}
    ${opts.filters ? `<div class="filters"><b>Filters:</b> ${esc(opts.filters)}</div>` : ''}
    <div class="summary">
      <div>Total Expenses<b>AED ${fmtAmount(sum('total_amount'))}</b></div>
      <div>Paid<b>AED ${fmtAmount(sum('paid_amount'))}</b></div>
      <div>Outstanding<b>AED ${fmtAmount(sum('balance_amount'))}</b></div>
    </div>
    <table class="list">
      <thead><tr><th>No</th><th>Expense #</th><th>Class</th><th>Invoice Date</th><th>Payee</th><th>Category</th><th>Property</th>
        <th class="num">Total (AED)</th><th class="num">Paid</th><th class="num">Balance</th><th>Payment</th><th class="num">PVs</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="7">TOTAL</td><td class="num">${fmtAmount(sum('total_amount'))}</td><td class="num">${fmtAmount(sum('paid_amount'))}</td>
        <td class="num">${fmtAmount(sum('balance_amount'))}</td><td></td><td></td></tr></tfoot>
    </table>`, true);
};

/** List of payment vouchers only (no expense detail). */
export const printVoucherList = (vouchers: any[], opts: ListOpts = {}) => {
  const total = vouchers.reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const rows = vouchers.map((v, i) => `<tr>
      <td>${i + 1}</td><td>${esc(v.voucher_number)}</td><td>${esc(v.created_at ? formatDate(v.created_at) : '—')}</td>
      <td>${esc(v.expense_reference || '—')}</td><td>${esc(v.payee_name)}</td>
      <td>${esc(v.bank_name ? `${v.bank_name} (${v.bank_account_number || ''})` : '—')}</td><td>${esc(v.payment_method || '—')}</td>
      <td>${esc(v.purpose || '—')}</td><td>${esc(v.approval_status)}</td><td class="num">${fmtAmount(v.amount)}</td></tr>`).join('');
  openPrintWindow('Payment Vouchers Report', `
    ${header('PAYMENT VOUCHERS REPORT', [`<b>Records</b> ${vouchers.length}`])}
    ${opts.filters ? `<div class="filters"><b>Filters:</b> ${esc(opts.filters)}</div>` : ''}
    <div class="summary"><div>Vouchers<b>${vouchers.length}</b></div><div>Total Paid<b>AED ${fmtAmount(total)}</b></div></div>
    <table class="list">
      <thead><tr><th>No</th><th>Voucher #</th><th>Date</th><th>Expense #</th><th>Payee</th><th>Paid From</th><th>Method</th><th>Purpose</th><th>Status</th><th class="num">Amount (AED)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="9">TOTAL</td><td class="num">${fmtAmount(total)}</td></tr></tfoot>
    </table>`, true);
};
