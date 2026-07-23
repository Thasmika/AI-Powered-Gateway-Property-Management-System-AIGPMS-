import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Divider, Button, Avatar, CircularProgress, Alert, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton
} from '@mui/material';
import DomainIcon from '@mui/icons-material/Domain';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PropertyUnit {
  unit_id: string;
  unit_number: string;
  unit_type: string | null;
  area_sqft: number | null;
  status: string;
}

interface PropertyDetail {
  property_id: string;
  property_code: string;
  property_name: string;
  property_type: string | null;
  building_name: string | null;
  community: string | null;
  emirate: string | null;
  address_line_1: string | null;
  total_units: number | null;
  total_area_sqft: number | null;
  status: string;
  units: PropertyUnit[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PropertyDetail: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitData, setUnitData] = useState({
    unit_number: '',
    unit_type: 'Apartment',
    area_sqft: '',
    status: 'Vacant'
  });
  const [unitSaving, setUnitSaving] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/properties/${propertyId}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load property details');
      setProperty(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [propertyId, token]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const handleAddUnit = async () => {
    if (!unitData.unit_number) return;
    setUnitSaving(true);
    try {
      const payload = {
        unit_number: unitData.unit_number,
        unit_type: unitData.unit_type,
        area_sqft: unitData.area_sqft ? parseFloat(unitData.area_sqft) : null,
        status: unitData.status
      };
      const res = await fetch(`${API}/properties/${propertyId}/units`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to add unit');
      setUnitModalOpen(false);
      setUnitData({ unit_number: '', unit_type: 'Apartment', area_sqft: '', status: 'Vacant' });
      fetchProperty();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUnitSaving(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    try {
      const res = await fetch(`${API}/properties/${propertyId}/units/${unitId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to delete unit');
      fetchProperty();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error || !property) return <Alert severity="error">{error || 'Property not found'}</Alert>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/properties')} sx={{ mb: 2, color: 'text.secondary' }}>
        Back to Properties
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 56, height: 56 }}>
          <DomainIcon fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>{property.property_name}</Typography>
          <Typography variant="subtitle1" color="text.secondary">{property.property_code}</Typography>
        </Box>
        <Chip label={property.status} sx={{ ml: 'auto', bgcolor: property.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.1)', color: property.status === 'Active' ? '#10b981' : 'white' }} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Overview</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{property.property_type || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Building Name</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{property.building_name || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Location</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{property.community ? `${property.community}, ${property.emirate}` : (property.emirate || '—')}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Units</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{property.total_units || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Area (SqFt)</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{property.total_area_sqft || '—'}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>Units</Typography>
              <Button size="small" variant="outlined" onClick={() => setUnitModalOpen(true)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Add Unit</Button>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            
            {property.units && property.units.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary' } }}>
                    <TableCell>Unit Number</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Area</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {property.units.map(unit => (
                    <TableRow key={unit.unit_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' } }}>
                      <TableCell sx={{ color: 'white' }}>{unit.unit_number}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{unit.unit_type || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{unit.area_sqft || '—'} sqft</TableCell>
                      <TableCell>
                         <Chip label={unit.status} size="small" sx={{ bgcolor: unit.status === 'Vacant' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: unit.status === 'Vacant' ? '#f59e0b' : '#10b981', fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleDeleteUnit(unit.unit_id)} sx={{ color: 'text.secondary', '&:hover': { color: '#ef4444' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No units registered for this property.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      {/* @ts-ignore */}
      <Dialog open={unitModalOpen} onClose={() => setUnitModalOpen(false)} PaperProps={{ sx: { bgcolor: '#1e1e2d', color: 'white' } }}>
        <DialogTitle>Add New Unit</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, minWidth: 400 }}>
          <TextField 
            label="Unit Number *" 
            value={unitData.unit_number} 
            onChange={(e) => setUnitData({...unitData, unit_number: e.target.value})}
            fullWidth
            sx={{ mt: 1 }}
          />
          <TextField 
            select 
            label="Type" 
            value={unitData.unit_type} 
            onChange={(e) => setUnitData({...unitData, unit_type: e.target.value})}
            fullWidth
          >
            {['Apartment', 'Villa', 'Office', 'Retail', 'Warehouse', 'Room'].map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField 
            label="Area (SqFt)" 
            type="number"
            value={unitData.area_sqft} 
            onChange={(e) => setUnitData({...unitData, area_sqft: e.target.value})}
            fullWidth
          />
          <TextField 
            select 
            label="Status" 
            value={unitData.status} 
            onChange={(e) => setUnitData({...unitData, status: e.target.value})}
            fullWidth
          >
            {['Vacant', 'Occupied', 'Maintenance'].map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setUnitModalOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddUnit} 
            disabled={!unitData.unit_number || unitSaving}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {unitSaving ? 'Saving...' : 'Add Unit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyDetail;
