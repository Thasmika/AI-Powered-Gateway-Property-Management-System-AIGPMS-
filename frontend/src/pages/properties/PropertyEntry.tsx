import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert, CircularProgress, Divider, Avatar, Autocomplete
} from '@mui/material';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PropertyEntry: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const isEditMode = Boolean(propertyId);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    property_code: '',
    property_name: '',
    property_type: 'Apartment',
    building_name: '',
    community: '',
    emirate: 'Dubai',
    address_line_1: '',
    address_line_2: '',
    total_units: '',
    total_area_sqft: '',
    status: 'Active'
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchPropertyTypes = async () => {
      try {
        const res = await fetch(`${API}/master/property-types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPropertyTypes(data);
        }
      } catch (e) {
        console.error("Failed to fetch property types", e);
      }
    };
    fetchPropertyTypes();

    if (isEditMode) {
      const fetchProperty = async () => {
        try {
          const res = await fetch(`${API}/properties/${propertyId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to fetch property details');
          const data = await res.json();
          setFormData({
            property_code: data.property_code || '',
            property_name: data.property_name || '',
            property_type: data.property_type || 'Apartment',
            building_name: data.building_name || '',
            community: data.community || '',
            emirate: data.emirate || 'Dubai',
            address_line_1: data.address_line_1 || '',
            address_line_2: data.address_line_2 || '',
            total_units: data.total_units?.toString() || '',
            total_area_sqft: data.total_area_sqft?.toString() || '',
            status: data.status || 'Active'
          });
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [isEditMode, propertyId, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_code || !formData.property_name) {
      setError('Property Code and Name are required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        total_units: formData.total_units ? parseInt(formData.total_units) : null,
        total_area_sqft: formData.total_area_sqft ? parseFloat(formData.total_area_sqft) : null
      };

      const url = isEditMode ? `${API}/properties/${propertyId}` : `${API}/properties`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Failed to ${isEditMode ? 'update' : 'create'} property`);
      }
      
      const savedProp = await res.json();
      navigate(`/properties/${savedProp.property_id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
          <DomainAddIcon />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>{isEditMode ? 'Edit Property' : 'Create New Property'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Basic Details</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="property_code" label="Property Code *" value={formData.property_code} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="property_name" label="Property Name *" value={formData.property_name} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                options={propertyTypes.map((pt) => pt.type_name)}
                value={formData.property_type}
                onChange={(_, newValue) => setFormData({ ...formData, property_type: newValue || '' })}
                onInputChange={(_, newInputValue) => setFormData({ ...formData, property_type: newInputValue })}
                renderInput={(params) => <TextField {...params} label="Property Type" fullWidth />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="status" label="Status" value={formData.status} onChange={handleChange} fullWidth select>
                {['Active', 'Inactive', 'Under Construction'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Location & Size</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="building_name" label="Building Name" value={formData.building_name} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="emirate" label="Emirate" value={formData.emirate} onChange={handleChange} fullWidth select>
                {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="community" label="Community" value={formData.community} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="address_line_1" label="Address" value={formData.address_line_1} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                name="total_units" 
                label="Total Units (Optional)" 
                type="number" 
                value={formData.total_units} 
                onChange={handleChange} 
                fullWidth 
                disabled={isEditMode}
                helperText={isEditMode ? "Auto-calculated when adding/removing units" : ""}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                name="total_area_sqft" 
                label="Total Area (SqFt) (Optional)" 
                type="number" 
                value={formData.total_area_sqft} 
                onChange={handleChange} 
                fullWidth 
                disabled={isEditMode}
                helperText={isEditMode ? "Auto-calculated when adding/removing units" : ""}
              />
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
                {saving ? <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} /> : (isEditMode ? 'Update Property' : 'Create Property')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PropertyEntry;
