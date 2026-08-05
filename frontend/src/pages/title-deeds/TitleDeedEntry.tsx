import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert,
  CircularProgress, MenuItem
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TitleDeedEntry: React.FC = () => {
  const navigate = useNavigate();
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const isEdit = !!titleDeedId;
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    unit_id: '',
    title_deed_number: '',
    municipality_property_number: '',
    ownership_percentage: '',
    loan_number: '',
    mortgage_bank: '',
    outstanding_loan: '',
    plot_number: '',
    issue_date: ''
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEdit && titleDeedId) {
      const fetchTitleDeed = async () => {
        try {
          const res = await fetch(`${API}/title-deeds/${titleDeedId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setFormData({
              unit_id: data.unit_id || '',
              title_deed_number: data.title_deed_number || '',
              municipality_property_number: data.municipality_property_number || '',
              ownership_percentage: data.ownership_percentage ? data.ownership_percentage.toString() : '',
              loan_number: data.loan_number || '',
              mortgage_bank: data.mortgage_bank || '',
              outstanding_loan: data.outstanding_loan ? data.outstanding_loan.toString() : '',
              plot_number: data.plot_number || '',
              issue_date: data.issue_date || ''
            });
          }
        } catch (e) {
          console.error("Failed to fetch title deed", e);
        }
      };
      fetchTitleDeed();
    }
  }, [titleDeedId, isEdit, token]);

  useEffect(() => {
    // Fetch units to populate the dropdown
    const fetchUnits = async () => {
      try {
        // We'll fetch properties first, then in a real app fetch units, 
        // but for simplicity let's just fetch properties and assume 1 unit per property for this form,
        // OR we can fetch all units if an endpoint exists. Let's fetch properties.
        const res = await fetch(`${API}/properties`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const props = await res.json();
          // Extract units from properties
          const allUnits = props.flatMap((p: any) => p.units || []);
          setUnits(allUnits);
        }
      } catch (e) {
        console.error("Failed to load units", e);
      }
    };
    fetchUnits();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit_id) {
      setError("Please select a unit");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let attachment_path = null;
      if (file) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const uploadRes = await fetch(`${API}/upload/file`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachment_path = uploadData.url;
        } else {
          console.error("File upload failed");
        }
      }

      const payload: any = {
        title_deed_number: formData.title_deed_number || null,
        municipality_property_number: formData.municipality_property_number || null,
        ownership_percentage: formData.ownership_percentage ? parseFloat(formData.ownership_percentage) : null,
        loan_number: formData.loan_number || null,
        mortgage_bank: formData.mortgage_bank || null,
        outstanding_loan: formData.outstanding_loan ? parseFloat(formData.outstanding_loan) : null,
        plot_number: formData.plot_number || null,
        issue_date: formData.issue_date || null,
        ownership_status: "Active"
      };

      if (attachment_path) {
        payload.attachment_path = attachment_path;
      }

      const url = isEdit ? `${API}/title-deeds/${titleDeedId}` : `${API}/title-deeds?unit_id=${formData.unit_id}`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `Failed to ${isEdit ? 'update' : 'create'} title deed`);
      }
      navigate('/title-deeds');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/title-deeds')} sx={{ mb: 2, color: 'text.secondary' }}>
        Back to Title Deeds
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 3 }}>
        {isEdit ? 'Edit Title Deed' : 'Register Title Deed'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper className="glass-panel" sx={{ p: 4, borderRadius: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Property Unit"
                name="unit_id"
                value={formData.unit_id}
                onChange={handleChange}
                required
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              >
                {units.map((u) => (
                  <MenuItem key={u.unit_id} value={u.unit_id}>
                    {u.unit_number} (Property ID: {u.property_id.substring(0,8)}...)
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title Deed Number"
                name="title_deed_number"
                value={formData.title_deed_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Municipality Number"
                name="municipality_property_number"
                value={formData.municipality_property_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plot Number"
                name="plot_number"
                value={formData.plot_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Issue Date"
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true, sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ownership Percentage"
                name="ownership_percentage"
                type="number"
                inputProps={{ step: "0.01" }}
                value={formData.ownership_percentage}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: 'white', mt: 2, mb: 1 }}>Title Deed Document</Typography>
            </Grid>
            <Grid item xs={12}>
              {!file ? (
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                >
                  Upload Document
                  <input
                    type="file"
                    hidden
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                  />
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', px: 2, py: 1, borderRadius: 1 }}>
                    {file.name}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const url = URL.createObjectURL(file);
                      window.open(url, '_blank');
                    }}
                  >
                    View File
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                  >
                    Replace
                    <input
                      type="file"
                      hidden
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => setFile(null)}
                  >
                    Clear
                  </Button>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: 'white', mt: 2, mb: 1 }}>Mortgage Details</Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Loan Number"
                name="loan_number"
                value={formData.loan_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mortgage Bank"
                name="mortgage_bank"
                value={formData.mortgage_bank}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Outstanding Loan"
                name="outstanding_loan"
                type="number"
                inputProps={{ step: "0.01" }}
                value={formData.outstanding_loan}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading}
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
              >
                {loading ? 'Saving...' : (isEdit ? 'Update Title Deed' : 'Register Title Deed')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default TitleDeedEntry;
