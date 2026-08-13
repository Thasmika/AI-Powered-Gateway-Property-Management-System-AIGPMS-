import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const AcquisitionCostEntry: React.FC = () => {
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    purchase_currency: 'AED',
    seller_name: '',
    purchase_agreement_number: '',
    title_transfer_date: '',
    registration_fees: '0',
    broker_commission: '0',
    other_acquisition_costs: '0',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.purchase_price || !formData.purchase_date) {
      setError('Purchase Price and Purchase Date are required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        registration_fees: parseFloat(formData.registration_fees) || 0,
        broker_commission: parseFloat(formData.broker_commission) || 0,
        other_acquisition_costs: parseFloat(formData.other_acquisition_costs) || 0,
        title_transfer_date: formData.title_transfer_date || null
      };

      const res = await fetch(`${API}/title-deeds/${titleDeedId}/acquisition-cost`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add acquisition cost');
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
        <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981', width: 48, height: 48 }}>
          <RequestQuoteIcon />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Record Acquisition Cost</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 3 }}>
        Acquisition costs form the basis of the property's financial asset value. They cannot be easily altered once submitted.
      </Alert>

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Purchase Details</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="purchase_price" label="Purchase Price (AED) *" type="number" inputProps={{ step: "0.01" }} value={formData.purchase_price} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Purchase Date *"
                format="DD/MM/YYYY"
                value={formData.purchase_date ? dayjs(formData.purchase_date) : null}
                onChange={(newValue) => setFormData({ ...formData, purchase_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputLabelProps: { sx: { color: 'text.secondary' } },
                    sx: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' }, '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' } }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="seller_name" label="Seller Name" value={formData.seller_name} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField name="purchase_agreement_number" label="Agreement / Contract Number" value={formData.purchase_agreement_number} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Title Transfer Date"
                format="DD/MM/YYYY"
                value={formData.title_transfer_date ? dayjs(formData.title_transfer_date) : null}
                onChange={(newValue) => setFormData({ ...formData, title_transfer_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputLabelProps: { sx: { color: 'text.secondary' } },
                    sx: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' }, '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' } }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Additional Costs</Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="registration_fees" label="Registration Fees (AED)" type="number" inputProps={{ step: "0.01" }} value={formData.registration_fees} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="broker_commission" label="Broker Commission (AED)" type="number" inputProps={{ step: "0.01" }} value={formData.broker_commission} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField name="other_acquisition_costs" label="Other Costs (AED)" type="number" inputProps={{ step: "0.01" }} value={formData.other_acquisition_costs} onChange={handleChange} fullWidth sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField name="notes" label="Notes / Remarks" value={formData.notes} onChange={handleChange} fullWidth multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }} InputLabelProps={{ sx: { color: 'text.secondary' } }} />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(`/title-deeds/${titleDeedId}`)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                {saving ? <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} /> : 'Record Cost'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default AcquisitionCostEntry;
