import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Paper,
  Button, CircularProgress, ToggleButtonGroup, ToggleButton,
  Table, TableHead, TableRow, TableCell, TableBody, Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell as PieCell
} from 'recharts';
import api from '../../services/api';

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

interface FinanceData {
  period: string;
  pdc_received: {
    held: { count: number; value: number };
    due_this_week: { count: number; value: number };
    due_this_month: { count: number; value: number };
    submitted: { count: number; value: number };
    cleared_this_month: { count: number; value: number };
    returned_this_month: { count: number; value: number };
    replaced: { count: number; value: number };
    overdue: { count: number; value: number };
  };
  pdc_issued: {
    total_uncleared: { count: number; value: number };
    due_this_week: { count: number; value: number };
    due_this_month: { count: number; value: number };
    by_payee_type: Array<{ payee_type: string; count: number; value: number }>;
    by_bank_account: Array<{ bank: string; count: number; value: number }>;
  };
  cash_flow: Array<{ month: string; label: string; incoming: number; outgoing: number; net: number }>;
  expense_summary: Array<{ category: string; count: number; total: number }>;
  upcoming_loan_instalments: Array<{ id: number; loan_id: number; due_date: string; total_amount: number; status: string }>;
}

const StatRow: React.FC<{ label: string; count: number; value: number; highlight?: boolean }> = ({ label, count, value, highlight }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" py={0.75} px={1}
    sx={{ bgcolor: highlight ? 'rgba(239,68,68,0.08)' : 'transparent', borderRadius: 1, transition: 'background 0.2s' }}
  >
    <Typography variant="caption" sx={{ color: highlight ? '#fca5a5' : 'rgba(148,163,184,0.8)', fontWeight: highlight ? 700 : 400 }}>
      {label}
    </Typography>
    <Box display="flex" gap={1} alignItems="center">
      <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: highlight ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)', color: highlight ? '#fca5a5' : '#818cf8', fontWeight: 700 }} />
      <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, minWidth: 100, textAlign: 'right' }}>
        {fmt(value)}
      </Typography>
    </Box>
  </Box>
);

