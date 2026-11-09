import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, LinearProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  HotelOutlined as HotelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';

interface LabourCampData {
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    total_capacity_beds: number;
    total_active_residents: number;
    occupancy_rate: number;
  };
  unit_status_breakdown: Array<{ status: string; count: number }>;
  utility_totals_last_30d: Record<string, number>;
}

const STATUS_COLOR: Record<string, string> = {
  Occupied: '#22c55e',
  Vacant: '#6366f1',
  Maintenance: '#f59e0b',
  Reserved: '#06b6d4',
};

const LabourCampDashboard: React.FC = () => {
  const [data, setData] = useState<LabourCampData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/labour-camp');
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load Labour Camp Dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  const { summary, unit_status_breakdown, utility_totals_last_30d } = data;

  const utilityData = Object.entries(utility_totals_last_30d).map(([type, consumption]) => ({
    type,
    consumption,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800 }}>Labour Camp Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>Room occupancy, residents & utilities overview</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData}
          sx={{ borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4', '&:hover': { borderColor: '#06b6d4', bgcolor: 'rgba(6,182,212,0.08)' } }}>
          Refresh
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Total Rooms', value: summary.total_units, color: '#6366f1', icon: <HotelIcon sx={{ fontSize: 18 }} /> },
          { label: 'Occupied Rooms', value: summary.occupied_units, color: '#22c55e', icon: <HotelIcon sx={{ fontSize: 18 }} /> },
          { label: 'Vacant Rooms', value: summary.vacant_units, color: summary.vacant_units > 0 ? '#f59e0b' : '#22c55e', icon: <HotelIcon sx={{ fontSize: 18 }} /> },
          { label: 'Total Residents', value: summary.total_active_residents, color: '#06b6d4', icon: <PeopleIcon sx={{ fontSize: 18 }} /> },
          { label: 'Total Beds', value: summary.total_capacity_beds, color: '#8b5cf6', icon: <HotelIcon sx={{ fontSize: 18 }} /> },
        ].map((k) => (
          <Grid item xs={6} md key={k.label}>
            <Paper sx={{ p: 2.5, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</Typography>
                <Box sx={{ color: k.color }}>{k.icon}</Box>
              </Box>
              <Typography variant="h3" sx={{ color: k.color, fontWeight: 900 }}>{k.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Occupancy Rate Gauge */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Occupancy Rate</Typography>
            <Box textAlign="center" mb={3}>
              <Typography variant="h1" sx={{
                color: summary.occupancy_rate >= 80 ? '#22c55e' : summary.occupancy_rate >= 60 ? '#f59e0b' : '#ef4444',
                fontWeight: 900, fontSize: '4rem'
              }}>
                {summary.occupancy_rate}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={summary.occupancy_rate}
                sx={{ mt: 2, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: summary.occupancy_rate >= 80 ? '#22c55e' : '#f59e0b', borderRadius: 5 } }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)', display: 'block', mt: 1 }}>
                {summary.occupied_units} of {summary.total_units} rooms occupied
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-around">
              {unit_status_breakdown.map((s) => (
                <Box key={s.status} textAlign="center">
                  <Typography variant="h5" sx={{ color: STATUS_COLOR[s.status] || '#64748b', fontWeight: 800 }}>{s.count}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.65rem' }}>{s.status}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Unit Status Breakdown Bar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>Rooms by Status</Typography>
              <Button size="small" component={Link} to="/labour-camp" sx={{ color: '#06b6d4', fontSize: '0.72rem' }}>Manage →</Button>
            </Box>
            {unit_status_breakdown.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)' }}>No room data found.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={unit_status_breakdown} barCategoryGap="35%">
                    <XAxis dataKey="status" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReTooltip contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {unit_status_breakdown.map((s, i) => (
                        <Box component="rect" key={i} fill={STATUS_COLOR[s.status] || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                  {unit_status_breakdown.map((s) => (
                    <Chip key={s.status} label={`${s.status}: ${s.count}`} size="small"
                      sx={{ bgcolor: `${STATUS_COLOR[s.status] || '#6366f1'}20`, color: STATUS_COLOR[s.status] || '#6366f1', fontSize: '0.68rem', height: 20 }} />
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Utility Consumption */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Utility Consumption (30 Days)</Typography>
            {utilityData.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={200} gap={2}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)', textAlign: 'center' }}>
                  No utility readings recorded in the last 30 days.
                </Typography>
                <Button variant="outlined" size="small" component={Link} to="/labour-camp/utilities"
                  sx={{ borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4', fontSize: '0.72rem' }}>
                  Add Readings
                </Button>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={utilityData} barCategoryGap="30%">
                    <XAxis dataKey="type" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReTooltip contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                    <Bar dataKey="consumption" fill="#06b6d4" fillOpacity={0.85} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Box mt={2} display="flex" flexDirection="column" gap={0.5}>
                  {utilityData.map((u) => (
                    <Box key={u.type} display="flex" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }}>{u.type}</Typography>
                      <Typography variant="caption" sx={{ color: '#06b6d4', fontWeight: 700 }}>{u.consumption.toLocaleString()} units</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Box display="flex" gap={2} flexWrap="wrap">
            {[
              { label: 'Manage Rooms', to: '/labour-camp' },
              { label: 'View Residents', to: '/labour-camp/residents' },
              { label: 'Utility Readings', to: '/labour-camp/utilities' },
              { label: 'Labour Camp Report (R21)', to: '/reports' },
            ].map((a) => (
              <Button key={a.label} variant="outlined" size="small" component={Link} to={a.to}
                sx={{ borderColor: 'rgba(6,182,212,0.35)', color: '#22d3ee', '&:hover': { borderColor: '#06b6d4', bgcolor: 'rgba(6,182,212,0.08)' }, fontWeight: 600, fontSize: '0.78rem' }}>
                {a.label}
              </Button>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LabourCampDashboard;
