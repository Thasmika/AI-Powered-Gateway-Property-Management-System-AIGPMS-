import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Alert, CircularProgress, Divider,
  Chip, Stack, Autocomplete, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import api from '../../services/api';
import { DebugErrorBoundary } from '../../components/DebugErrorBoundary';

const ALLOCATION_METHODS = [
  '100% to Property', 'Percentage', 'Fixed Amount',
  'Unit Count', 'Area', 'Ownership Share', 'Cost Centre', 'Residual'
];

const PAYMENT_METHODS = ['Cheque', 'Transfer', 'Cash', 'PDC', 'Card', 'Other'];

const SUPPLIER_TYPES = [
  'Agent', 'Construction Company', 'Material Supplier', 'Government', 'Utility', 'Other'
];

interface AllocationRow {
  id: string;
  property_id: string;
  cost_centre_id: string;
  allocation_method: string;
  allocation_percentage: string;
  allocation_amount: string;
  notes: string;
}

interface Category {
  category_id: string;
  category_name: string;
  expense_class: string;
  is_active: boolean;
}

interface Supplier {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string | null;
  is_active: boolean;
}

const ExpenseEntry: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const isEdit = !!expenseId;
  // Set when loading an existing expense so the class-change effect doesn't wipe its category
  const skipClassReset = useRef(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form state
  const [expenseClass, setExpenseClass] = useState<'General' | 'Property'>('General');
  const [form, setForm] = useState({
    category_id: '',
    payee_name: '',
    description: '',
    invoice_date: '',
    invoice_number: '',
    amount: '',
    tax_amount: '0',
    total_amount: '',
    payment_method: '',
    payment_voucher_ref: '',
    pdc_issued_id: '',
    cost_centre_id: '',
    property_id: '',
    unit_id: '',
    maintenance_ticket_id: '',
    lpo_id: '',
    is_shared: false,
    attachment_path: '',
    notes: '',
  });

  // Autocomplete selected objects
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  // ── Add Category Dialog ────────────────────────────────────────────────────
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatClass, setNewCatClass] = useState<'General' | 'Property'>('General');
  const [savingCat, setSavingCat] = useState(false);
  const [catDialogError, setCatDialogError] = useState<string | null>(null);

  // ── Add Supplier Dialog ────────────────────────────────────────────────────
  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupType, setNewSupType] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [savingSup, setSavingSup] = useState(false);
  const [supDialogError, setSupDialogError] = useState<string | null>(null);

  // ─── Fetch reference data ──────────────────────────────────────────────────
  const fetchCategories = async (cls: 'General' | 'Property') => {
    try {
      const res = await api.get('/expenses/categories', { params: { expense_class: cls, is_active: true } });
      setCategories(res.data);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/master/suppliers', { params: { active_only: true } });
      setSuppliers(res.data);
    } catch (e) {
      console.error('Failed to load suppliers', e);
    }
  };

  useEffect(() => {
    const fetchRef = async () => {
      setLoading(true);
      try {
        const [ccRes, propRes] = await Promise.all([
          api.get('/expenses/cost-centres', { params: { is_active: true } }),
          api.get('/properties', { params: { limit: 200 } }),
        ]);
        setCostCentres(ccRes.data);
        setProperties(propRes.data);
        await fetchCategories(expenseClass);
        const supRes = await api.get('/master/suppliers', { params: { active_only: true } }).catch(() => ({ data: [] }));
        setSuppliers(supRes.data);

        if (isEdit) {
          const { data: exp } = await api.get(`/expenses/${expenseId}`);
          const cls: 'General' | 'Property' = exp.expense_class === 'Property' ? 'Property' : 'General';
          if (cls !== expenseClass) {
            skipClassReset.current = true;
            setExpenseClass(cls);
          }
          const s = (v: any) => (v === null || v === undefined ? '' : String(v));
          setForm({
            category_id: s(exp.category_id),
            payee_name: s(exp.payee_name),
            description: s(exp.description),
            invoice_date: exp.invoice_date ? String(exp.invoice_date).slice(0, 10) : '',
            invoice_number: s(exp.invoice_number),
            amount: s(exp.amount),
            tax_amount: s(exp.tax_amount ?? '0'),
            total_amount: s(exp.total_amount),
            payment_method: s(exp.payment_method),
            payment_voucher_ref: s(exp.payment_voucher_ref),
            pdc_issued_id: s(exp.pdc_issued_id),
            cost_centre_id: s(exp.cost_centre_id),
            property_id: s(exp.property_id),
            unit_id: s(exp.unit_id),
            maintenance_ticket_id: s(exp.maintenance_ticket_id),
            lpo_id: s(exp.lpo_id),
            is_shared: !!exp.is_shared,
            attachment_path: s(exp.attachment_path),
            notes: s(exp.notes),
          });
          const sup = (supRes.data as Supplier[]).find(x => x.supplier_name === exp.payee_name);
          setSelectedSupplier(sup || (exp.payee_name
            ? { supplier_id: '', supplier_name: exp.payee_name, supplier_type: null, is_active: true }
            : null));
          setAllocations((exp.allocations || []).map((a: any) => ({
            id: crypto.randomUUID(),
            property_id: s(a.property_id),
            cost_centre_id: s(a.cost_centre_id),
            allocation_method: a.allocation_method || 'Percentage',
            allocation_percentage: s(a.allocation_percentage),
            allocation_amount: s(a.allocation_amount),
            notes: s(a.notes),
          })));
        }
      } catch (e: any) {
        console.error('Failed to load reference data', e);
        if (isEdit) setError(e.response?.data?.detail || 'Failed to load expense');
      } finally {
        setLoading(false);
      }
    };
    fetchRef();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch categories when expense class changes
  useEffect(() => {
    fetchCategories(expenseClass);
    if (skipClassReset.current) {
      skipClassReset.current = false;
      return;
    }
    setSelectedCategory(null);
    setForm(f => ({ ...f, category_id: '' }));
  }, [expenseClass]);

  // In edit mode, pick the saved category once the category list is available
  useEffect(() => {
    if (form.category_id && selectedCategory?.category_id !== form.category_id) {
      const match = categories.find(c => c.category_id === form.category_id);
      if (match) setSelectedCategory(match);
    }
  }, [categories, form.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calculate total
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.tax_amount) || 0;
    setForm(f => ({ ...f, total_amount: (amt + tax).toFixed(2) }));
  }, [form.amount, form.tax_amount]);

  // Fetch units when property changes
  useEffect(() => {
    if (form.property_id) {
      api.get(`/properties/${form.property_id}/units`)
        .then(res => setUnits(res.data))
        .catch(err => console.error('Failed to load units', err));
    } else {
      setUnits([]);
    }
  }, [form.property_id]);

  const handleChange = (field: string, value: any) => {
    setForm(f => {
      const newForm = { ...f, [field]: value };
      if (field === 'property_id') {
        newForm.unit_id = '';
      }
      return newForm;
    });
  };

  const addAllocationRow = () => {
    setAllocations(prev => [...prev, {
      id: crypto.randomUUID(),
      property_id: '',
      cost_centre_id: '',
      allocation_method: 'Percentage',
      allocation_percentage: '',
      allocation_amount: '',
      notes: '',
    }]);
  };

  const updateAllocation = (id: string, field: string, value: string) => {
    setAllocations(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeAllocation = (id: string) => {
    setAllocations(prev => prev.filter(row => row.id !== id));
  };

  const allocationPctTotal = allocations
    .filter(a => a.allocation_method === 'Percentage')
    .reduce((s, a) => s + (parseFloat(a.allocation_percentage) || 0), 0);

  // ─── Add Category ──────────────────────────────────────────────────────────
  const openCatDialog = () => {
    setNewCatName('');
    setNewCatClass(expenseClass);
    setCatDialogError(null);
    setCatDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim()) { setCatDialogError('Category name is required'); return; }
    setSavingCat(true);
    setCatDialogError(null);
    try {
      const res = await api.post('/expenses/categories', {
        category_name: newCatName.trim(),
        expense_class: newCatClass,
        is_active: true,
      });
      const newCat: Category = res.data;
      setCategories(prev => [...prev, newCat].sort((a, b) => a.category_name.localeCompare(b.category_name)));
      setSelectedCategory(newCat);
      setForm(f => ({ ...f, category_id: newCat.category_id }));
      setCatDialogOpen(false);
    } catch (e: any) {
      setCatDialogError(e.response?.data?.detail || 'Failed to create category');
    } finally {
      setSavingCat(false);
    }
  };

  // ─── Add Supplier ──────────────────────────────────────────────────────────
  const openSupDialog = () => {
    setNewSupName('');
    setNewSupType('');
    setNewSupContact('');
    setSupDialogError(null);
    setSupDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!newSupName.trim()) { setSupDialogError('Supplier name is required'); return; }
    setSavingSup(true);
    setSupDialogError(null);
    try {
      const res = await api.post('/master/suppliers', {
        supplier_name: newSupName.trim(),
        supplier_type: newSupType || null,
        contact_number: newSupContact || null,
        is_active: true,
      });
      const newSup: Supplier = res.data;
      setSuppliers(prev => [...prev, newSup].sort((a, b) => a.supplier_name.localeCompare(b.supplier_name)));
      setSelectedSupplier(newSup);
      setForm(f => ({ ...f, payee_name: newSup.supplier_name }));
      setSupDialogOpen(false);
    } catch (e: any) {
      setSupDialogError(e.response?.data?.detail || 'Failed to create supplier');
    } finally {
      setSavingSup(false);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    if (!form.category_id) return setError('Please select a category');
    if (!form.payee_name.trim()) return setError('Payee / Supplier is required');
    if (!form.amount || parseFloat(form.amount) <= 0) return setError('Amount must be greater than 0');
    if (expenseClass === 'Property' && !form.property_id) return setError('Property is required for Property expenses');
    if (form.is_shared && allocations.length === 0) return setError('Please add at least one allocation row for shared expenses');

    const pctRows = allocations.filter(a => a.allocation_method === 'Percentage');
    if (pctRows.length > 0 && Math.abs(allocationPctTotal - 100) > 0.01) {
      return setError(`Allocation percentages must sum to 100% (currently ${allocationPctTotal.toFixed(2)}%)`);
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        expense_class: expenseClass,
        amount: parseFloat(form.amount),
        tax_amount: parseFloat(form.tax_amount) || 0,
        total_amount: parseFloat(form.total_amount),
        allocations: form.is_shared ? allocations.map(({ id, ...rest }) => ({
          ...rest,
          allocation_percentage: rest.allocation_percentage ? parseFloat(rest.allocation_percentage) : null,
          allocation_amount: rest.allocation_amount ? parseFloat(rest.allocation_amount) : null,
        })) : [],
      };
      // Remove empty strings → null
      Object.keys(payload).forEach(k => {
        if ((payload as any)[k] === '') (payload as any)[k] = null;
      });
      if (isEdit) {
        await api.put(`/expenses/${expenseId}`, payload);
        setSuccess('Expense updated successfully!');
      } else {
        await api.post('/expenses', payload);
        setSuccess('Expense created successfully!');
      }
      setTimeout(() => navigate('/expenses'), 1200);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : (isEdit ? 'Failed to update expense' : 'Failed to create expense'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}><CircularProgress sx={{ color: '#6366f1' }} /></Box>;
  }

  const inputSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
    '& .MuiSvgIcon-root': { color: '#94a3b8' },
    '& .MuiSelect-select': { color: '#e2e8f0' },
  };

  const autocompleteSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
    '& .MuiSvgIcon-root': { color: '#94a3b8' },
    '& .MuiAutocomplete-input': { color: '#e2e8f0' },
    '& .MuiAutocomplete-tag': { color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.2)' },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        background: '#1e2235',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 2,
        mt: 0.5,
        '& .MuiMenuItem-root': {
          color: '#e2e8f0',
          fontSize: '0.875rem',
          '&:hover': { background: 'rgba(99,102,241,0.15)' },
          '&.Mui-selected': { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' },
          '&.Mui-selected:hover': { background: 'rgba(99,102,241,0.35)' },
        },
      },
    },
  };

  const dialogInputSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderRadius: 1.5 },
    '& label': { color: '#94a3b8' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
    '& .MuiSvgIcon-root': { color: '#94a3b8' },
  };

  const addBtnSx = {
    minWidth: 38, height: 38, p: 0,
    background: 'rgba(99,102,241,0.15)',
    color: '#6366f1',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 1.5,
    '&:hover': { background: 'rgba(99,102,241,0.28)', borderColor: '#6366f1' },
  };

  return (
    <DebugErrorBoundary>
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/expenses')} sx={{ color: '#94a3b8' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReceiptLongIcon sx={{ color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>{isEdit ? 'Edit Expense' : 'New Expense'}</Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>{isEdit ? 'Update the details of this expense' : 'Record a general or property-related expense'}</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Expense Class Toggle */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.5 }}>Expense Classification</Typography>
        <Stack direction="row" spacing={2} mt={1.5}>
          {(['General', 'Property'] as const).map(cls => (
            <Paper
              key={cls}
              onClick={() => setExpenseClass(cls)}
              sx={{
                flex: 1, p: 2, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                border: expenseClass === cls ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                background: expenseClass === cls ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#6366f1', background: 'rgba(99,102,241,0.08)' }
              }}
            >
              {cls === 'General' ? <BusinessIcon sx={{ color: expenseClass === cls ? '#6366f1' : '#64748b', mb: 0.5 }} /> : <HomeWorkIcon sx={{ color: expenseClass === cls ? '#6366f1' : '#64748b', mb: 0.5 }} />}
              <Typography fontWeight={700} sx={{ color: expenseClass === cls ? '#6366f1' : '#94a3b8' }}>{cls} Expense</Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {cls === 'General' ? 'Not linked to a specific property' : 'Directly attributable to a property'}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>

      {/* Main Form */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.5, mb: 2, display: 'block' }}>Expense Details</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>

          {/* ── Category with inline + add ── */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              fullWidth
              options={categories}
              value={selectedCategory}
              onChange={(_, val) => {
                setSelectedCategory(val);
                setForm(f => ({ ...f, category_id: val?.category_id || '' }));
              }}
              getOptionLabel={o => typeof o === 'string' ? o : o?.category_name || ''}
              isOptionEqualToValue={(o, v) => o?.category_id === v?.category_id}
              noOptionsText={
                <Box sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  No categories — click <strong>+</strong> to add one
                </Box>
              }
              PaperComponent={({ children }) => (
                <Paper sx={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, mt: 0.5 }}>
                  {children}
                </Paper>
              )}
              renderOption={(props, option) => (
                <li {...props} style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
                  {option.category_name}
                  <Chip label={option.expense_class} size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)' }} variant="outlined" />
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Category *"
                  sx={autocompleteSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <CategoryIcon sx={{ color: '#64748b', fontSize: 18, mr: 0.5 }} />
                        {params.InputProps?.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Tooltip title="Add new category">
              <IconButton onClick={openCatDialog} sx={{ ...addBtnSx, mt: 0.5 }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* ── Payee / Supplier with inline + add ── */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              fullWidth
              options={suppliers}
              value={selectedSupplier}
              onChange={(_, val) => {
                if (typeof val === 'string') {
                  setSelectedSupplier(null);
                  setForm(f => ({ ...f, payee_name: val }));
                } else {
                  setSelectedSupplier(val);
                  setForm(f => ({ ...f, payee_name: val?.supplier_name || '' }));
                }
              }}
              getOptionLabel={o => typeof o === 'string' ? o : o?.supplier_name || ''}
              isOptionEqualToValue={(o, v) => o?.supplier_id === (typeof v === 'string' ? v : v?.supplier_id)}
              freeSolo
              onInputChange={(_, val, reason) => {
                if (reason === 'input') {
                  setForm(f => ({ ...f, payee_name: val }));
                }
              }}
              noOptionsText={
                <Box sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  No suppliers — click <strong>+</strong> to add one
                </Box>
              }
              PaperComponent={({ children }) => (
                <Paper sx={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, mt: 0.5 }}>
                  {children}
                </Paper>
              )}
              renderOption={(props, option) => (
                <li {...props} style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
                  <Box>
                    <span>{option.supplier_name}</span>
                    {option.supplier_type && (
                      <Chip label={option.supplier_type} size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)' }} variant="outlined" />
                    )}
                  </Box>
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Payee / Supplier *"
                  sx={autocompleteSx}
                />
              )}
            />
            <Tooltip title="Add new supplier">
              <IconButton onClick={openSupDialog} sx={{ ...addBtnSx, mt: 0.5 }}>
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Invoice Date */}
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>Invoice Date</Typography>
            <DatePicker format="DD/MM/YYYY"
            value={form.invoice_date ? dayjs(form.invoice_date) : null}
            onChange={v => handleChange('invoice_date', v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
            slotProps={{ field: { clearable: true }, textField: { fullWidth: true, sx: inputSx } }} />
          </Box>

          {/* Invoice Number */}
          <TextField fullWidth label="Invoice Number" value={form.invoice_number} onChange={e => handleChange('invoice_number', e.target.value)} sx={inputSx} />

          {/* Payment Method */}
          <TextField select fullWidth label="Payment Method" value={form.payment_method} onChange={e => handleChange('payment_method', e.target.value)} sx={inputSx} SelectProps={{ MenuProps: menuProps }}>
            {PAYMENT_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>

          {/* Amount */}
          <TextField fullWidth label="Amount (AED) *" type="number" value={form.amount} onChange={e => handleChange('amount', e.target.value)} sx={inputSx} />

          {/* Tax Amount */}
          <TextField fullWidth label="Tax Amount (AED)" type="number" value={form.tax_amount} onChange={e => handleChange('tax_amount', e.target.value)} sx={inputSx} />

          {/* Total Amount (read-only) */}
          <TextField fullWidth label="Total Amount (AED)" value={form.total_amount} InputProps={{ readOnly: true }}
            sx={{ ...inputSx, '& .MuiInputBase-root': { ...inputSx['& .MuiInputBase-root'], background: 'rgba(99,102,241,0.08)', fontWeight: 700 } }} />

          {/* Notes */}
          <TextField fullWidth label="Notes" value={form.notes} onChange={e => handleChange('notes', e.target.value)} sx={inputSx} />

          {/* Description — full width */}
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={e => handleChange('description', e.target.value)} sx={inputSx} />
          </Box>

          {/* General-only: Cost Centre */}
          {expenseClass === 'General' && (
            <TextField select fullWidth label="Cost Centre" value={form.cost_centre_id} onChange={e => handleChange('cost_centre_id', e.target.value)} sx={inputSx} SelectProps={{ MenuProps: menuProps }}>
              <MenuItem value="">— None —</MenuItem>
              {costCentres.map(cc => <MenuItem key={cc.cost_centre_id} value={cc.cost_centre_id}>{cc.code} — {cc.name}</MenuItem>)}
            </TextField>
          )}

          {/* Property-only fields */}
          {expenseClass === 'Property' && (
            <>
              <TextField select fullWidth label="Property *" value={form.property_id} onChange={e => handleChange('property_id', e.target.value)} sx={inputSx} SelectProps={{ MenuProps: menuProps }}>
                {properties.map(p => <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>)}
              </TextField>

              {/* Unit No. selection — PM requirement */}
              <TextField select fullWidth label="Unit No. (optional)" value={form.unit_id} onChange={e => handleChange('unit_id', e.target.value)} sx={inputSx} SelectProps={{ MenuProps: menuProps }}>
                <MenuItem value="">— All Units / None —</MenuItem>
                {units.map(u => <MenuItem key={u.unit_id} value={u.unit_id}>{u.unit_number}</MenuItem>)}
              </TextField>

              <TextField fullWidth label="Maintenance Ticket ID" value={form.maintenance_ticket_id} onChange={e => handleChange('maintenance_ticket_id', e.target.value)} sx={inputSx} placeholder="Optional" />
              <TextField fullWidth label="LPO Reference" value={form.lpo_id} onChange={e => handleChange('lpo_id', e.target.value)} sx={inputSx} placeholder="Optional" />
            </>
          )}
        </Box>

        {/* Shared Expense Toggle */}
        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.07)' }} />
        <FormControlLabel
          control={<Switch checked={form.is_shared} onChange={e => handleChange('is_shared', e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6366f1' } }} />}
          label={<Typography fontWeight={600} sx={{ color: '#e2e8f0' }}>Shared Expense — allocate across multiple properties</Typography>}
        />
      </Paper>

      {/* Allocation Grid */}
      {form.is_shared && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="overline" sx={{ color: '#f59e0b', fontWeight: 700, letterSpacing: 1.5 }}>Expense Allocation</Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                {allocationPctTotal.toFixed(2)}% allocated {Math.abs(allocationPctTotal - 100) > 0.01 && <span style={{ color: '#ef4444' }}>(must total 100%)</span>}
              </Typography>
            </Box>
            <Button size="small" startIcon={<AddIcon />} onClick={addAllocationRow}
              sx={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', borderRadius: 1.5, '&:hover': { background: 'rgba(99,102,241,0.25)' } }}>
              Add Row
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
                  <TableCell>Property / Cost Centre</TableCell>
                  <TableCell>Allocation Method</TableCell>
                  <TableCell>Percentage (%)</TableCell>
                  <TableCell>Amount (AED)</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="center">Del</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allocations.map(row => (
                  <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 } }}>
                    <TableCell>
                      <TextField select size="small" fullWidth value={row.property_id} onChange={e => updateAllocation(row.id, 'property_id', e.target.value)} sx={inputSx}>
                        <MenuItem value="">— Cost Centre —</MenuItem>
                        {properties.map(p => <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField select size="small" fullWidth value={row.allocation_method} onChange={e => updateAllocation(row.id, 'allocation_method', e.target.value)} sx={inputSx}>
                        {ALLOCATION_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={row.allocation_percentage} onChange={e => updateAllocation(row.id, 'allocation_percentage', e.target.value)} sx={{ ...inputSx, width: 90 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={row.allocation_amount} onChange={e => updateAllocation(row.id, 'allocation_amount', e.target.value)} sx={{ ...inputSx, width: 110 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={row.notes} onChange={e => updateAllocation(row.id, 'notes', e.target.value)} sx={{ ...inputSx, width: 140 }} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => removeAllocation(row.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {allocations.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#475569', py: 3 }}>Click "Add Row" to start allocating</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Submit */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={() => navigate('/expenses')} sx={{ color: '#94a3b8', borderColor: '#334155', borderRadius: 2 }}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 600, borderRadius: 2, px: 4 }}
        >
          {saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Create Expense'}
        </Button>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD CATEGORY DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#1a1f35', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700, pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <CategoryIcon sx={{ color: '#6366f1' }} />
            Add Expense Category
          </Box>
        </DialogTitle>
        <DialogContent>
          {catDialogError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCatDialogError(null)}>{catDialogError}</Alert>}
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Category Name *"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              fullWidth
              autoFocus
              sx={dialogInputSx}
              onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
            />
            <TextField
              select
              label="Expense Class *"
              value={newCatClass}
              onChange={e => setNewCatClass(e.target.value as 'General' | 'Property')}
              fullWidth
              sx={dialogInputSx}
              SelectProps={{ MenuProps: menuProps }}
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Property">Property</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCatDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            disabled={savingCat}
            startIcon={savingCat ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <AddIcon />}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 1.5 }}
          >
            {savingCat ? 'Saving…' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD SUPPLIER DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={supDialogOpen}
        onClose={() => setSupDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { background: '#1a1f35', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700, pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <PersonAddIcon sx={{ color: '#6366f1' }} />
            Add Supplier / Payee
          </Box>
        </DialogTitle>
        <DialogContent>
          {supDialogError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSupDialogError(null)}>{supDialogError}</Alert>}
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Supplier / Company Name *"
              value={newSupName}
              onChange={e => setNewSupName(e.target.value)}
              fullWidth
              autoFocus
              sx={dialogInputSx}
              onKeyDown={e => e.key === 'Enter' && handleSaveSupplier()}
            />
            <TextField
              select
              label="Supplier Type"
              value={newSupType}
              onChange={e => setNewSupType(e.target.value)}
              fullWidth
              sx={dialogInputSx}
              SelectProps={{ MenuProps: menuProps }}
            >
              <MenuItem value="">— Select type —</MenuItem>
              {SUPPLIER_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField
              label="Contact Number (optional)"
              value={newSupContact}
              onChange={e => setNewSupContact(e.target.value)}
              fullWidth
              sx={dialogInputSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSupDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSupplier}
            disabled={savingSup}
            startIcon={savingSup ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PersonAddIcon />}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 1.5 }}
          >
            {savingSup ? 'Saving…' : 'Add Supplier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DebugErrorBoundary>
  );
};

export default ExpenseEntry;
