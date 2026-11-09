import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, LinearProgress, Stack, Avatar,
  Tooltip, IconButton,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  MoneyOff as PDCIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface LeasePDCListProps {
  leaseId: string;
}

const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  Received:   { color: 'info',    label: 'Received' },
  Held:       { color: 'default', label: 'Held' },
  'Due Soon': { color: 'warning', label: 'Due Soon' },
  Deposited:  { color: 'info',    label: 'Deposited' },
  Cleared:    { color: 'success', label: 'Cleared' },
  Returned:   { color: 'error',   label: 'Returned' },
  Replaced:   { color: 'warning', label: 'Replaced' },
  Cancelled:  { color: 'error',   label: 'Cancelled' },
};

// formatDate imported from ../../utils/dateUtils — UAE dd/MM/yyyy format

const formatAmount = (n: number) =>
  Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2 });

const LeasePDCList: React.FC<LeasePDCListProps> = ({ leaseId }) => {
  const navigate = useNavigate();
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPDCs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/pdc-received/?lease_id=${leaseId}&limit=200`);
        setPdcs(res.data);
      } catch (err) {
        console.error('Failed to fetch PDCs for lease', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPDCs();
  }, [leaseId]);

  const total = pdcs.reduce((s, p) => s + Number(p.cheque_amount || 0), 0);
  const cleared = pdcs.filter(p => p.status === 'Cleared').reduce((s, p) => s + Number(p.cheque_amount || 0), 0);
  const pending = pdcs.filter(p => ['Received', 'Held', 'Due Soon', 'Deposited'].includes(p.status)).length;
  const returned = pdcs.filter(p => p.status === 'Returned').length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.15)', width: 36, height: 36 }}>
          <PDCIcon sx={{ color: '#6366f1', fontSize: 18 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700} color="white">PDC Received</Typography>
          <Typography variant="caption" color="text.secondary">
            All post-dated cheques received under this tenancy contract
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {[
          { label: 'Total Cheques',       value: pdcs.length,              color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Pending / Active',    value: pending,                  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Returned',            value: returned,                 color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Total Value (AED)',   value: `AED ${formatAmount(total)}`,   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
          { label: 'Cleared Value (AED)', value: `AED ${formatAmount(cleared)}`, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        ].map(kpi => (
          <Box key={kpi.label} sx={{ flex: '1 1 130px', background: kpi.bg, border: `1px solid ${kpi.color}33`, borderRadius: 2, p: '10px 14px' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={9} letterSpacing={0.8} display="block">
              {kpi.label}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: kpi.color, mt: 0.3, fontSize: 14 }}>
              {kpi.value}
            </Typography>
          </Box>
        ))}
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2, height: 2 }} />}

      <TableContainer component={Paper} elevation={0} sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { background: 'rgba(255,255,255,0.04)', fontWeight: 700, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
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
            {pdcs.map((pdc) => {
              const sc = statusConfig[pdc.status] || { color: 'default' as const, label: pdc.status };
              const isDueSoon = pdc.status === 'Due Soon';
              const isReturned = pdc.status === 'Returned';
              return (
                <TableRow
                  key={pdc.pdc_received_id}
                  hover
                  onClick={() => navigate(`/pdc/register/${pdc.pdc_received_id}`)}
                  sx={{
                    background: isReturned ? 'rgba(239,68,68,0.04)' : isDueSoon ? 'rgba(245,158,11,0.04)' : 'transparent',
                    '&:hover': { background: 'rgba(99,102,241,0.07)' },
                    '& td': { borderColor: 'rgba(255,255,255,0.04)', py: 1 },
                    cursor: 'pointer',
                  }}
                >
                  <TableCell>
                    <Typography fontSize={11} fontWeight={600} color="#a5b4fc" fontFamily="monospace">{pdc.pdc_receipt_reference}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600} color="white">{pdc.cheque_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.7}>
                      <BankIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                      <Typography fontSize={12} color="text.secondary">{pdc.bank_name || '—'}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={12} color="text.secondary">{pdc.account_holder || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={13} color={isDueSoon ? '#f59e0b' : 'text.secondary'} fontWeight={isDueSoon ? 600 : 400}>
                      {formatDate(pdc.cheque_date)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontSize={13} fontWeight={700} color={isReturned ? '#ef4444' : 'white'}>{formatAmount(pdc.cheque_amount)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize={11} color="text.disabled">
                      {pdc.rental_period_from ? `${formatDate(pdc.rental_period_from)} – ${formatDate(pdc.rental_period_to)}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={sc.label} color={sc.color} size="small" sx={{ fontWeight: 600, fontSize: 10, minWidth: 76 }} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View PDC Detail">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/pdc/register/${pdc.pdc_received_id}`); }} sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && pdcs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <PDCIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary" fontWeight={500}>No PDC records for this lease</Typography>
                  <Typography variant="caption" color="text.disabled">PDCs are auto-generated when a rental receipt is posted</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LeasePDCList;