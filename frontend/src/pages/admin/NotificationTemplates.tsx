import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Tooltip, Alert, CircularProgress,
  Avatar, Divider, MenuItem, Select, FormControl, InputLabel, Collapse, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAuth } from '../../context/AuthContext';

interface NotificationTemplate {
  template_id: string;
  template_code: string;
  template_name: string;
  module: string;
  subject: string | null;
  body_template: string;
  channel: string;
  is_active: boolean;
}

const MODULE_COLORS: Record<string, string> = {
  PDC: '#6366f1', 'PDC Issued': '#8b5cf6', Lease: '#10b981',
  Documents: '#f59e0b', Maintenance: '#06b6d4',
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const NotificationTemplates: React.FC = () => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState({ template_name: '', subject: '', body_template: '', channel: 'Dashboard' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTemplates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/master/notification-templates?active_only=true`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load templates');
      setTemplates(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openEdit = (tpl: NotificationTemplate) => {
    setEditingTpl(tpl);
    setFormData({ template_name: tpl.template_name, subject: tpl.subject || '', body_template: tpl.body_template, channel: tpl.channel });
    setSaveError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingTpl) return;
    if (!formData.body_template.trim()) { setSaveError('Message body is required.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const payload = { template_name: formData.template_name.trim(), subject: formData.subject.trim() || null, body_template: formData.body_template.trim(), channel: formData.channel };
      const res = await fetch(`${API}/master/notification-templates/${editingTpl.template_id}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      setDialogOpen(false); fetchTemplates();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const modules = Array.from(new Set(templates.map((t) => t.module)));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: '#8b5cf620', color: '#8b5cf6', width: 48, height: 48, mr: 2 }}>
          <NotificationsActiveIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Notification Templates</Typography>
          <Typography variant="body2" color="text.secondary">
            {templates.length} alert templates across {modules.length} modules
          </Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 2, p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Templates use <code style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 3 }}>{'{{placeholder}}'}</code> syntax.
          Available: <code style={{ color: '#6366f1' }}>cheque_number</code>, <code style={{ color: '#6366f1' }}>tenant_name</code>,
          <code style={{ color: '#6366f1' }}>amount</code>, <code style={{ color: '#6366f1' }}>cheque_date</code>,
          <code style={{ color: '#6366f1' }}>property_name</code>, <code style={{ color: '#6366f1' }}>lease_end_date</code>.
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        modules.map((mod) => (
          <Box key={mod} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip label={mod} size="small" sx={{ bgcolor: `${MODULE_COLORS[mod] || '#6366f1'}20`, color: MODULE_COLORS[mod] || '#6366f1', fontWeight: 700, fontSize: '0.75rem' }} />
              <Typography variant="caption" color="text.secondary">{templates.filter((t) => t.module === mod).length} templates</Typography>
            </Box>
            <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                      <TableCell sx={{ width: 32 }} />
                      <TableCell>Code</TableCell>
                      <TableCell>Template Name</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell align="center">Edit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.filter((t) => t.module === mod).map((tpl) => (
                      <React.Fragment key={tpl.template_id}>
                        <TableRow sx={{ '& td': { borderColor: expandedRow === tpl.template_id ? 'transparent' : 'rgba(255,255,255,0.04)' }, cursor: 'pointer', '&:hover': { background: 'rgba(255,255,255,0.02)' } }}
                          onClick={() => setExpandedRow(expandedRow === tpl.template_id ? null : tpl.template_id)}>
                          <TableCell sx={{ py: 1 }}>
                            {expandedRow === tpl.template_id
                              ? <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              : <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#f59e0b', bgcolor: 'rgba(245,158,11,0.08)', px: 1, py: 0.3, borderRadius: 1 }}>
                              {tpl.template_code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{tpl.template_name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={tpl.channel} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '0.7rem', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Edit template">
                              <IconButton size="small" onClick={() => openEdit(tpl)} sx={{ color: '#8b5cf6' }}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0, borderColor: expandedRow === tpl.template_id ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                            <Collapse in={expandedRow === tpl.template_id}>
                              <Box sx={{ py: 2, px: 3, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, mb: 1 }}>
                                {tpl.subject && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}><strong style={{ color: '#94a3b8' }}>Subject:</strong> {tpl.subject}</Typography>}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}><strong style={{ color: '#94a3b8' }}>Message:</strong></Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: '#e2e8f0' }}>{tpl.body_template}</Typography>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } } }}>
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>Edit Template: {editingTpl?.template_code}</DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <DialogContent sx={{ pt: 3 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Template Name" value={formData.template_name} onChange={(e) => setFormData((f) => ({ ...f, template_name: e.target.value }))} fullWidth />
            <TextField label="Email Subject (optional)" value={formData.subject} onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))} fullWidth />
            <TextField label="Message Body *" value={formData.body_template} onChange={(e) => setFormData((f) => ({ ...f, body_template: e.target.value }))} fullWidth multiline rows={4} helperText="Use {{placeholder}} for dynamic values" />
            <FormControl fullWidth>
              <InputLabel>Delivery Channel</InputLabel>
              <Select value={formData.channel} label="Delivery Channel" onChange={(e) => setFormData((f) => ({ ...f, channel: e.target.value }))}>
                <MenuItem value="Dashboard">Dashboard Only</MenuItem>
                <MenuItem value="Email">Email</MenuItem>
                <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                <MenuItem value="All">All Channels</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationTemplates;
