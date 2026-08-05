import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <AssignmentIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Tenants Contract</Typography>
            <Typography variant="body2" color="text.secondary">{leases.length} leases found</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tenants-leases/leases/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Lease
          </Button>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Lease Number</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : leases.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No leases found.</TableCell></TableRow>
              ) : (
                leases.map((lease) => {
                  const statusColors = getStatusColor(lease.status);
                  return (
                    <TableRow key={lease.lease_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{lease.lease_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenants[lease.tenant_id] || lease.tenant_id}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{properties[lease.property_id] || lease.property_id}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{lease.lease_type}</Typography></TableCell>
                      <TableCell>
                        <Chip label={lease.status} size="small"
                          sx={{ bgcolor: statusColors.bg, color: statusColors.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/tenants-leases/leases/${lease.lease_id}`)} sx={{ color: '#6366f1' }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/tenants-leases/leases/${lease.lease_id}/edit`)} sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}>
                            <EditIcon fontSize="small" />
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
    </Box>
  );
};

export default LeaseList;
