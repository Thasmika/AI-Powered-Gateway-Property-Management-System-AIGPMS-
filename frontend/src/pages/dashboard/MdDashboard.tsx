import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Paper, Button, Divider, CircularProgress, Tooltip,
  List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Apartment as ApartmentIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as AssessmentIcon,
  SmartToy as SmartToyIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import api from '../../services/api';

interface MdDashboardData {
  portfolio: {
    total_properties: number;
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    occupancy_rate: number;
  };
  investment: {
    total_portfolio_purchase_value: number;
    total_market_value: number;
    unrealized_capital_gain: number;
    capital_appreciation_pct: number;
    total_loan_outstanding: number;
    total_equity_value: number;
  };
  finance: {
    pdcs_held_count: number;
    pdcs_held_value: number;
    pdcs_issued_uncleared_count: number;
    pdcs_issued_uncleared_value: number;
    upcoming_commitments_this_month: number;
    pdcs_due_this_week: number;
  };
  leases: {
    active_leases: number;
    expiring_next_30_days: number;
  };
  activity_feed: Array<{
    id: number;
    action: string;
    module: string;
    entity_reference: string;
    user_name: string;
    timestamp: string;
  }>;
}

const fmt = (val: number) =>
  `AED ${val.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

const KpiCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  to?: string;
}> = ({ title, value, subtitle, icon, trend, color = '#6366f1', to }) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 3,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${color}30` },
      cursor: to ? 'pointer' : 'default',
    }}
    component={to ? Link : 'div'}
    to={to}
    style={{ textDecoration: 'none' }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
          {title}
        </Typography>
        <Avatar sx={{ bgcolor: `${color}25`, width: 36, height: 36, color }}>
          {icon}
        </Avatar>
      </Box>
      <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800, mb: 0.5, fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
        {value}
      </Typography>
      {subtitle && (
        <Box display="flex" alignItems="center" gap={0.5} mt={1}>
          {trend === 'up' && <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />}
          {trend === 'down' && <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
          <Typography variant="caption" sx={{ color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : 'rgba(148,163,184,0.7)', fontSize: '0.72rem' }}>
            {subtitle}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const MdDashboard: React.FC = () => {
  const [data, setData] = useState<MdDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/md');
      setData(res.data);
      setLastRefresh(new Date());
      setError('');
    } catch (e: any) {
      setError('Failed to load dashboard data. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  if (error) return (
    <Paper sx={{ p: 4, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
      <Typography color="error">{error}</Typography>
    </Paper>
  );

  if (!data) return null;

  const { portfolio, investment, finance, leases, activity_feed } = data;

  const cashFlowData = [
    { label: 'PDCs Held', value: finance.pdcs_held_value, color: '#22c55e' },
    { label: 'PDCs Issued', value: finance.pdcs_issued_uncleared_value, color: '#ef4444' },
    { label: 'Commitments', value: finance.upcoming_commitments_this_month, color: '#f59e0b' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800, mb: 0.5 }}>
            MD Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>
            Portfolio overview — {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
        <Tooltip title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', '&:hover': { borderColor: '#6366f1', bgcolor: 'rgba(99,102,241,0.08)' } }}
          >
            Refresh
          </Button>
        </Tooltip>
      </Box>

      {/* Alerts Row */}
      {(leases.expiring_next_30_days > 0 || finance.pdcs_due_this_week > 0) && (
        <Box mb={3} display="flex" gap={2} flexWrap="wrap">
          {leases.expiring_next_30_days > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${leases.expiring_next_30_days} lease(s) expiring in 30 days`}
              color="warning" variant="outlined" size="small"
              component={Link} to="/leases" clickable
            />
          )}
          {finance.pdcs_due_this_week > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${finance.pdcs_due_this_week} PDC(s) due this week`}
              color="error" variant="outlined" size="small"
              component={Link} to="/pdc/register" clickable
            />
          )}
        </Box>
      )}

      {/* Portfolio KPIs */}
      <Typography variant="overline" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 2, display: 'block', mb: 2 }}>
        Portfolio Overview
      </Typography>
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Total Properties" value={String(portfolio.total_properties)} icon={<ApartmentIcon sx={{ fontSize: 18 }} />} color="#6366f1" to="/properties" subtitle="Active in portfolio" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Total Units" value={String(portfolio.total_units)} icon={<ApartmentIcon sx={{ fontSize: 18 }} />} color="#8b5cf6" subtitle={`${portfolio.occupied_units} occupied · ${portfolio.vacant_units} vacant`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Occupancy Rate" value={`${portfolio.occupancy_rate}%`} icon={<CheckCircleIcon sx={{ fontSize: 18 }} />} color="#22c55e" trend={portfolio.occupancy_rate >= 80 ? 'up' : 'down'} subtitle={portfolio.occupancy_rate >= 80 ? 'Above target' : 'Below 80% target'} to="/dashboard/property" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Active Leases" value={String(leases.active_leases)} icon={<AssessmentIcon sx={{ fontSize: 18 }} />} color="#06b6d4" subtitle={leases.expiring_next_30_days > 0 ? `${leases.expiring_next_30_days} expiring soon` : 'All leases stable'} trend={leases.expiring_next_30_days > 0 ? 'down' : 'neutral'} to="/leases" />
        </Grid>
      </Grid>

      {/* Investment KPIs */}
      <Typography variant="overline" sx={{ color: '#f59e0b', fontWeight: 700, letterSpacing: 2, display: 'block', mb: 2 }}>
        Investment Performance
      </Typography>
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Portfolio Market Value" value={fmt(investment.total_market_value)} icon={<ShowChartIcon sx={{ fontSize: 18 }} />} color="#f59e0b" to="/investment-dashboard" subtitle="Current estimated value" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Unrealized Capital Gain" value={fmt(investment.unrealized_capital_gain)} icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} color="#22c55e" trend={investment.unrealized_capital_gain >= 0 ? 'up' : 'down'} subtitle={fmtPct(investment.capital_appreciation_pct) + ' appreciation'} to="/investment-dashboard" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard title="Net Equity Value" value={fmt(investment.total_equity_value)} icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />} color="#6366f1" subtitle={`Loan outstanding: ${fmt(investment.total_loan_outstanding)}`} trend={investment.total_equity_value > 0 ? 'up' : 'down'} to="/investment-dashboard" />
        </Grid>
      </Grid>

      {/* Finance KPIs + Cash Flow */}
      <Typography variant="overline" sx={{ color: '#06b6d4', fontWeight: 700, letterSpacing: 2, display: 'block', mb: 2 }}>
        Finance Summary
      </Typography>
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="PDCs Held" value={fmt(finance.pdcs_held_value)} icon={<AttachMoneyIcon sx={{ fontSize: 18 }} />} color="#22c55e" subtitle={`${finance.pdcs_held_count} cheques in custody`} to="/pdc/register" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="PDCs Issued Outstanding" value={fmt(finance.pdcs_issued_uncleared_value)} icon={<AttachMoneyIcon sx={{ fontSize: 18 }} />} color="#ef4444" subtitle={`${finance.pdcs_issued_uncleared_count} cheques outstanding`} to="/pdc-issued" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Upcoming Commitments" value={fmt(finance.upcoming_commitments_this_month)} icon={<WarningIcon sx={{ fontSize: 18 }} />} color="#f59e0b" subtitle="This month" to="/dashboard/finance" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="PDCs Due This Week" value={String(finance.pdcs_due_this_week)} icon={<WarningIcon sx={{ fontSize: 18 }} />} color={finance.pdcs_due_this_week > 0 ? '#f97316' : '#22c55e'} trend={finance.pdcs_due_this_week > 0 ? 'down' : 'neutral'} subtitle="Require action" to="/pdc/register" />
        </Grid>
      </Grid>

      {/* Cash flow chart + Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Cash Position Overview</Typography>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cashFlowData} barCategoryGap="35%">
                <XAxis dataKey="label" tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReTooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {cashFlowData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Box mt={2}>
              <Button variant="outlined" size="small" component={Link} to="/dashboard/finance" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', fontSize: '0.75rem' }}>
                Full Finance Dashboard
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>Recent Activity</Typography>
              <HistoryIcon sx={{ color: 'rgba(148,163,184,0.5)', fontSize: 20 }} />
            </Box>
            {activity_feed.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.5)', textAlign: 'center', py: 4 }}>
                No recent activity to display.
              </Typography>
            ) : (
              <List dense disablePadding>
                {activity_feed.slice(0, 8).map((a, i) => (
                  <React.Fragment key={a.id}>
                    <ListItem disableGutters sx={{ py: 0.75 }}>
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 700 }}>
                          {a.action?.[0] || 'A'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, display: 'block', lineHeight: 1.4 }}>
                            {a.action} · {a.module} {a.entity_reference ? `#${a.entity_reference}` : ''}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.65rem' }}>
                            {a.user_name} · {a.timestamp ? new Date(a.timestamp).toLocaleString('en-AE') : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {i < activity_feed.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mt={4} display="flex" gap={2} flexWrap="wrap">
        {[
          { label: 'Investment Dashboard', to: '/investment-dashboard', color: '#f59e0b' },
          { label: 'Finance Dashboard', to: '/dashboard/finance', color: '#06b6d4' },
          { label: 'Property Dashboard', to: '/dashboard/property', color: '#8b5cf6' },
          { label: 'AI Assistant', to: '/ai-assistant', color: '#22c55e', icon: <SmartToyIcon sx={{ fontSize: 16 }} /> },
          { label: 'Reports', to: '/reports', color: '#6366f1' },
        ].map((a) => (
          <Button
            key={a.label}
            variant="outlined"
            size="small"
            component={Link}
            to={a.to}
            startIcon={a.icon}
            sx={{ borderColor: `${a.color}40`, color: a.color, '&:hover': { borderColor: a.color, bgcolor: `${a.color}10` }, fontWeight: 600, fontSize: '0.78rem' }}
          >
            {a.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default MdDashboard;
