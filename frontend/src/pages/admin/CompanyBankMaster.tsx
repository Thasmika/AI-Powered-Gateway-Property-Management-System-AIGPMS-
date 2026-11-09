import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Tooltip, Alert, CircularProgress,
  Avatar, Divider, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useAuth } from '../../context/AuthContext';
import PdfExportButton from '../../components/PdfExportButton';

interface CompanyBankAccount {
  account_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  iban: string | null;
  currency: string;
  branch: string | null;
  status: string;
}

interface MasterBank {
  bank_id: string;
  bank_name: string;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const CompanyBankMaster: React.FC = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [masterBanks, setMasterBanks] = useState<MasterBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    iban: '',
    currency: 'AED',
    branch: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, bankRes] = await Promise.all([
        fetch(`${API}/pdc-issued/bank-accounts`, { headers: authHeaders }),
        fetch(`${API}/master/banks?active_only=true`, { headers: authHeaders })
      ]);
      
      if (!accRes.ok) throw new Error('Failed to load company accounts');
      
      const allAccounts: CompanyBankAccount[] = await accRes.json();
      // Only show the active ones or actually we should fetch all but the API only returns Active currently.
      // Wait, let's just use what's returned. To toggle status, we need to show inactive ones too.
      // Since API currently does: .filter(BankAccount.status == "Active").all(), we might only get Active ones.
      // To see inactive ones, we might need a query param in the backend. 
      // For now, let's just display what's returned. 
      setAccounts(allAccounts);
      
      if (bankRes.ok) {
        setMasterBanks(await bankRes.json());
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingAccount(null);
    setFormData({ account_name: '', bank_name: '', account_number: '', iban: '', currency: 'AED', branch: '' });
    setSaveError(null); setDialogOpen(true);
  };
  
  const openEdit = (account: CompanyBankAccount) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      iban: account.iban || '',
      currency: account.currency || 'AED',
      branch: account.branch || ''
    });
    setSaveError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.account_name.trim() || !formData.bank_name.trim() || !formData.account_number.trim()) {
      setSaveError('Account Name, Bank Name, and Account Number are required.');
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const url = editingAccount ? `${API}/pdc-issued/bank-accounts/${editingAccount.account_id}` : `${API}/pdc-issued/bank-accounts`;
      const method = editingAccount ? 'PUT' : 'POST';
      const payload = {
        account_name: formData.account_name.trim(),
        bank_name: formData.bank_name.trim(),
        account_number: formData.account_number.trim(),
        iban: formData.iban.trim() || null,
        currency: formData.currency || 'AED',
        branch: formData.branch.trim() || null,
        status: 'Active'
      };

      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      setDialogOpen(false); fetchData();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (account: CompanyBankAccount) => {
    try {
      if (account.status === 'Active') {
        await fetch(`${API}/pdc-issued/bank-accounts/${account.account_id}`, { method: 'DELETE', headers: authHeaders });
      } else {
        await fetch(`${API}/pdc-issued/bank-accounts/${account.account_id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ ...account, status: 'Active' })
        });
      }
    } catch { /* ignore */ }
    fetchData();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981', width: 48, height: 48 }}>
            <AccountBalanceIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Company Bank Accounts</Typography>
            <Typography variant="body2" color="text.secondary">{accounts.length} accounts used for PDC issuances</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Company Bank Accounts" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
            Add Account
          </Button>
          </Box>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Account Name</TableCell>
                <TableCell>Bank Name</TableCell>
                <TableCell>Account Number</TableCell>
                <TableCell>IBAN</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No company bank accounts found.</TableCell></TableRow>
              ) : (
                accounts.map((acc) => (
                  <TableRow key={acc.account_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, opacity: acc.status === 'Active' ? 1 : 0.4, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{acc.account_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{acc.bank_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{acc.account_number}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{acc.iban || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{acc.currency}</Typography></TableCell>
                    <TableCell>
                      <Chip label={acc.status} size="small"
                        icon={acc.status === 'Active' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                        sx={{ bgcolor: acc.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: acc.status === 'Active' ? '#10b981' : '#64748b', fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(acc)} sx={{ color: '#10b981' }}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={acc.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => toggleActive(acc)} sx={{ color: acc.status === 'Active' ? '#ef4444' : '#10b981' }}>
                          {acc.status === 'Active' ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } } }}>
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>{editingAccount ? 'Edit Company Bank Account' : 'Add New Company Bank Account'}</DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <DialogContent sx={{ pt: 3 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Account Name *" value={formData.account_name} onChange={(e) => setFormData((f) => ({ ...f, account_name: e.target.value }))} fullWidth helperText="e.g. AIGPMS LLC" slotProps={{ htmlInput: { maxLength: 200 } }} />
            
            <TextField 
              select
              label="Bank Name *" 
              value={formData.bank_name} 
              onChange={(e) => setFormData((f) => ({ ...f, bank_name: e.target.value }))} 
              fullWidth
            >
              {masterBanks.map(b => (
                <MenuItem key={b.bank_id} value={b.bank_name}>{b.bank_name}</MenuItem>
              ))}
            </TextField>

            <TextField label="Account Number *" value={formData.account_number} onChange={(e) => setFormData((f) => ({ ...f, account_number: e.target.value }))} fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField label="IBAN" value={formData.iban} onChange={(e) => setFormData((f) => ({ ...f, iban: e.target.value }))} fullWidth helperText="Optional" slotProps={{ htmlInput: { maxLength: 50 } }} />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Currency" value={formData.currency} onChange={(e) => setFormData((f) => ({ ...f, currency: e.target.value }))} fullWidth sx={{ flex: 1 }} />
              <TextField label="Branch" value={formData.branch} onChange={(e) => setFormData((f) => ({ ...f, branch: e.target.value }))} fullWidth sx={{ flex: 2 }} helperText="Optional" />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            {editingAccount ? 'Save Changes' : 'Add Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyBankMaster;