const FinanceDashboard: React.FC = () => {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'this_week' | 'this_month' | 'next_month'>('this_month');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/finance?period=${period}`);
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load Finance Dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: '#06b6d4' }} />
    </Box>
  );

  if (error) return (
    <Paper sx={{ p: 4, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
      <Typography color="error">{error}</Typography>
    </Paper>
  );

  if (!data) return null;
  const { pdc_received: pr, pdc_issued: pi, cash_flow, expense_summary } = data;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800 }}>Finance Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>PDC registers, cash flow & expense analysis</Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, v) => { if (v) setPeriod(v); }}
            size="small"
            sx={{ '& .MuiToggleButton-root': { color: 'rgba(148,163,184,0.7)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.72rem', px: 1.5 }, '& .Mui-selected': { color: '#06b6d4', bgcolor: 'rgba(6,182,212,0.1) !important' } }}
          >
            <ToggleButton value="this_week">This Week</ToggleButton>
            <ToggleButton value="this_month">This Month</ToggleButton>
            <ToggleButton value="next_month">Next Month</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData}
            sx={{ borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4', '&:hover': { borderColor: '#06b6d4', bgcolor: 'rgba(6,182,212,0.08)' } }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Critical alerts */}
      {(pr.overdue.count > 0 || pr.returned_this_month.count > 0) && (
        <Box mb={3} display="flex" gap={2} flexWrap="wrap">
          {pr.overdue.count > 0 && (
            <Chip icon={<WarningIcon />} label={`${pr.overdue.count} overdue PDC(s) — ${fmt(pr.overdue.value)}`} color="error" variant="outlined" size="small" component={Link} to="/pdc/register" clickable />
          )}
          {pr.returned_this_month.count > 0 && (
            <Chip icon={<TrendingDownIcon />} label={`${pr.returned_this_month.count} returned cheque(s) this month`} color="warning" variant="outlined" size="small" component={Link} to="/pdc/register" clickable />
          )}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* PDC Received Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>PDCs Received</Typography>
              <Button size="small" component={Link} to="/pdc/register" sx={{ color: '#22c55e', fontSize: '0.72rem' }}>View Register →</Button>
            </Box>
            <StatRow label="Currently Held" count={pr.held.count} value={pr.held.value} />
            <StatRow label="Due This Week" count={pr.due_this_week.count} value={pr.due_this_week.value} highlight={pr.due_this_week.count > 0} />
            <StatRow label={`Due ${period === 'this_week' ? 'This Week' : period === 'next_month' ? 'Next Month' : 'This Month'}`} count={pr.due_this_month.count} value={pr.due_this_month.value} />
            <StatRow label="Submitted to Bank" count={pr.submitted.count} value={pr.submitted.value} />
            <StatRow label={`Cleared ${period === 'this_week' ? 'This Week' : period === 'next_month' ? 'Next Month' : 'This Month'}`} count={pr.cleared_this_month.count} value={pr.cleared_this_month.value} />
            <StatRow label={`Returned ${period === 'this_week' ? 'This Week' : period === 'next_month' ? 'Next Month' : 'This Month'}`} count={pr.returned_this_month.count} value={pr.returned_this_month.value} highlight={pr.returned_this_month.count > 0} />
            <StatRow label="Replaced" count={pr.replaced.count} value={pr.replaced.value} />
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
            <StatRow label="⚠️ Overdue (Past Date, Not Deposited)" count={pr.overdue.count} value={pr.overdue.value} highlight={pr.overdue.count > 0} />
          </Paper>
        </Grid>

        {/* PDC Issued Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>PDCs Issued</Typography>
              <Button size="small" component={Link} to="/pdc-issued" sx={{ color: '#ef4444', fontSize: '0.72rem' }}>View Register →</Button>
            </Box>
            <StatRow label="Total Issued & Uncleared" count={pi.total_uncleared.count} value={pi.total_uncleared.value} />
            <StatRow label="Due This Week" count={pi.due_this_week.count} value={pi.due_this_week.value} highlight={pi.due_this_week.count > 0} />
            <StatRow label={`Due ${period === 'this_week' ? 'This Week' : period === 'next_month' ? 'Next Month' : 'This Month'}`} count={pi.due_this_month.count} value={pi.due_this_month.value} />
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
              By Payee Type
            </Typography>
            {pi.by_payee_type.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.4)' }}>No issued PDCs outstanding.</Typography>
            ) : (
              pi.by_payee_type.map((r) => (
                <StatRow key={r.payee_type} label={r.payee_type || 'Unknown'} count={r.count} value={r.value} />
              ))
            )}
            {pi.by_bank_account.length > 0 && (
              <>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                  By Bank Account
                </Typography>
                {pi.by_bank_account.slice(0, 5).map((r) => (
                  <StatRow key={r.bank} label={r.bank || 'Unknown'} count={r.count} value={r.value} />
                ))}
              </>
            )}
          </Paper>
        </Grid>

        {/* Cash Flow Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Cash Flow — Incoming vs Outgoing (6 Months)</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cash_flow} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip formatter={(v: number, name: string) => [fmt(v), name === 'incoming' ? 'Incoming (Receipts)' : 'Outgoing (Expenses)']} contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ color: 'rgba(148,163,184,0.7)', fontSize: 12 }} formatter={(v) => v === 'incoming' ? 'Incoming (Receipts)' : 'Outgoing (Expenses)'} />
                <Bar dataKey="incoming" fill="#22c55e" fillOpacity={0.85} radius={[4, 4, 0, 0]} name="incoming" />
                <Bar dataKey="outgoing" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} name="outgoing" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Expense Breakdown Pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 2 }}>Expenses — {period === 'this_week' ? 'This Week' : period === 'next_month' ? 'Next Month' : 'This Month'}</Typography>
            {expense_summary.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)' }}>No expense data this month.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expense_summary} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      {expense_summary.map((_, i) => (
                        <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box mt={1}>
                  {expense_summary.slice(0, 5).map((e, i) => (
                    <Box key={e.category} display="flex" justifyContent="space-between" py={0.4}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>{e.category}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(e.total)}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinanceDashboard;
