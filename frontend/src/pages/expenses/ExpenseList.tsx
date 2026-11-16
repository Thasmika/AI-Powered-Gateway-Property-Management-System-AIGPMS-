import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Alert, Tabs, Tab,
  TextField, MenuItem, Grid, Tooltip, IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import PdfExportButton from '../../components/PdfExportButton';

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'error',
  'On Hold': 'info',
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box pt={2}>{children}</Box>}</div>
);

const ExpenseList: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0); // 0 = General, 1 = Property
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const expenseClass = tab === 0 ? 'General' : 'Property';

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { expense_class: expenseClass, limit: 200 };
      if (filterStatus) params.approval_status = filterStatus;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await api.get('/expenses', { params });
      setExpenses(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [tab, filterStatus, filterDateFrom, filterDateTo]);

  const canModify = ['Managing Director', 'Accountant', 'Administrator'].includes(role || '');

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteTarget.expense_id}`);
      setActionMsg(`Expense ${deleteTarget.expense_reference} deleted`);
      setDeleteTarget(null);
      fetchExpenses();
    } catch (e: any) {
      setActionMsg(e.response?.data?.detail || 'Delete failed');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0);

  const renderTable = (rows: any[]) => (
    <TableContainer component={Paper} sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
            <TableCell>Reference</TableCell>
            <TableCell>Payee</TableCell>
            <TableCell>Category</TableCell>
            {tab === 1 && <TableCell>Property</TableCell>}
            <TableCell>Invoice Date</TableCell>
            <TableCell align="right">Amount (AED)</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Shared</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>
                No {expenseClass} expenses found
              </TableCell>
            </TableRow>
          ) : rows.map((exp) => (
            <TableRow
              key={exp.expense_id}
              sx={{ '&:hover': { background: 'rgba(99,102,241,0.06)' }, cursor: 'pointer', '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.2 } }}
              onClick={() => navigate(`/expenses/${exp.expense_id}`)}
            >
              <TableCell sx={{ color: '#6366f1', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {exp.expense_reference}
              </TableCell>
              <TableCell sx={{ color: '#e2e8f0', fontWeight: 500 }}>{exp.payee_name}</TableCell>
              <TableCell sx={{ color: '#94a3b8' }}>{exp.category_id?.slice(0, 8) || '—'}</TableCell>
              {tab === 1 && <TableCell sx={{ color: '#94a3b8' }}>{exp.property_id?.slice(0, 8) || '—'}</TableCell>}
              <TableCell sx={{ color: '#94a3b8' }}>{exp.invoice_date ? formatDate(exp.invoice_date) : '—'}</TableCell>
              <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                {parseFloat(exp.total_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={exp.approval_status}
                  color={statusColors[exp.approval_status] || 'default'}
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
              </TableCell>
              <TableCell>
                {exp.is_shared ? (
                  <Chip size="small" label="Shared" color="info" sx={{ fontSize: '0.68rem' }} />
                ) : <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>—</Typography>}
              </TableCell>
              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Tooltip title="View Detail">
                    <IconButton size="small" onClick={() => navigate(`/expenses/${exp.expense_id}`)} sx={{ color: '#6366f1' }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {canModify && (
                    <>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigate(`/expenses/${exp.expense_id}/edit`)} sx={{ color: '#f59e0b' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(exp)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const filterFieldSx = {
    '& .MuiInputBase-root': { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' },
    '& label': { color: '#94a3b8' },
    '& input::-webkit-calendar-picker-indicator': { filter: 'invert(0.7)' },
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptLongIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#e2e8f0' }}>Expense Management</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {expenses.length} records · AED {totalAmount.toLocaleString('en-AE', { minimumFractionDigits: 2 })} total
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="Expense Management" />
          <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/expenses/new')}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          New Expense
        </Button>
        </Box>
      </Box>

      {actionMsg && (
        <Alert severity="info" onClose={() => setActionMsg(null)} sx={{ mb: 2 }}>{actionMsg}</Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 90 }}>
            <FilterListIcon sx={{ color: '#6366f1', fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 600 }}>Filters</Typography>
          </Box>
          <TextField select size="small" label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
            sx={{ ...filterFieldSx, width: 200 }}>
            <MenuItem value="">All</MenuItem>
            {['Pending', 'Approved', 'Rejected', 'On Hold'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <DatePicker label="From Date"
            format="DD/MM/YYYY"
            value={filterDateFrom ? dayjs(filterDateFrom) : null}
            onChange={v => setFilterDateFrom(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
            slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 200 } } }} />
          <DatePicker label="To Date"
            format="DD/MM/YYYY"
            value={filterDateTo ? dayjs(filterDateTo) : null}
            onChange={v => setFilterDateTo(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
            slotProps={{ field: { clearable: true }, textField: { size: 'small', sx: { ...filterFieldSx, width: 200 } } }} />
          <Button onClick={() => { setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); }} size="small" sx={{ color: '#64748b' }}>
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Tabs — PM Requirement: Side-by-side General | Property */}
      <Paper sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2, pt: 1,
            '& .MuiTab-root': { color: '#94a3b8', fontWeight: 600, textTransform: 'none', minWidth: 180 },
            '& .Mui-selected': { color: '#6366f1' },
            '& .MuiTabs-indicator': { background: '#6366f1', height: 3, borderRadius: 2 },
          }}
        >
          <Tab label="🏢  General Expenses" />
          <Tab label="🏠  Property Expenses" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress sx={{ color: '#6366f1' }} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <TabPanel value={tab} index={0}>{renderTable(expenses)}</TabPanel>
              <TabPanel value={tab} index={1}>{renderTable(expenses)}</TabPanel>
            </>
          )}
        </Box>
      </Paper>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx: { background: '#1e2235', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Delete Expense</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8' }}>
            Delete expense <strong style={{ color: '#e2e8f0' }}>{deleteTarget?.expense_reference}</strong> ({deleteTarget?.payee_name},
            AED {parseFloat(deleteTarget?.total_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <DeleteIcon />}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseList;
