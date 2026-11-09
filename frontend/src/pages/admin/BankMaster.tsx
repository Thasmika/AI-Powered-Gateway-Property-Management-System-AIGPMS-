import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Tooltip, Alert, CircularProgress,
  Avatar, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useAuth } from '../../context/AuthContext';
import PdfExportButton from '../../components/PdfExportButton';

interface Bank {
  bank_id: string;
  bank_name: string;
  bank_code: string | null;
  country: string;
  is_active: boolean;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const BankMaster: React.FC = () => {
  const { token } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({ bank_name: '', bank_code: '', country: 'UAE' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchBanks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/master/banks?active_only=${!showAll}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load banks');
      setBanks(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders, showAll]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const openCreate = () => {
    setEditingBank(null); setFormData({ bank_name: '', bank_code: '', country: 'UAE' });
    setSaveError(null); setDialogOpen(true);
  };
  const openEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({ bank_name: bank.bank_name, bank_code: bank.bank_code || '', country: bank.country });
    setSaveError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.bank_name.trim()) { setSaveError('Bank name is required.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const url = editingBank ? `${API}/master/banks/${editingBank.bank_id}` : `${API}/master/banks`;
      const method = editingBank ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: authHeaders,
        body: JSON.stringify({ bank_name: formData.bank_name.trim(), bank_code: formData.bank_code.trim() || null, country: formData.country || 'UAE', is_active: true }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      setDialogOpen(false); fetchBanks();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (bank: Bank) => {
    try {
      if (bank.is_active) {
        await fetch(`${API}/master/banks/${bank.bank_id}`, { method: 'DELETE', headers: authHeaders });
      } else {
        await fetch(`${API}/master/banks/${bank.bank_id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ is_active: true }) });
      }
    } catch { /* ignore */ }
    fetchBanks();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <AccountBalanceIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Bank Master</Typography>
            <Typography variant="body2" color="text.secondary">{banks.length} banks registered</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setShowAll((v) => !v)}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
            {showAll ? 'Active Only' : 'Show All'}
          </Button>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Bank Master" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Bank
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
                <TableCell>#</TableCell>
                <TableCell>Bank Name</TableCell>
                <TableCell>SWIFT / BIC</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : banks.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No banks found.</TableCell></TableRow>
              ) : (
                banks.map((bank, idx) => (
                  <TableRow key={bank.bank_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, opacity: bank.is_active ? 1 : 0.4, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{idx + 1}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{bank.bank_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{bank.bank_code || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{bank.country}</Typography></TableCell>
                    <TableCell>
                      <Chip label={bank.is_active ? 'Active' : 'Inactive'} size="small"
                        icon={bank.is_active ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                        sx={{ bgcolor: bank.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: bank.is_active ? '#10b981' : '#64748b', fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(bank)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={bank.is_active ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => toggleActive(bank)} sx={{ color: bank.is_active ? '#ef4444' : '#10b981' }}>
                          {bank.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
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
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>{editingBank ? 'Edit Bank' : 'Add New Bank'}</DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <DialogContent sx={{ pt: 3 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Bank Name *" value={formData.bank_name} onChange={(e) => setFormData((f) => ({ ...f, bank_name: e.target.value }))} fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField label="SWIFT / BIC Code" value={formData.bank_code} onChange={(e) => setFormData((f) => ({ ...f, bank_code: e.target.value }))} fullWidth helperText="e.g. EBILAEAD" slotProps={{ htmlInput: { maxLength: 20 } }} />
            <TextField label="Country" value={formData.country} onChange={(e) => setFormData((f) => ({ ...f, country: e.target.value }))} fullWidth slotProps={{ htmlInput: { maxLength: 50 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            {editingBank ? 'Save Changes' : 'Add Bank'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BankMaster;
