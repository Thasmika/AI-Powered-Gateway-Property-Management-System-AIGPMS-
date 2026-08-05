import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Avatar, Alert, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Owner {
  owner_id: string;
  full_name: string;
  owner_type: string;
}

interface OwnershipRecord {
  ownership_id: string;
  property_id: string;
  legal_owner_id: string;
  ownership_type: string;
  ownership_percentage: number;
  is_current: boolean;
  legal_owner?: Owner;
}

interface Property {
  property_id: string;
  property_name: string;
  property_code: string;
}

interface PropertyOwnershipGroup {
  property: Property;
  records: OwnershipRecord[];
  totalPercentage: number;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const OwnershipList: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [groupedOwnership, setGroupedOwnership] = useState<PropertyOwnershipGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [propsRes, recordsRes] = await Promise.all([
        fetch(`${API}/properties`, { headers: authHeaders }),
        fetch(`${API}/ownership/records`, { headers: authHeaders })
      ]);

      if (!propsRes.ok || !recordsRes.ok) throw new Error('Failed to load data');

      const properties: Property[] = await propsRes.json();
      const records: OwnershipRecord[] = await recordsRes.json();

      const groups: PropertyOwnershipGroup[] = properties.map(prop => {
        const propRecords = records.filter(r => r.property_id === prop.property_id && r.is_current);
        const total = propRecords.reduce((sum, r) => sum + Number(r.ownership_percentage), 0);
        return {
          property: prop,
          records: propRecords,
          totalPercentage: total
        };
      });

      groups.sort((a, b) => b.totalPercentage - a.totalPercentage);
      
      setGroupedOwnership(groups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete all ownership records for this property? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/ownership/records/by-property/${propertyId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        let errorMsg = 'Failed to delete ownership records';
        try {
          const data = await res.json();
          if (data && data.detail) errorMsg = data.detail;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'success';
    if (percentage > 0) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981', width: 48, height: 48 }}>
            <PeopleIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Ownership & Beneficiaries</Typography>
            <Typography variant="body2" color="text.secondary">Property-wise co-ownership structures</Typography>
          </Box>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Property</TableCell>
                <TableCell>Co-owners (Current)</TableCell>
                <TableCell sx={{ width: '30%' }}>Ownership Split (%)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : groupedOwnership.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No properties found.</TableCell></TableRow>
              ) : (
                groupedOwnership.map((group) => (
                  <TableRow key={group.property.property_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{group.property.property_name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{group.property.property_code}</Typography>
                    </TableCell>
                    <TableCell>
                      {group.records.length > 0 ? (
                        group.records.map(r => (
                          <Typography key={r.ownership_id} variant="body2" color="text.secondary">
                            {r.legal_owner?.full_name || 'Unknown Owner'} ({Number(r.ownership_percentage)}%)
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Not configured</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={group.totalPercentage} 
                            color={getProgressColor(group.totalPercentage) as any}
                            sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)' }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                          {group.totalPercentage}%
                        </Typography>
                      </Box>
                      {group.totalPercentage < 100 && (
                        <Typography variant="caption" color="error">Action required: Must total 100%</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Ownership">
                        <IconButton size="small" onClick={() => navigate(`/ownership/${group.property.property_id}`)} sx={{ color: '#10b981' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Ownership">
                        <IconButton size="small" onClick={() => navigate(`/ownership/${group.property.property_id}`)} sx={{ color: '#3b82f6' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Ownership">
                        <IconButton size="small" onClick={() => handleDelete(group.property.property_id)} sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default OwnershipList;
