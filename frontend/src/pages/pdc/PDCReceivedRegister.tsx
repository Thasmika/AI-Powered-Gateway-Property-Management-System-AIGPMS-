import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, LinearProgress, Stack, Card, CardContent,
  Avatar, Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  MoneyOff as PDCIcon,
  CheckCircle as ClearedIcon,
  Warning as WarningIcon,
  Replay as ReturnedIcon,
  AccessTime as PendingIcon,
  AccountBalance as BankIcon,
  SwapHoriz as ReplacedIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  Received:        { color: 'info',    label: 'Received' },
  Held:            { color: 'default', label: 'Held' },
  'Due Soon':      { color: 'warning', label: 'Due Soon' },
  Deposited:       { color: 'info',    label: 'Deposited' },
  Cleared:         { color: 'success', label: 'Cleared' },
  Returned:        { color: 'error',   label: 'Returned' },
  Replaced:        { color: 'warning', label: 'Replaced' },
  Cancelled:       { color: 'error',   label: 'Cancelled' },
};

const PDCReceivedRegister: React.FC = () => {
  const navigate = useNavigate();
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPdcs = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/pdc-received/?status_filter=${statusFilter}`
        : '/pdc-received/';
      const response = await api.get(url);
      setPdcs(response.data);
    } catch (error) {
      console.error('Failed to fetch PDCs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdcs();
  }, [statusFilter]);

  const filtered = pdcs.filter((p) => {
    return (
      !search ||
      p.cheque_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.bank_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.pdc_receipt_reference?.toLowerCase().includes(search.toLowerCase()) ||
      p.account_holder?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Summary stats
  const byStatus = (s: string) => pdcs.filter((p) => p.status === s).length;
  const totalValue = pdcs.reduce((sum, p) => sum + Number(p.cheque_amount || 0), 0);
  const clearedValue = pdcs
    .filter((p) => p.status === 'Cleared')
    .reduce((sum, p) => sum + Number(p.cheque_amount || 0), 0);

  const kpis = [
    { label: 'Total PDCs', value: pdcs.length, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Received / Held', value: byStatus('Received') + byStatus('Held'), color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
    { label: 'Due Soon', value: byStatus('Due Soon'), color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Cleared', value: byStatus('Cleared'), color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Returned', value: byStatus('Returned'), color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    {
      label: 'Total Value (AED)',
      value: totalValue.toLocaleString('en-AE', { minimumFractionDigits: 0 }),
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.15)',
    },
  ];

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const formatAmount = (n: number) =>
    Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2 });

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
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
          <Chip
            icon={<WarningIcon />}
            label={`${byStatus('Returned')} Returned`}
            color="error"
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<PendingIcon />}
            label={`${byStatus('Due Soon')} Due Soon`}
            color="warning"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Stack>

      {/* KPI Strip */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            sx={{
              flex: '1 1 140px',
              background: kpi.bg,
              border: `1px solid ${kpi.color}33`,
              borderRadius: 2,
              cursor: 'default',
            }}
          >
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

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2.5} alignItems="center" flexWrap="wrap">
        <TextField
          placeholder="Search cheque no., bank, holder, ref..."
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
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.keys(statusConfig).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" ml="auto !important">
          Showing {filtered.length} of {pdcs.length} cheques
        </Typography>
      </Stack>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
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
              const sc = statusConfig[pdc.status] || { color: 'default', label: pdc.status };
              const isReturned = pdc.status === 'Returned';
              const isDueSoon = pdc.status === 'Due Soon';
              return (
                <TableRow
                  key={pdc.pdc_received_id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    background: isReturned
                      ? 'rgba(239,68,68,0.04)'
                      : isDueSoon
                      ? 'rgba(245,158,11,0.04)'
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
                    <Typography fontSize={13} fontWeight={600} color="white">
                      {pdc.cheque_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.8}>
                      <BankIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography fontSize={12} color="text.secondary">
                        {pdc.bank_name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color="text.secondary">
                      {pdc.account_holder || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color={isDueSoon ? '#f59e0b' : 'text.secondary'} fontWeight={isDueSoon ? 600 : 400}>
                      {formatDate(pdc.cheque_date)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontSize={14} fontWeight={700} color={isReturned ? '#ef4444' : 'white'}>
                      {formatAmount(pdc.cheque_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={11} color="text.disabled">
                      {pdc.rental_period_from ? `${formatDate(pdc.rental_period_from)} – ${formatDate(pdc.rental_period_to)}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={sc.label}
                      color={sc.color}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: 11, minWidth: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View PDC Detail">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pdc/register/${pdc.pdc_received_id}`);
                        }}
                        sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}
                      >
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
                    No PDC records found
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Post a rental receipt to automatically generate PDC records
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer note */}
      {pdcs.length > 0 && (
        <Stack direction="row" justifyContent="flex-end" mt={1.5}>
          <Typography variant="caption" color="text.disabled">
            Total portfolio value:{' '}
            <strong style={{ color: '#a78bfa' }}>AED {formatAmount(totalValue)}</strong>
            {' '}· Cleared:{' '}
            <strong style={{ color: '#10b981' }}>AED {formatAmount(clearedValue)}</strong>
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default PDCReceivedRegister;
