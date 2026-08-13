import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip,
  Stack, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';

import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Lease {
  lease_id: string;
  lease_number: string;
  tenant_id: string;
  property_id: string;
  lease_type: string;
  status: string;
  versions: any[];
}

const LeaseList: React.FC = () => {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<Lease | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leasesRes, tenantsRes, propsRes] = await Promise.all([
        api.get('/leases'),
        api.get('/tenants'),
        api.get('/properties')
      ]);
      
      setLeases(leasesRes.data);
      
      const tenantMap: Record<string, string> = {};
      tenantsRes.data.forEach((t: any) => {
        tenantMap[t.tenant_id] = t.full_name + (t.trade_name ? ` (${t.trade_name})` : '');
      });
      setTenants(tenantMap);

      const propMap: Record<string, string> = {};
      propsRes.data.forEach((p: any) => {
        propMap[p.property_id] = p.property_name;
      });
      setProperties(propMap);

    } catch (e: any) { 
      setError(e.response?.data?.detail || e.message || 'Failed to load data'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
      case 'Expired': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
      case 'Terminated': return { bg: 'rgba(100,116,139,0.15)', text: '#64748b' };
      default: return { bg: 'rgba(255,255,255,0.1)', text: 'white' };
    }
  };

  const handleDeleteClick = (lease: Lease) => {
    setLeaseToDelete(lease);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leaseToDelete) return;
    try {
      await api.delete(`/leases/${leaseToDelete.lease_id}`);
      setLeases(leases.filter(l => l.lease_id !== leaseToDelete.lease_id));
      setDeleteDialogOpen(false);
      setLeaseToDelete(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to delete lease');
      setDeleteDialogOpen(false);
    }
  };

  // Filter leases
  const filteredLeases = leases.filter((lease) => {
    const matchesSearch = !search || 
      lease.lease_number?.toLowerCase().includes(search.toLowerCase()) ||
      (tenants[lease.tenant_id] || lease.tenant_id)?.toLowerCase().includes(search.toLowerCase()) ||
      (properties[lease.property_id] || lease.property_id)?.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = !statusFilter || lease.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // KPI Stats
  const byStatus = (s: string) => leases.filter(l => l.status === s).length;
  const kpis = [
    { label: 'Total Contracts', value: leases.length, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Active', value: byStatus('Active'), color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Expired', value: byStatus('Expired'), color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Terminated', value: byStatus('Terminated'), color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.2)', width: 40, height: 40 }}>
              <AssignmentIcon sx={{ color: '#6366f1', fontSize: 22 }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="white">
              Tenancy Contracts Register
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" ml={7}>
            Manage and track all tenancy contracts, statuses, and property associations
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tenants-leases/leases/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Lease
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Strip */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            sx={{
              flex: '1 1 200px',
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
          placeholder="Search lease no., tenant, property..."
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
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Terminated">Terminated</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" ml="auto !important">
          Showing {filteredLeases.length} of {leases.length} contracts
        </Typography>
      </Stack>
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
                <TableCell>Lease Number</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : filteredLeases.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No tenancy contracts found.</TableCell></TableRow>
              ) : (
                filteredLeases.map((lease) => {
                  const statusColors = getStatusColor(lease.status);
                  return (
                    <TableRow key={lease.lease_id} sx={{ cursor: 'pointer', '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(99,102,241,0.08)' } }} onClick={() => navigate(`/tenants-leases/leases/${lease.lease_id}`)}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{lease.lease_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenants[lease.tenant_id] || lease.tenant_id}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{properties[lease.property_id] || lease.property_id}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{lease.lease_type}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={lease.status} size="small"
                          sx={{ bgcolor: statusColors.bg, color: statusColors.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/tenants-leases/leases/${lease.lease_id}`); }} sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/tenants-leases/leases/${lease.lease_id}/edit`); }} sx={{ color: '#f59e0b', '&:hover': { background: 'rgba(245,158,11,0.15)' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteClick(lease); }} sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.15)' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: '#1e1e2f',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <DialogTitle>Delete Tenancy Contract</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to delete the contract <strong>{leaseToDelete?.lease_number}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaseList;
