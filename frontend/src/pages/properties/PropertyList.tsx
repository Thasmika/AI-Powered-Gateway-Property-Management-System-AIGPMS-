import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DomainIcon from '@mui/icons-material/Domain';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Property {
  property_id: string;
  property_code: string;
  property_name: string;
  property_type: string | null;
  community: string | null;
  emirate: string | null;
  status: string;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PropertyList: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/properties`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load properties');
      setProperties(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleDelete = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    try {
      const res = await fetch(`${API}/properties/${propertyId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete property');
      }
      // Successfully deleted, refresh list
      fetchProperties();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
      case 'Inactive': return { bg: 'rgba(100,116,139,0.15)', text: '#64748b' };
      case 'Under Construction': return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' };
      default: return { bg: 'rgba(255,255,255,0.1)', text: 'white' };
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <DomainIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Properties Master</Typography>
            <Typography variant="body2" color="text.secondary">{properties.length} properties registered</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/properties/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Property
          </Button>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Code</TableCell>
                <TableCell>Property Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : properties.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No properties found.</TableCell></TableRow>
              ) : (
                properties.map((prop) => {
                  const statusColors = getStatusColor(prop.status);
                  return (
                    <TableRow key={prop.property_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{prop.property_code}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{prop.property_name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{prop.property_type || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{prop.community ? `${prop.community}, ${prop.emirate}` : (prop.emirate || '—')}</Typography></TableCell>
                      <TableCell>
                        <Chip label={prop.status} size="small"
                          sx={{ bgcolor: statusColors.bg, color: statusColors.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/properties/${prop.property_id}`)} sx={{ color: '#6366f1' }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/properties/${prop.property_id}/edit`)} sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(prop.property_id)} sx={{ color: 'text.secondary', '&:hover': { color: '#ef4444' } }}>
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
    </Box>
  );
};

export default PropertyList;
