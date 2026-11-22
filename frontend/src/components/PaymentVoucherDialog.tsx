import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Button, TextField, MenuItem, CircularProgress, Alert, Stack, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';

export const PAYEE_TYPES = ['Supplier', 'Contractor', 'Bank', 'Loan Provider', 'Sister Company', 'Other'];
export const PAYMENT_METHODS = ['Cheque', 'Transfer', 'PDC', 'Cash', 'Other'];

export interface Payee { supplier_id: string; supplier_name: string; supplier_type: string | null; }
export interface BankAccount { account_id: string; account_name: string; bank_name: string; account_number: string; }

export const bankLabel = (b: BankAccount) => `${b.bank_name} — ${b.account_name} (${b.account_number})`;
export const fmtAmount = (v: any) => parseFloat(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_FORM = {
  expense_id: '', payee_id: '', payee_name: '', payee_type: '', bank_account_id: '', amount: '', currency: 'AED',
  purpose: '', payment_method: '', notes: '',
};
const EMPTY_PAYEE = { supplier_name: '', supplier_type: '', contact_number: '', email: '' };
const EMPTY_BANK = { bank_name: '', account_name: '', account_number: '', iban: '', branch: '' };

const inputSx = {
  '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
  '& label': { color: '#94a3b8' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
  '& .MuiSvgIcon-root': { color: '#94a3b8' },
  '& .MuiFormHelperText-root': { color: '#64748b' },
};
const dialogPaperSx = { background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (voucher: any, isEdit: boolean) => void;
  /** Voucher being edited (omit to create). */
  voucher?: any | null;
  /** Expense the voucher is issued under — locks the expense selection. */
  expense?: any | null;
  /** Expenses offered for linking when no expense is locked. */
  expenses?: any[];
}

const PaymentVoucherDialog: React.FC<Props> = ({ open, onClose, onSaved, voucher, expense, expenses = [] }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payees, setPayees] = useState<Payee[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);

  const [payeeDialog, setPayeeDialog] = useState(false);
  const [newPayee, setNewPayee] = useState(EMPTY_PAYEE);
  const [bankDialog, setBankDialog] = useState(false);
  const [newBank, setNewBank] = useState(EMPTY_BANK);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const isEdit = !!voucher;

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get('/master/suppliers', { params: { active_only: true } }).catch(() => ({ data: [] })),
      api.get('/pdc-issued/bank-accounts').catch(() => ({ data: [] })),
    ]).then(([p, b]) => {
      setPayees(p.data);
      setBanks(b.data);
      // A new voucher under an expense defaults to the expense's payee when it exists in the payee master.
      if (!voucher && expense?.payee_name) {
        const match = (p.data as Payee[]).find(x => x.supplier_name.trim().toLowerCase() === expense.payee_name.trim().toLowerCase());
        if (match) setForm(f => f.payee_id ? f : ({
          ...f, payee_id: match.supplier_id, payee_name: match.supplier_name,
          payee_type: match.supplier_type && PAYEE_TYPES.includes(match.supplier_type) ? match.supplier_type : f.payee_type,
        }));
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (voucher) {
      setForm({
        expense_id: voucher.expense_id || '',
        payee_id: voucher.payee_id || '',
        payee_name: voucher.payee_name || '',
        payee_type: voucher.payee_type || '',
        bank_account_id: voucher.bank_account_id || '',
        amount: voucher.amount != null ? String(voucher.amount) : '',
        currency: voucher.currency || 'AED',
        purpose: voucher.purpose || '',
        payment_method: voucher.payment_method || '',
        notes: voucher.notes || '',
      });
    } else {
      const balance = expense ? parseFloat(expense.balance_amount || 0) : 0;
      setForm({
        ...EMPTY_FORM,
        expense_id: expense?.expense_id || '',
        amount: expense && balance > 0 ? balance.toFixed(2) : '',
        purpose: expense ? (expense.description || `Payment for ${expense.expense_reference}`) : '',
        payment_method: expense?.payment_method && PAYMENT_METHODS.includes(expense.payment_method) ? expense.payment_method : '',
      });
    }
  }, [open, voucher, expense]);

  const linkedExpense = expense || expenses.find(e => e.expense_id === form.expense_id) || null;
  // Amount still payable for the linked expense; when editing, this voucher's own amount is available again.
  const available = linkedExpense
    ? parseFloat(linkedExpense.balance_amount || 0)
      + (voucher && voucher.expense_id === linkedExpense.expense_id && !['Rejected', 'Cancelled'].includes(voucher.approval_status)
        ? parseFloat(voucher.amount || 0) : 0)
    : null;

  const handleSave = async () => {
    if (!form.payee_id || !form.amount) return setError('Payee and amount are required');
    if (!form.bank_account_id && form.payment_method !== 'Cash') return setError('Select the bank account the payment is issued from (not required for Cash)');
    const amt = parseFloat(form.amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0');
    if (available != null && amt > available + 0.005) return setError(`Amount exceeds the expense balance of AED ${fmtAmount(available)}`);
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      amount: amt,
      expense_id: form.expense_id || null,
      payee_type: form.payee_type || null,
      bank_account_id: form.bank_account_id || null,
      payment_method: form.payment_method || null,
      purpose: form.purpose || null,
      notes: form.notes || null,
    };
    try {
      const res = isEdit
        ? await api.put(`/loans/payment-vouchers/${voucher.voucher_id}`, payload)
        : await api.post('/loans/payment-vouchers', payload);
      onSaved(res.data, isEdit);
    } catch (e: any) {
      const d = e.response?.data?.detail;
      setError(typeof d === 'string' ? d : (isEdit ? 'Failed to update voucher' : 'Failed to create voucher'));
    } finally {
      setSaving(false);
    }
  };

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

  const bankMissing = !!error && !form.bank_account_id && form.payment_method !== 'Cash';
  // Expenses that can still take a payment, plus the one currently selected.
  const expenseOptions = expenses.filter(e => e.expense_id === form.expense_id || parseFloat(e.balance_amount || 0) > 0);

  return (
    <>
      <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>
          {isEdit ? `Edit Payment Voucher ${voucher.voucher_number}` : 'New Payment Voucher'}
          {linkedExpense && (
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
              Under expense <b style={{ color: '#a5b4fc' }}>{linkedExpense.expense_reference}</b> · {linkedExpense.payee_name} ·
              Total AED {fmtAmount(linkedExpense.total_amount)} · Available AED {fmtAmount(available)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {!expense && (
              <Grid size={12}>
                <Autocomplete
                  options={expenseOptions}
                  value={expenses.find(e => e.expense_id === form.expense_id) || null}
                  onChange={(_, e) => setForm(f => ({ ...f, expense_id: e?.expense_id || '' }))}
                  getOptionLabel={e => `${e.expense_reference} — ${e.payee_name} (balance AED ${fmtAmount(e.balance_amount)})`}
                  isOptionEqualToValue={(o, v) => o.expense_id === v.expense_id}
                  renderInput={params => <TextField {...params} label="Expense" helperText="Optional — leave empty for payments not tied to an expense (e.g. loans)" sx={inputSx} />}
                />
              </Grid>
            )}
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
                  renderInput={params => <TextField {...params} label="Payee *" error={!!error && !form.payee_id} sx={inputSx} />}
                />
                <Tooltip title="Add new payee">
                  <IconButton onClick={() => { setNewPayee({ ...EMPTY_PAYEE, supplier_name: expense?.payee_name || '' }); setDialogError(null); setPayeeDialog(true); }}
                    sx={{ mt: 1, color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.4)' }}>
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
            <Grid size={{ xs: 12, sm: 8 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  fullWidth
                  options={banks}
                  value={banks.find(b => b.account_id === form.bank_account_id) || null}
                  onChange={(_, b) => setForm(f => ({ ...f, bank_account_id: b?.account_id || '' }))}
                  getOptionLabel={bankLabel}
                  isOptionEqualToValue={(o, v) => o.account_id === v.account_id}
                  noOptionsText="No bank accounts — click + to add one"
                  renderInput={params => <TextField {...params} label={form.payment_method === 'Cash' ? 'Paid From (Bank)' : 'Paid From (Bank) *'}
                    error={bankMissing} helperText={bankMissing ? 'Required unless method is Cash' : undefined} sx={inputSx} />}
                />
                <Tooltip title="Add new bank account">
                  <IconButton onClick={() => { setNewBank(EMPTY_BANK); setDialogError(null); setBankDialog(true); }}
                    sx={{ mt: 1, color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.4)' }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Amount (AED) *" type="number" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                helperText={available != null ? `Max AED ${fmtAmount(available)}` : undefined}
                error={available != null && parseFloat(form.amount || '0') > available + 0.005}
                sx={inputSx} />
            </Grid>
            <Grid size={12}><TextField fullWidth label="Purpose" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} sx={inputSx} /></Grid>
            <Grid size={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} sx={inputSx} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', fontWeight: 600, borderRadius: 2 }}>
            {saving ? 'Saving…' : isEdit ? 'Update Voucher' : 'Create Voucher'}
          </Button>
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
    </>
  );
};

export default PaymentVoucherDialog;
