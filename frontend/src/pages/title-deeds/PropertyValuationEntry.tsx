import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PropertyValuationEntry: React.FC = () => {
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    market_value: '',
    valuation_date: new Date().toISOString().split('T')[0],
    valuation_source: 'Internal',
    valuation_method: 'Comparable Sales',
    valuer_name: '',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.market_value || !formData.valuation_date) {
      setError('Market Value and Valuation Date are required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        market_value: parseFloat(formData.market_value)
      };

      const res = await fetch(`${API}/title-deeds/${titleDeedId}/valuations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add valuation');
      }
      
      navigate(`/title-deeds/${titleDeedId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
          <AssessmentIcon />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Add Property Valuation</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>
        Valuation records are permanent and append-only. They cannot be edited or deleted once saved.
      </Alert>

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Valuation Details</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="market_value" label="Estimated Market Value (AED) *" type="number" value={formData.market_value} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DatePicker
                label="Valuation Date *"
                format="DD/MM/YYYY"
                value={formData.valuation_date ? dayjs(formData.valuation_date) : null}
                onChange={(newValue) => setFormData({ ...formData, valuation_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="valuation_source" label="Source" value={formData.valuation_source} onChange={handleChange} fullWidth select>
                {['Internal', 'RERA', 'DLD', 'Certified Valuer'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="valuation_method" label="Method" value={formData.valuation_method} onChange={handleChange} fullWidth select>
                {['Comparable Sales', 'Income Approach', 'Cost Approach', 'Automated Valuation Model'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="valuer_name" label="Valuer Name (if external)" value={formData.valuer_name} onChange={handleChange} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField name="notes" label="Notes" value={formData.notes} onChange={handleChange} fullWidth multiline rows={2} />
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(`/title-deeds/${titleDeedId}`)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
                {saving ? <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} /> : 'Record Valuation'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default PropertyValuationEntry;
