import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, LinearProgress, Table, TableHead, TableRow,
  TableCell, TableBody
} from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;

interface PropertyDashboardData {
  summary: {
    total_properties: number;
    total_units: number;
    total_occupied: number;
    total_vacant: number;
    overall_occupancy_rate: number;
    leases_expiring_90_days: number;
  };
  occupancy_by_property: Array<{
    property_id: number;
    property_name: string;
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    occupancy_rate: number;
  }>;
  lease_expiry_timeline: Array<{
    lease_id: number;
    lease_reference: string;
    end_date: string;
    days_remaining: number;
    urgency: string;
  }>;
}

const urgencyColor: Record<string, string> = {
  Critical: '#ef4444',
  Warning: '#f59e0b',
  Notice: '#22c55e',
};

const PropertyDashboard: React.FC = () => {
  const [data, setData] = useState<PropertyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/property');
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load Property Dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress sx={{ color: '#8b5cf6' }} />
    </Box>
  );

  if (error) return (
    <Paper sx={{ p: 4, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
      <Typography color="error">{error}</Typography>
    </Paper>
  );

  if (!data) return null;
  const { summary, occupancy_by_property, lease_expiry_timeline } = data;

  const barData = occupancy_by_property.map((p) => ({
    name: p.property_name.length > 18 ? p.property_name.substring(0, 18) + '…' : p.property_name,
    occupied: p.occupied_units,
    vacant: p.vacant_units,
    rate: p.occupancy_rate,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800 }}>Property Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>Occupancy, lease expiry & unit status overview</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData}
          sx={{ borderColor: 'rgba(139,92,246,0.4)', color: '#8b5cf6', '&:hover': { borderColor: '#8b5cf6', bgcolor: 'rgba(139,92,246,0.08)' } }}>
          Refresh
        </Button>
      </Box>

      {/* Summary KPIs */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Total Properties', value: summary.total_properties, color: '#8b5cf6' },
          { label: 'Total Units', value: summary.total_units, color: '#6366f1' },
          { label: 'Occupied Units', value: summary.total_occupied, color: '#22c55e' },
          { label: 'Vacant Units', value: summary.total_vacant, color: summary.total_vacant > 0 ? '#f59e0b' : '#22c55e' },
        ].map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Paper sx={{ p: 2.5, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>{k.label}</Typography>
              <Typography variant="h3" sx={{ color: k.color, fontWeight: 800, mt: 1 }}>{k.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Occupancy by Property Chart */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Occupancy by Property</Typography>
            {barData.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height={220}>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.4)' }}>No property data found.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 48)}>
                <BarChart data={barData} layout="vertical" barCategoryGap="25%">
                  <XAxis type="number" tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ReTooltip formatter={(v: number, name: string) => [v, name === 'occupied' ? 'Occupied' : 'Vacant']} contentStyle={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
                  <Bar dataKey="occupied" stackId="a" fill="#22c55e" fillOpacity={0.85} name="occupied" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="vacant" stackId="a" fill="#374151" fillOpacity={0.85} name="vacant" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Overall occupancy rate */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 3 }}>Portfolio Occupancy</Typography>
            <Box textAlign="center" mb={3}>
              <Typography variant="h1" sx={{ color: summary.overall_occupancy_rate >= 80 ? '#22c55e' : '#f59e0b', fontWeight: 900, fontSize: '4rem', lineHeight: 1 }}>
                {summary.overall_occupancy_rate}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.6)', mt: 1 }}>Overall Occupancy Rate</Typography>
              <LinearProgress
                variant="determinate"
                value={summary.overall_occupancy_rate}
                sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: summary.overall_occupancy_rate >= 80 ? '#22c55e' : '#f59e0b', borderRadius: 4 } }}
              />
            </Box>
            <Box display="flex" justifyContent="space-around" mt={2}>
              <Box textAlign="center">
                <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 800 }}>{summary.total_occupied}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>Occupied</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 800 }}>{summary.total_vacant}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>Vacant</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h5" sx={{ color: '#8b5cf6', fontWeight: 800 }}>{summary.leases_expiring_90_days}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>Expiring (90d)</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Lease Expiry Timeline */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>Lease Expiry Timeline — Next 90 Days</Typography>
              <Button size="small" component={Link} to="/leases" sx={{ color: '#8b5cf6', fontSize: '0.72rem' }}>View All Leases →</Button>
            </Box>
            {lease_expiry_timeline.length === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                <Typography variant="body2" sx={{ color: '#22c55e' }}>✓ No leases expiring in the next 90 days.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Lease Reference', 'End Date', 'Days Remaining', 'Urgency'].map((h) => (
                      <TableCell key={h} sx={{ color: 'rgba(148,163,184,0.6)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8, borderColor: 'rgba(255,255,255,0.06)' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lease_expiry_timeline.map((l) => (
                    <TableRow key={l.lease_id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ color: '#e2e8f0', fontWeight: 600, borderColor: 'rgba(255,255,255,0.04)' }}>
                        <Button size="small" component={Link} to={`/tenants-leases/leases/${l.lease_id}`} sx={{ color: '#818cf8', p: 0, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem' }}>
                          {l.lease_reference}
                        </Button>
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(148,163,184,0.8)', borderColor: 'rgba(255,255,255,0.04)' }}>{l.end_date ? formatDate(l.end_date) : '—'}</TableCell>
                      <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderColor: 'rgba(255,255,255,0.04)' }}>{l.days_remaining} days</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <Chip
                          label={l.urgency}
                          size="small"
                          sx={{ bgcolor: `${urgencyColor[l.urgency]}20`, color: urgencyColor[l.urgency], fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                          icon={l.urgency === 'Critical' ? <WarningIcon sx={{ fontSize: '12px !important', color: `${urgencyColor[l.urgency]} !important` }} /> : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PropertyDashboard;
