import React, { useEffect, useState, useCallback } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, LinearProgress, Stack, Card, CardContent,
  Avatar, Alert, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  MoneyOff as PDCIcon,
  Warning as WarningIcon,
  Replay as ReturnedIcon,
  AccessTime as PendingIcon,
  AccountBalance as BankIcon,
  FilterAlt as FilterIcon,
  FilterAltOff as FilterOffIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

// Priority sort order: most urgent rows appear first
const STATUS_SORT_ORDER: Record<string, number> = {
  Overdue:    0,
  'Due Soon': 1,
  Returned:   2,
  Held:       3,
  Received:   4,
  Deposited:  5,
  Cleared:    6,
  Replaced:   7,
  Cancelled:  8,
};

const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  Received:        { color: 'info',    label: 'Received' },
  Held:            { color: 'default', label: 'Held' },
  'Due Soon':      { color: 'warning', label: 'Due Soon' },
  Overdue:         { color: 'error',   label: 'Overdue' },
  Deposited:       { color: 'info',    label: 'Deposited' },
  Cleared:         { color: 'success', label: 'Cleared' },
  Returned:        { color: 'error',   label: 'Returned' },
  Replaced:        { color: 'warning', label: 'Replaced' },
  Cancelled:       { color: 'error',   label: 'Cancelled' },
};

// Statuses hidden by default — loaded only when accountant selects them
const HISTORICAL_STATUSES = ['Deposited', 'Cleared', 'Replaced', 'Cancelled'];

interface PdcStats {
  total: number;
  received_held: number;
  due_soon: number;
  overdue: number;
  deposited: number;
  cleared: number;
  returned: number;
  total_value: number;
  cleared_value: number;
}

