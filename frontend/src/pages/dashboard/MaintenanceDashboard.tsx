import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, LinearProgress
} from '@mui/material';
import {
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell as PieCell
} from 'recharts';
import api from '../../services/api';

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;

interface MaintenanceData {
  summary: {
    total_open: number;
    overdue: number;
    open?: number;
    assigned?: number;
    in_progress?: number;
    pending_parts?: number;
    completed?: number;
    verified?: number;
    closed?: number;
  };
  category_breakdown: Array<{ category: string; count: number }>;
  cost_trend: Array<{ month: string; cost: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  assigned: '#f97316',
  in_progress: '#f59e0b',
  pending_parts: '#8b5cf6',
  completed: '#22c55e',
  verified: '#06b6d4',
  closed: '#64748b',
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

const MaintenanceDashboard: React.FC = () => {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/maintenance');
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load Maintenance Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: '#f59e0b' }} />
    </Box>
  );
  if (error) return (
    <Paper sx={{ p: 4, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
      <Typography color="error">{error}</Typography>
    </Paper>
  );
  if (!data) return null;

  const { summary, category_breakdown, cost_trend } = data;

  const statusData = [
    { label: 'Open', key: 'open', value: summary.open || 0 },
    { label: 'Assigned', key: 'assigned', value: summary.assigned || 0 },
    { label: 'In Progress', key: 'in_progress', value: summary.in_progress || 0 },
    { label: 'Pending Parts', key: 'pending_parts', value: summary.pending_parts || 0 },
    { label: 'Completed', key: 'completed', value: summary.completed || 0 },
    { label: 'Verified', key: 'verified', value: summary.verified || 0 },
    { label: 'Closed', key: 'closed', value: summary.closed || 0 },
  ];

  const totalActive = summary.total_open;
  const totalAll = statusData.reduce((a, s) => a + s.value, 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800 }}>Maintenance Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>Ticket status, cost trends & category breakdown</Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          {summary.overdue > 0 && (
            <Chip icon={<WarningIcon />} label={`${summary.overdue} Overdue`} color="error" size="small" />
          )}
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData}
            sx={{ borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b', '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245,158,11,0.08)' } }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Status KPI Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Open Tickets</Typography>
            <Typography variant="h3" sx={{ color: '#ef4444', fontWeight: 900, mt: 1 }}>{totalActive}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>Require action</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: summary.overdue > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${summary.overdue > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Overdue Tickets</Typography>
            <Typography variant="h3" sx={{ color: summary.overdue > 0 ? '#ef4444' : '#22c55e', fontWeight: 900, mt: 1 }}>{summary.overdue}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>{summary.overdue > 0 ? '> 7 days old' : 'All on track'}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Completed</Typography>
            <Typography variant="h3" sx={{ color: '#22c55e', fontWeight: 900, mt: 1 }}>{(summary.completed || 0) + (summary.verified || 0)}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>Done + Verified</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Total Tickets</Typography>
            <Typography variant="h3" sx={{ color: '#6366f1', fontWeight: 900, mt: 1 }}>{totalAll}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>All time</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Status breakdown bars */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>Tickets by Status</Typography>
              <Button size="small" component={Link} to="/maintenance" sx={{ color: '#f59e0b', fontSize: '0.72rem' }}>View All →</Button>
            </Box>
            {statusData.map((s) => (
              <Box key={s.key} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)', fontWeight: 600 }}>{s.label}</Typography>
                  <Typography variant="caption" sx={{ color: STATUS_COLORS[s.key], fontWeight: 800 }}>{s.value}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={totalAll > 0 ? (s.value / totalAll) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[s.key], borderRadius: 3 } }}
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Category Breakdown Pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 2 }}>By Category (Active)</Typography>
            {category_breakdown.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)' }}>No active tickets by category.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={category_breakdown} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={3}>
                      {category_breakdown.map((_, i) => (
                        <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box mt={1}>
                  {category_breakdown.slice(0, 5).map((c, i) => (
                    <Box key={c.category} display="flex" justifyContent="space-between" py={0.4}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>{c.category}</Typography>
                      </Box>
                      <Chip label={c.count} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8' }} />
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Cost Trend */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Cost Trend (6 Months)</Typography>
            {cost_trend.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={180} gap={2}>
                <BuildIcon sx={{ color: 'rgba(148,163,184,0.2)', fontSize: 48 }} />
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)', textAlign: 'center' }}>No linked maintenance expense data available yet.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={cost_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip formatter={(v: number) => [fmt(v), 'Cost']} contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MaintenanceDashboard;
