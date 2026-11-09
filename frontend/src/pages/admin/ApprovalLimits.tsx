import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Tooltip, Alert, CircularProgress,
  Avatar, Divider, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../../context/AuthContext';
import PdfExportButton from '../../components/PdfExportButton';

interface ApprovalLimit {
  limit_id: string;
  module: string;
  role_name: string;
  auto_approve_threshold: number | null;
  currency: string;
  requires_md_above: number | null;
  notes: string | null;
  is_active: boolean;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const MODULE_COLORS: Record<string, string> = {
  'Expense': '#f59e0b', 'PDC Issued': '#6366f1', 'Payment Voucher': '#10b981',
};

const ApprovalLimits: React.FC = () => {
  const { token } = useAuth();
  const [limits, setLimits] = useState<ApprovalLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<ApprovalLimit | null>(null);
  const [formData, setFormData] = useState({ auto_approve_threshold: '', requires_md_above: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchLimits = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/master/approval-limits`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load approval limits');
      setLimits(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const openEdit = (limit: ApprovalLimit) => {
    setEditingLimit(limit);
    setFormData({ auto_approve_threshold: limit.auto_approve_threshold?.toString() || '', requires_md_above: limit.requires_md_above?.toString() || '', notes: limit.notes || '' });
    setSaveError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingLimit) return;
    setSaving(true); setSaveError(null);
    try {
      const payload: Record<string, unknown> = {
        notes: formData.notes || null,
        auto_approve_threshold: formData.auto_approve_threshold !== '' ? parseFloat(formData.auto_approve_threshold) : null,
        requires_md_above: formData.requires_md_above !== '' ? parseFloat(formData.requires_md_above) : null,
      };
      const res = await fetch(`${API}/master/approval-limits/${editingLimit.limit_id}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      setDialogOpen(false); fetchLimits();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const modules = Array.from(new Set(limits.map((l) => l.module)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: '#ef444420', color: '#ef4444', width: 48, height: 48, mr: 2 }}>
          <AdminPanelSettingsIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Approval Limits</Typography>
          <Typography variant="body2" color="text.secondary">Role-based financial authorization thresholds</Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}><PdfExportButton title="Approval Limits" /></Box>
      </Box>

      <Paper elevation={0} sx={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 2, p: 2.5, mb: 3, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <InfoOutlinedIcon sx={{ color: '#ef4444', mt: 0.3, flexShrink: 0 }} />
        <Typography variant="body2" color="text.secondary">
          <strong style={{ color: 'white' }}>Auto-approve threshold</strong>: amounts up to this value are auto-approved.{' '}
          <strong style={{ color: 'white' }}>Requires MD above</strong>: amounts exceeding this require MD approval. Leave blank = all require approval.
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        modules.map((mod) => (
          <Box key={mod} sx={{ mb: 3 }}>
            <Chip label={mod} size="small" sx={{ mb: 1.5, bgcolor: `${MODULE_COLORS[mod] || '#6366f1'}20`, color: MODULE_COLORS[mod] || '#6366f1', fontWeight: 700, fontSize: '0.75rem' }} />
            <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                      <TableCell>Role</TableCell>
                      <TableCell>Auto-Approve Up To (AED)</TableCell>
                      <TableCell>Requires MD Above (AED)</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="center">Edit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {limits.filter((l) => l.module === mod).map((limit) => (
                      <TableRow key={limit.limit_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell>
                          <Chip label={limit.role_name} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, fontSize: '0.72rem' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: limit.auto_approve_threshold !== null ? '#10b981' : 'text.secondary' }}>
                            {limit.auto_approve_threshold !== null ? `AED ${Number(limit.auto_approve_threshold).toLocaleString()}` : 'All require approval'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: limit.requires_md_above !== null ? '#f59e0b' : 'text.secondary' }}>
                            {limit.requires_md_above !== null ? `> AED ${Number(limit.requires_md_above).toLocaleString()}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', maxWidth: 300 }}>{limit.notes || '—'}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit threshold">
                            <IconButton size="small" onClick={() => openEdit(limit)} sx={{ color: '#6366f1' }}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } } }}>
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>
          Edit — {editingLimit?.module} / {editingLimit?.role_name}
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <DialogContent sx={{ pt: 3 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Auto-Approve Threshold" value={formData.auto_approve_threshold}
              onChange={(e) => setFormData((f) => ({ ...f, auto_approve_threshold: e.target.value }))}
              type="number" fullWidth helperText="Leave blank = all require approval."
              slotProps={{ input: { startAdornment: <InputAdornment position="start">AED</InputAdornment> } }} />
            <TextField label="Requires MD Approval Above" value={formData.requires_md_above}
              onChange={(e) => setFormData((f) => ({ ...f, requires_md_above: e.target.value }))}
              type="number" fullWidth helperText="Leave blank if no MD escalation applies."
              slotProps={{ input: { startAdornment: <InputAdornment position="start">AED</InputAdornment> } }} />
            <TextField label="Notes" value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Save Threshold
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalLimits;
