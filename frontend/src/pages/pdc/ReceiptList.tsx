import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, LinearProgress, Stack, Card, CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '../../services/api';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  Posted: 'success',
  Draft: 'warning',
  Reversed: 'error',
  Cancelled: 'error',
  'Pending Verification': 'info',
};

const ReceiptList: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/rental-receipts/');
        setReceipts(response.data);
      } catch (error) {
        console.error('Failed to fetch receipts', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipts();
  }, []);

  const filtered = receipts.filter((r) => {
    const matchSearch =
      !search ||
      r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.payment_purpose?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.receipt_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const total = receipts.length;
  const posted = receipts.filter((r) => r.receipt_status === 'Posted').length;
  const draft = receipts.filter((r) => r.receipt_status === 'Draft').length;
  const totalAmount = receipts
    .filter((r) => r.receipt_status === 'Posted')
    .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="white" gutterBottom>
            Rental Collection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage receipt vouchers and multi-cheque rental collections
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/pdc/receipts/new')}
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontWeight: 600,
            px: 3,
            py: 1.2,
            borderRadius: 2,
            '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
          }}
        >
          Create Receipt
        </Button>
      </Stack>

      {/* KPI Cards */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {[
          { label: 'Total Receipts', value: total, icon: <ReceiptIcon />, color: '#6366f1' },
          { label: 'Posted', value: posted, icon: <CheckIcon />, color: '#10b981' },
          { label: 'Draft', value: draft, icon: <PendingIcon />, color: '#f59e0b' },
          {
            label: 'Total Collected (AED)',
            value: `${totalAmount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`,
            icon: <ReceiptIcon />,
            color: '#0ea5e9',
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            sx={{
              flex: '1 1 180px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <Box sx={{ color: kpi.color, fontSize: 18 }}>{kpi.icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {kpi.label}
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700} color="white">
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          placeholder="Search receipt no., purpose..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Posted">Posted</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Pending Verification">Pending Verification</MenuItem>
            <MenuItem value="Reversed">Reversed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" ml="auto">
          {filtered.length} of {total} receipts
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
            <TableRow sx={{ '& th': { background: 'rgba(255,255,255,0.06)', fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 } }}>
              <TableCell>Receipt No.</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Payment Purpose</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r.receipt_id}
                hover
                sx={{
                  cursor: 'pointer',
                  '&:hover': { background: 'rgba(99,102,241,0.08)' },
                  '& td': { borderColor: 'rgba(255,255,255,0.06)' },
                }}
                onClick={() => navigate(`/pdc/receipts/${r.receipt_id}`)}
              >
                <TableCell>
                  <Typography fontWeight={600} color="white" fontSize={14}>
                    {r.receipt_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize={13} color="text.secondary">
                    {r.receipt_date}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize={13} color="text.secondary">
                    {r.payment_purpose || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={r.currency || 'AED'} size="small" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={700} color="white" fontSize={14}>
                    {Number(r.total_amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.receipt_status}
                    color={statusColors[r.receipt_status] || 'default'}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Receipt">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pdc/receipts/${r.receipt_id}`); }}
                      sx={{ color: '#6366f1' }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No receipts found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReceiptList;