const PDCReceivedRegister: React.FC = () => {
  const navigate = useNavigate();

  const [pdcs, setPdcs]       = useState<any[]>([]);
  const [stats, setStats]     = useState<PdcStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');   // '' = active only
  const [leaseFilter, setLeaseFilter]     = useState('');

  const [editDialogOpen,   setEditDialogOpen]   = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPdc,      setSelectedPdc]      = useState<any>(null);
  const [editForm,         setEditForm]         = useState<any>({});
  const [actionLoading,    setActionLoading]    = useState(false);

  // ── Fetch global stats (always full — powers KPI cards) ─────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/pdc-received/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch PDC stats', err);
    }
  }, []);

  // ── Fetch table data based on current filter ─────────────────────────
  const fetchPdcs = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/pdc-received/';
      const params = new URLSearchParams();

      if (statusFilter === '__all__') {
        params.set('show_all', 'true');
      } else if (statusFilter) {
        params.set('status_filter', statusFilter);
      }
      // No params → backend returns active-only (excludes Deposited/Cleared)

      if (params.toString()) url += `?${params.toString()}`;
      const res = await api.get(url);

      // Client-side sort: most urgent status first, then by cheque date
      const sorted = [...res.data].sort((a: any, b: any) => {
        const aO = STATUS_SORT_ORDER[a.status] ?? 99;
        const bO = STATUS_SORT_ORDER[b.status] ?? 99;
        if (aO !== bO) return aO - bO;
        return new Date(a.cheque_date || 0).getTime() - new Date(b.cheque_date || 0).getTime();
      });

      setPdcs(sorted);
    } catch (err) {
      console.error('Failed to fetch PDCs', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPdcs(); }, [fetchPdcs]);

  // ── Client-side search + lease filter ───────────────────────────────
  const filtered = pdcs.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.cheque_number?.toLowerCase().includes(q) ||
      p.bank_name?.toLowerCase().includes(q) ||
      p.pdc_receipt_reference?.toLowerCase().includes(q) ||
      p.account_holder?.toLowerCase().includes(q) ||
      p.tenant_name?.toLowerCase().includes(q);
    const matchesLease = !leaseFilter || p.lease_number === leaseFilter;
    return matchesSearch && matchesLease;
  });

  const uniqueLeaseNumbers = Array.from(
    new Set(pdcs.map((p: any) => p.lease_number).filter(Boolean))
  ).sort() as string[];

  // ── Edit / Delete ────────────────────────────────────────────────────
  const handleEditOpen = (pdc: any) => {
    setSelectedPdc(pdc);
    setEditForm({
      cheque_number:           pdc.cheque_number || '',
      bank_name:               pdc.bank_name || '',
      account_holder:          pdc.account_holder || '',
      cheque_date:             pdc.cheque_date ? pdc.cheque_date.substring(0, 10) : '',
      cheque_amount:           pdc.cheque_amount || '',
      rental_period_from:      pdc.rental_period_from ? pdc.rental_period_from.substring(0, 10) : '',
      rental_period_to:        pdc.rental_period_to ? pdc.rental_period_to.substring(0, 10) : '',
      current_cheque_location: pdc.current_cheque_location || '',
      remarks:                 pdc.remarks || '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteOpen  = (pdc: any) => { setSelectedPdc(pdc); setDeleteDialogOpen(true); };

  const handleEditSave = async () => {
    if (!selectedPdc) return;
    setActionLoading(true);
    try {
      // Build a clean payload — convert empty strings to null for optional fields,
      // and parse cheque_amount to a proper number so Pydantic accepts it.
      const payload: Record<string, any> = {};

      if (editForm.cheque_number?.trim())  payload.cheque_number  = editForm.cheque_number.trim();
      if (editForm.bank_name?.trim())      payload.bank_name      = editForm.bank_name.trim();
      payload.account_holder          = editForm.account_holder?.trim()          || null;
      payload.cheque_date             = editForm.cheque_date             || null;
      payload.rental_period_from      = editForm.rental_period_from      || null;
      payload.rental_period_to        = editForm.rental_period_to        || null;
      payload.current_cheque_location = editForm.current_cheque_location?.trim() || null;
      payload.remarks                 = editForm.remarks?.trim()                 || null;

      // cheque_amount: parse to float, only include if valid number
      if (editForm.cheque_amount !== '' && editForm.cheque_amount != null) {
        const parsed = parseFloat(String(editForm.cheque_amount));
        if (!isNaN(parsed)) payload.cheque_amount = parsed;
      }

      await api.put(`/pdc-received/${selectedPdc.pdc_received_id}`, payload);
      setEditDialogOpen(false);
      await fetchPdcs();
      fetchStats();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('; ')
        : detail || 'Failed to save changes. Please try again.';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/pdc-received/${selectedPdc.pdc_received_id}`);
      setDeleteDialogOpen(false);
      await fetchPdcs();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete PDC');
    } finally {
      setActionLoading(false);
    }
  };

  const formatAmount = (n: number | string) =>
    Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 });

  const filterActive    = !!(statusFilter || leaseFilter || search);
  const defaultView     = !statusFilter;

  // ── KPI cards powered by /stats ──────────────────────────────────────
  const kpis = stats ? [
    { label: 'Total PDCs',      value: stats.total,         color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Received / Held', value: stats.received_held, color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
    { label: 'Due Soon',        value: stats.due_soon,      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Overdue',         value: stats.overdue,       color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
    { label: 'Cleared',         value: stats.cleared,       color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Returned',        value: stats.returned,      color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    {
      label: 'Total Value (AED)',
      value: stats.total_value.toLocaleString('en-AE', { minimumFractionDigits: 0 }),
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.15)',
    },
  ] : [];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.2)', width: 40, height: 40 }}>
              <PDCIcon sx={{ color: '#6366f1', fontSize: 22 }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="white">
              PDC Received Register
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" ml={7}>
            Track every post-dated cheque received from tenants — full lifecycle from receipt to clearance
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <PdfExportButton title="PDC Received Register" />
          {stats && stats.returned > 0 && (
            <Chip icon={<ReturnedIcon />} label={`${stats.returned} Returned`} color="error" size="small" sx={{ fontWeight: 600 }} />
          )}
          {stats && stats.due_soon > 0 && (
            <Chip icon={<PendingIcon />} label={`${stats.due_soon} Due Soon`} color="warning" size="small" sx={{ fontWeight: 600 }} />
          )}
          {stats && stats.overdue > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${stats.overdue} Overdue`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: 'rgba(220,38,38,0.9)', color: 'white', animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } } }}
            />
          )}
        </Stack>
      </Stack>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {kpis.map((kpi) => (
          <Card key={kpi.label} sx={{ flex: '1 1 140px', background: kpi.bg, border: `1px solid ${kpi.color}33`, borderRadius: 2 }}>
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10} letterSpacing={0.8}>
                {kpi.label}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: kpi.color, mt: 0.3 }}>
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ── Default view info banner ─────────────────────────────────── */}
      {defaultView && (
        <Alert
          severity="info"
          icon={<FilterIcon fontSize="small" />}
          sx={{
            mb: 2,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#a5b4fc',
            borderRadius: 2,
            '& .MuiAlert-icon': { color: '#6366f1' },
          }}
        >
          Showing <strong>active cheques only</strong> — Overdue, Due Soon, Received, Held &amp; Returned.
          {stats && stats.deposited > 0 && (
            <> &nbsp;·&nbsp; <strong style={{ color: '#0ea5e9' }}>{stats.deposited}</strong> Deposited &amp; <strong style={{ color: '#10b981' }}>{stats.cleared}</strong> Cleared cheques are hidden. Use <strong>Filter by Status</strong> to load them.</>
          )}
        </Alert>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} mb={2.5} alignItems="center" flexWrap="wrap">
        <TextField
          placeholder="Search cheque no., bank, tenant, ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => { setStatusFilter(e.target.value); setLeaseFilter(''); }}
            sx={{ borderRadius: 2 }}
          >
            {/* Active (default) group */}
            <MenuItem value="">
              <Stack direction="row" alignItems="center" spacing={1}>
                <FilterOffIcon sx={{ fontSize: 15, color: '#6366f1' }} />
                <span>Active Only (Default)</span>
              </Stack>
            </MenuItem>
            <MenuItem value="Overdue">🔴&nbsp; Overdue</MenuItem>
            <MenuItem value="Due Soon">🟡&nbsp; Due Soon</MenuItem>
            <MenuItem value="Received">🔵&nbsp; Received</MenuItem>
            <MenuItem value="Held">⚪&nbsp; Held</MenuItem>
            <MenuItem value="Returned">↩️&nbsp; Returned</MenuItem>

            {/* On-demand historical group */}
            <MenuItem disabled sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.08)', mt: 0.5, pt: 1 }}>
              — Load on demand —
            </MenuItem>
            <MenuItem value="Deposited">🏦&nbsp; Deposited</MenuItem>
            <MenuItem value="Cleared">✅&nbsp; Cleared</MenuItem>
            <MenuItem value="Replaced">🔄&nbsp; Replaced</MenuItem>
            <MenuItem value="__all__">📋&nbsp; Show All</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          size="small"
          options={uniqueLeaseNumbers}
          value={leaseFilter || null}
          onChange={(_event, newValue) => setLeaseFilter(newValue || '')}
          renderInput={(params) => <TextField {...params} label="Filter by Tenancy Contract" />}
          renderOption={(props, option) => (
            <li {...props} key={option}>
              <Typography fontSize={12} fontFamily="monospace" color="#a5b4fc">{option}</Typography>
            </li>
          )}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {filterActive && (
          <Button
            size="small"
            startIcon={<FilterOffIcon />}
            onClick={() => { setStatusFilter(''); setLeaseFilter(''); setSearch(''); }}
            variant="outlined"
            sx={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)', fontSize: 12, borderRadius: 2 }}
          >
            Clear Filters
          </Button>
        )}

        <Typography variant="body2" color="text.secondary" ml="auto !important">
          Showing {filtered.length}{defaultView ? ' active' : ''} of {stats?.total ?? '…'} total cheques
        </Typography>
      </Stack>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <TableContainer
        component={Paper}
        sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}
      >
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { background: 'rgba(255,255,255,0.05)', fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid rgba(255,255,255,0.1)' } }}>
              <TableCell>PDC Reference</TableCell>
              <TableCell>Cheque No.</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell>Account Holder</TableCell>
              <TableCell>Cheque Date</TableCell>
              <TableCell align="right">Amount (AED)</TableCell>
              <TableCell>Rental Period</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((pdc) => {
              const sc         = statusConfig[pdc.status] || { color: 'default', label: pdc.status };
              const isReturned = pdc.status === 'Returned';
              const isDueSoon  = pdc.status === 'Due Soon';
              const isOverdue  = pdc.status === 'Overdue';
              const isHistorical = HISTORICAL_STATUSES.includes(pdc.status);
              return (
                <TableRow
                  key={pdc.pdc_received_id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    opacity: isHistorical ? 0.75 : 1,
                    background: isOverdue
                      ? 'rgba(220,38,38,0.08)'
                      : isReturned ? 'rgba(239,68,68,0.04)'
                      : isDueSoon  ? 'rgba(245,158,11,0.04)'
                      : 'transparent',
                    '&:hover': { background: 'rgba(99,102,241,0.08)' },
                    '& td': { borderColor: 'rgba(255,255,255,0.05)' },
                  }}
                  onClick={() => navigate(`/pdc/register/${pdc.pdc_received_id}`)}
                >
                  <TableCell>
                    <Typography fontSize={12} fontWeight={600} color="#a5b4fc" fontFamily="monospace">
                      {pdc.pdc_receipt_reference}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600} color="white">{pdc.cheque_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.8}>
                      <BankIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography fontSize={12} color="text.secondary">{pdc.bank_name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color="text.secondary">{pdc.account_holder || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      fontSize={13}
                      color={isOverdue ? '#dc2626' : isDueSoon ? '#f59e0b' : 'text.secondary'}
                      fontWeight={isOverdue || isDueSoon ? 700 : 400}
                    >
                      {formatDate(pdc.cheque_date)}
                      {isOverdue && (
                        <Typography component="span" fontSize={10} sx={{ ml: 0.8, color: '#dc2626', fontWeight: 700 }}>OVERDUE</Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontSize={14} fontWeight={700} color={isReturned || isOverdue ? '#ef4444' : 'white'}>
                      {formatAmount(pdc.cheque_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={11} color="text.disabled">
                      {pdc.rental_period_from ? `${formatDate(pdc.rental_period_from)} – ${formatDate(pdc.rental_period_to)}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={sc.label} color={sc.color} size="small" sx={{ fontWeight: 600, fontSize: 11, minWidth: 80 }} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit PDC">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditOpen(pdc); }} sx={{ color: '#f59e0b', '&:hover': { background: 'rgba(245,158,11,0.15)' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete PDC">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteOpen(pdc); }} sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.15)' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View PDC Detail">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/pdc/register/${pdc.pdc_received_id}`); }} sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <PDCIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary" fontWeight={500}>
                    {statusFilter ? `No PDCs found with status "${statusFilter === '__all__' ? 'All' : statusFilter}"` : 'No active PDC records'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {statusFilter ? 'Try a different filter' : 'All cheques have been deposited or cleared — select a filter to view them'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {stats && (
        <Stack direction="row" justifyContent="flex-end" mt={1.5} spacing={3} flexWrap="wrap">
          <Typography variant="caption" color="text.disabled">
            Total portfolio: <strong style={{ color: '#a78bfa' }}>AED {formatAmount(stats.total_value)}</strong>
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Cleared: <strong style={{ color: '#10b981' }}>AED {formatAmount(stats.cleared_value)}</strong>
          </Typography>
          {defaultView && stats.deposited > 0 && (
            <Typography variant="caption" color="text.disabled">
              <strong style={{ color: '#0ea5e9' }}>{stats.deposited}</strong> deposited cheques hidden —{' '}
              <Typography
                component="span" variant="caption"
                sx={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setStatusFilter('Deposited')}
              >
                click to view
              </Typography>
            </Typography>
          )}
        </Stack>
      )}

      {/* ── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} PaperProps={{ sx: { background: '#1e1e2f', color: 'white', minWidth: 480 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1.5 }}>
          Edit PDC — {selectedPdc?.pdc_receipt_reference}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Row 1 */}
          <Stack direction="row" spacing={2} mt={1}>
            <TextField
              fullWidth label="Cheque Number" size="small"
              value={editForm.cheque_number || ''}
              onChange={(e) => setEditForm({ ...editForm, cheque_number: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            />
            <TextField
              fullWidth label="Bank Name" size="small"
              value={editForm.bank_name || ''}
              onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            />
          </Stack>
          {/* Row 2 */}
          <Stack direction="row" spacing={2} mt={2}>
            <TextField
              fullWidth label="Account Holder" size="small"
              value={editForm.account_holder || ''}
              onChange={(e) => setEditForm({ ...editForm, account_holder: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            />
            <TextField
              fullWidth label="Amount (AED)" size="small" type="number"
              value={editForm.cheque_amount || ''}
              onChange={(e) => setEditForm({ ...editForm, cheque_amount: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            />
          </Stack>
          {/* Row 3 */}
          <Stack direction="row" spacing={2} mt={2}>
            <TextField
              fullWidth label="Cheque Date" size="small" type="date"
              value={editForm.cheque_date ? String(editForm.cheque_date).substring(0, 10) : ''}
              onChange={(e) => setEditForm({ ...editForm, cheque_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
            />
            <TextField
              fullWidth label="Cheque Location" size="small"
              placeholder="e.g. Safe, Bank, Finance Office"
              value={editForm.current_cheque_location || ''}
              onChange={(e) => setEditForm({ ...editForm, current_cheque_location: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            />
          </Stack>
          {/* Row 4: Rental Period */}
          <Stack direction="row" spacing={2} mt={2}>
            <TextField
              fullWidth label="Rental Period From" size="small" type="date"
              value={editForm.rental_period_from ? String(editForm.rental_period_from).substring(0, 10) : ''}
              onChange={(e) => setEditForm({ ...editForm, rental_period_from: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
            />
            <TextField
              fullWidth label="Rental Period To" size="small" type="date"
              value={editForm.rental_period_to ? String(editForm.rental_period_to).substring(0, 10) : ''}
              onChange={(e) => setEditForm({ ...editForm, rental_period_to: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
            />
          </Stack>
          {/* Row 5: Remarks */}
          <TextField
            fullWidth label="Remarks" size="small" multiline rows={2} sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
            value={editForm.remarks || ''}
            onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', px: 3, py: 1.5 }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={actionLoading}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, minWidth: 100 }}
          >
            {actionLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { background: '#1e1e1e', color: 'white' } }}>
        <DialogTitle>Delete PDC</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to delete PDC <strong>{selectedPdc?.cheque_number}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={actionLoading}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PDCReceivedRegister;

