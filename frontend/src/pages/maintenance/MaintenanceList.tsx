import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Alert,
  TextField, MenuItem, Grid, Tooltip, IconButton, Stack, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import BuildIcon from '@mui/icons-material/Build';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

const priorityColors: Record<string, 'default' | 'warning' | 'error' | 'info' | 'success'> = {
  Low: 'default',
  Medium: 'info',
  High: 'warning',
  Critical: 'error',
};

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Open: 'warning',
  Assigned: 'info',
  'In Progress': 'info',
  'Pending Parts/LPO': 'warning',
  Completed: 'success',
  Verified: 'success',
  Closed: 'default',
  Cancelled: 'error',
};

const STATUSES = [
  'Open', 'Assigned', 'In Progress', 'Pending Parts/LPO',
  'Completed', 'Verified', 'Closed', 'Cancelled',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const MaintenanceList: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category_id = filterCategory;
      if (filterFrom) params.from_date = filterFrom;
      if (filterTo) params.to_date = filterTo;
      const res = await api.get('/maintenance-tickets', { params });
      setTickets(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load maintenance tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/maintenance-tickets/categories');
      setCategories(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, filterCategory, filterFrom, filterTo]);

  // KPI counts
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => ['Assigned', 'In Progress', 'Pending Parts/LPO'].includes(t.status)).length;
  const criticalCount = tickets.filter(t => t.priority === 'Critical' && !['Closed', 'Cancelled'].includes(t.status)).length;
  const completedCount = tickets.filter(t => ['Completed', 'Verified', 'Closed'].includes(t.status)).length;

  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            <BuildIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32 }} />
            Maintenance Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Raise, assign, and track all property maintenance work orders
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="Maintenance Tickets" />
          <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/maintenance/new')}
          size="large"
        >
          Raise Ticket
        </Button>
        </Box>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Open', value: openCount, color: '#f59e0b', icon: <WarningAmberIcon /> },
          { label: 'In Progress', value: inProgressCount, color: '#3b82f6', icon: <PendingIcon /> },
          { label: 'Critical', value: criticalCount, color: '#ef4444', icon: <WarningAmberIcon /> },
          { label: 'Completed / Closed', value: completedCount, color: '#10b981', icon: <CheckCircleIcon /> },
        ].map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{ borderLeft: `4px solid ${kpi.color}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={700} color={kpi.color}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.label}
                    </Typography>
                  </Box>
                  <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">Filters</Typography>
        </Stack>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select fullWidth size="small" label="Status"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select fullWidth size="small" label="Priority"
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Priorities</MenuItem>
              {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select fullWidth size="small" label="Category"
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(c => (
                <MenuItem key={c.category_id} value={c.category_id}>{c.category_name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="Reported From" type="date"
              InputLabelProps={{ shrink: true }}
              value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="Reported To" type="date"
              InputLabelProps={{ shrink: true }}
              value={filterTo} onChange={e => setFilterTo(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button
              fullWidth variant="outlined" size="medium"
              onClick={() => {
                setFilterStatus(''); setFilterPriority('');
                setFilterCategory(''); setFilterFrom(''); setFilterTo('');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>Ticket #</strong></TableCell>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Property</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Reported Date</strong></TableCell>
                  <TableCell><strong>Target Completion</strong></TableCell>
                  <TableCell><strong>Actual Cost (AED)</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No maintenance tickets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map(ticket => (
                    <TableRow
                      key={ticket.ticket_id}
                      hover
                      sx={{
                        borderLeft: ticket.priority === 'Critical'
                          ? '3px solid #ef4444'
                          : ticket.priority === 'High'
                          ? '3px solid #f59e0b'
                          : 'none',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {ticket.ticket_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {ticket.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.property_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.priority}
                          color={priorityColors[ticket.priority] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.status}
                          color={statusColors[ticket.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{ticket.reported_date}</TableCell>
                      <TableCell>
                        {ticket.target_completion_date || '—'}
                      </TableCell>
                      <TableCell align="right">
                        {ticket.actual_cost
                          ? Number(ticket.actual_cost).toLocaleString('en-AE', { minimumFractionDigits: 2 })
                          : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/maintenance/${ticket.ticket_id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {tickets.length} ticket(s)
      </Typography>
    </Box>
  );
};

export default MaintenanceList;
