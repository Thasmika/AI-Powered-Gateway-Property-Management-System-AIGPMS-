import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Tooltip, Alert, CircularProgress,
  Avatar, Divider, ToggleButtonGroup, ToggleButton, MenuItem, Select,
  FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CategoryIcon from '@mui/icons-material/Category';
import { useAuth } from '../../context/AuthContext';

interface ExpenseCategory {
  category_id: string;
  category_name: string;
  expense_class: 'General' | 'Property';
  gl_code: string | null;
  is_active: boolean;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const ExpenseCategoryMaster: React.FC = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<'All' | 'General' | 'Property'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({ category_name: '', expense_class: 'General', gl_code: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchCategories = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ active_only: 'true' });
      if (classFilter !== 'All') params.append('expense_class', classFilter);
      const res = await fetch(`${API}/master/expense-categories?${params}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load categories');
      setCategories(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, classFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditingCat(null); setFormData({ category_name: '', expense_class: 'General', gl_code: '' });
    setSaveError(null); setDialogOpen(true);
  };
  const openEdit = (cat: ExpenseCategory) => {
    setEditingCat(cat);
    setFormData({ category_name: cat.category_name, expense_class: cat.expense_class, gl_code: cat.gl_code || '' });
    setSaveError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.category_name.trim()) { setSaveError('Category name is required.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const url = editingCat ? `${API}/master/expense-categories/${editingCat.category_id}` : `${API}/master/expense-categories`;
      const method = editingCat ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: authHeaders,
        body: JSON.stringify({ category_name: formData.category_name.trim(), expense_class: formData.expense_class, gl_code: formData.gl_code.trim() || null, is_active: true }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed'); }
      setDialogOpen(false); fetchCategories();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (cat: ExpenseCategory) => {
    await fetch(`${API}/master/expense-categories/${cat.category_id}`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ is_active: false }),
    });
    fetchCategories();
  };

  const generalCount = categories.filter((c) => c.expense_class === 'General').length;
  const propertyCount = categories.filter((c) => c.expense_class === 'Property').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#f59e0b20', color: '#f59e0b', width: 48, height: 48 }}>
            <CategoryIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Expense Categories</Typography>
            <Typography variant="body2" color="text.secondary">{generalCount} General · {propertyCount} Property</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ToggleButtonGroup value={classFilter} exclusive onChange={(_, v) => v && setClassFilter(v)} size="small"
            sx={{ '& .MuiToggleButton-root': { color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)', px: 2, '&.Mui-selected': { bgcolor: '#f59e0b20', color: '#f59e0b', borderColor: '#f59e0b40' } } }}>
            <ToggleButton value="All">All</ToggleButton>
            <ToggleButton value="General">General</ToggleButton>
            <ToggleButton value="Property">Property</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: '#f59e0b', color: '#000', '&:hover': { bgcolor: '#d97706' } }}>
            Add Category
          </Button>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>#</TableCell>
                <TableCell>Category Name</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>GL Code</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : categories.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No categories found.</TableCell></TableRow>
              ) : (
                categories.map((cat, idx) => (
                  <TableRow key={cat.category_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{idx + 1}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{cat.category_name}</Typography></TableCell>
                    <TableCell>
                      <Chip label={cat.expense_class} size="small"
                        sx={{ bgcolor: cat.expense_class === 'General' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)', color: cat.expense_class === 'General' ? '#6366f1' : '#f59e0b', fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.8rem' }}>{cat.gl_code || '—'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(cat)} sx={{ color: '#f59e0b' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Deactivate"><IconButton size="small" onClick={() => deactivate(cat)} sx={{ color: '#ef4444' }}><BlockIcon fontSize="small" /></IconButton></Tooltip>
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
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>{editingCat ? 'Edit Category' : 'Add Expense Category'}</DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <DialogContent sx={{ pt: 3 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Category Name *" value={formData.category_name} onChange={(e) => setFormData((f) => ({ ...f, category_name: e.target.value }))} fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
            <FormControl fullWidth>
              <InputLabel>Expense Class *</InputLabel>
              <Select value={formData.expense_class} label="Expense Class *" onChange={(e) => setFormData((f) => ({ ...f, expense_class: e.target.value }))}>
                <MenuItem value="General">General</MenuItem>
                <MenuItem value="Property">Property</MenuItem>
              </Select>
            </FormControl>
            <TextField label="GL Code (optional)" value={formData.gl_code} onChange={(e) => setFormData((f) => ({ ...f, gl_code: e.target.value }))} fullWidth helperText="General Ledger mapping code" slotProps={{ htmlInput: { maxLength: 30 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#f59e0b', color: '#000', '&:hover': { bgcolor: '#d97706' } }}>
            {saving ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            {editingCat ? 'Save Changes' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseCategoryMaster;
