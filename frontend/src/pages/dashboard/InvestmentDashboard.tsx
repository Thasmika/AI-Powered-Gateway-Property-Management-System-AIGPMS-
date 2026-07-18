import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DomainIcon from '@mui/icons-material/Domain';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useAuth } from '../../context/AuthContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface KPIData {
  total_portfolio_purchase_value: number;
  current_estimated_market_value: number;
  unrealized_capital_gain: number;
  capital_appreciation_pct: number;
  net_rental_yield_pct: number;
  roi_pct: number;
  total_loan_outstanding: number;
  total_equity_value: number;
}

interface ChartData {
  property_name: string;
  purchase_value: number;
  market_value: number;
}

interface PropertyListItem {
  property_id: string;
  property_name: string;
  purchase_value: number;
  market_value: number;
  appreciation_pct: number;
  value_declined: boolean;
}

interface DashboardData {
  kpis: KPIData;
  chart_data: ChartData[];
  property_list: PropertyListItem[];
}

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode; color?: string; trend?: string }> = ({ title, value, icon, color = '#6366f1', trend }) => (
  <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ bgcolor: `${color}20`, color, p: 1.5, borderRadius: 2, display: 'flex' }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', mt: 0.5 }}>{value}</Typography>
      {trend && (
        <Typography variant="caption" sx={{ color: trend.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {trend}
        </Typography>
      )}
    </Box>
  </Paper>
);

const InvestmentDashboard: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/investment/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      setData(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error || !data) return <Alert severity="error">{error || 'Dashboard not found'}</Alert>;

  const { kpis, chart_data, property_list } = data;

  const barChartData = {
    labels: chart_data.map(d => d.property_name),
    datasets: [
      {
        label: 'Purchase Value (AED)',
        data: chart_data.map(d => d.purchase_value),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
      {
        label: 'Market Value (AED)',
        data: chart_data.map(d => d.market_value),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 4 }}>Investment Dashboard</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Total Purchase Value" value={`AED ${(kpis.total_portfolio_purchase_value / 1000000).toFixed(2)}M`} icon={<DomainIcon />} color="#3b82f6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Est. Market Value" value={`AED ${(kpis.current_estimated_market_value / 1000000).toFixed(2)}M`} icon={<AccountBalanceIcon />} color="#10b981" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Unrealized Capital Gain" value={`AED ${(kpis.unrealized_capital_gain / 1000000).toFixed(2)}M`} icon={<TrendingUpIcon />} color="#8b5cf6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Capital Appreciation" value={`${kpis.capital_appreciation_pct.toFixed(2)}%`} icon={<ShowChartIcon />} color="#f59e0b" trend={kpis.capital_appreciation_pct >= 0 ? `+${kpis.capital_appreciation_pct.toFixed(2)}%` : `${kpis.capital_appreciation_pct.toFixed(2)}%`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Total Loan Outstanding" value={`AED ${(kpis.total_loan_outstanding / 1000000).toFixed(2)}M`} icon={<AttachMoneyIcon />} color="#ef4444" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Total Equity Value" value={`AED ${(kpis.total_equity_value / 1000000).toFixed(2)}M`} icon={<AccountBalanceIcon />} color="#10b981" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Net Rental Yield (Est)" value={`${kpis.net_rental_yield_pct}%`} icon={<TrendingUpIcon />} color="#06b6d4" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="Total ROI (Est)" value={`${kpis.roi_pct}%`} icon={<ShowChartIcon />} color="#ec4899" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Purchase vs Market Value</Typography>
            <Box sx={{ height: 320 }}>
              <Bar data={barChartData} options={barChartOptions} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, height: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, pb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>Property Performance</Typography>
            </Box>
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'rgba(30,41,59,1)', borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700 } }}>
                    <TableCell>Property</TableCell>
                    <TableCell align="right">Appreciation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {property_list.map((prop) => (
                    <TableRow key={prop.property_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, bgcolor: prop.value_declined ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>{prop.property_name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>AED {(prop.market_value / 1000000).toFixed(2)}M</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${prop.appreciation_pct > 0 ? '+' : ''}${prop.appreciation_pct.toFixed(1)}%`} 
                          size="small" 
                          sx={{ 
                            bgcolor: prop.value_declined ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', 
                            color: prop.value_declined ? '#ef4444' : '#10b981', 
                            fontWeight: 700, fontSize: '0.7rem' 
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvestmentDashboard;
