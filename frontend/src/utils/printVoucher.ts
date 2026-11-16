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
