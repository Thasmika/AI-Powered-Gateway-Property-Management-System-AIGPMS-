import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';

import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

interface Tenant {
  tenant_id: string;
  tenant_type: string;
  full_name: string;
  trade_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

const TenantList: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/tenants');
      setTenants(res.data);
    } catch (e: any) { 
      setError(e.response?.data?.detail || e.message || 'Failed to load tenants'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
      case 'Inactive': return { bg: 'rgba(100,116,139,0.15)', text: '#64748b' };
      case 'Blacklisted': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
      default: return { bg: 'rgba(255,255,255,0.1)', text: 'white' };
    }
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;
    try {
      await api.delete(`/tenants/${tenantToDelete.tenant_id}`);
      setTenants(tenants.filter(t => t.tenant_id !== tenantToDelete.tenant_id));
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to delete tenant');
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <PeopleIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Tenants Master</Typography>
            <Typography variant="body2" color="text.secondary">{tenants.length} tenants registered</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Tenants Master" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tenants-leases/tenants/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Tenant
          </Button>
          </Box>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Type</TableCell>
                <TableCell>Full Name / Trade Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : tenants.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No tenants found.</TableCell></TableRow>
              ) : (
                tenants.map((tenant) => {
                  const statusColors = getStatusColor(tenant.status);
                  return (
                    <TableRow key={tenant.tenant_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenant.tenant_type}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{tenant.full_name}</Typography>
                        {tenant.trade_name && <Typography variant="caption" color="text.secondary">{tenant.trade_name}</Typography>}
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenant.phone || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenant.email || '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip label={tenant.status} size="small"
                          sx={{ bgcolor: statusColors.bg, color: statusColors.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/tenants-leases/tenants/${tenant.tenant_id}`)} sx={{ color: '#6366f1' }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/tenants-leases/tenants/${tenant.tenant_id}/edit`)} sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteClick(tenant)} sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.1)' } }}>
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
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to delete the tenant <strong>{tenantToDelete?.full_name}</strong>?
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

export default TenantList;
