import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert,
  CircularProgress, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, IconButton
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../context/AuthContext';
import QuickEntityModal from "../../components/QuickEntityModal";
import type { QuickEntityModalProps } from "../../components/QuickEntityModal";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TitleDeedEntry: React.FC = () => {
  const navigate = useNavigate();
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const isEdit = !!titleDeedId;
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [legalOwners, setLegalOwners] = useState<any[]>([]);
  const [beneficialOwners, setBeneficialOwners] = useState<any[]>([]);
  const [masterBanks, setMasterBanks] = useState<any[]>([]);

  const [quickAction, setQuickAction] = useState<{ open: boolean; type: QuickEntityModalProps['type']; mode: 'add' }>({ open: false, type: 'legal_owner', mode: 'add' });

  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ unit_number: '', property_id: '' });

  const [formData, setFormData] = useState({
    unit_id: '',
    title_deed_number: '',
    municipality_property_number: '',
    ownership_percentage: '',
    loan_number: '',
    mortgage_bank: '',
    outstanding_loan: '',
    plot_number: '',
    issue_date: '',
    legal_owner_id: '',
    beneficial_owner_id: '',
    financier: '',
    unit_size: '',
    floor_number: '',
    unit_number: '',
    building_number: '',
    building_name: '',
    community: '',
    emirate: '',
    property_type: '',
    unit_size_measure: 'Sq.M',
    purchased_from: '',
    notes: ''
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
              issue_date: data.issue_date || '',
              legal_owner_id: data.legal_owner_id || '',
              beneficial_owner_id: data.beneficial_owner_id || '',
              financier: data.financier || '',
              unit_size: data.unit_size ? data.unit_size.toString() : '',
              floor_number: data.floor_number || '',
              unit_number: data.unit_number || '',
              building_number: data.building_number || '',
              building_name: data.building_name || '',
              community: data.community || '',
              emirate: data.emirate || '',
              property_type: data.property_type || '',
              unit_size_measure: data.unit_size_measure || 'Sq.M',
              purchased_from: data.purchased_from || '',
              notes: data.notes || '',
              purchase_price: data.acquisition_costs?.purchase_price || '',
              registration_fees: data.acquisition_costs?.registration_fees || '',
              broker_commission: data.acquisition_costs?.broker_commission || '',
              acquisition_id: data.acquisition_costs?.acquisition_id || null
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
    const fetchMetadata = async () => {
      try {
        const [pRes, oRes, boRes, bRes] = await Promise.all([
          fetch(`${API}/properties`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/ownership/legal-owners`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/ownership/beneficial-owners`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/master-data/banks`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (pRes.ok) {
          const props = await pRes.json();
          setProperties(props);
          const allUnits = props.flatMap((p: any) =>
            (p.units || []).map((u: any) => ({ ...u, property_name: p.property_name }))
          );
          setUnits(allUnits);
        }
        if (oRes.ok) setLegalOwners(await oRes.json());
        if (boRes.ok) setBeneficialOwners(await boRes.json());
        if (bRes.ok) setMasterBanks(await bRes.json());
      } catch (e) {
        console.error("Failed to load metadata", e);
      }
    };
    fetchMetadata();
  }, [token]);

  const handleQuickActionSuccess = (type: QuickEntityModalProps['type'], savedData: any) => {
    if (type === 'legal_owner') {
      setLegalOwners(prev => [...prev, savedData]);
      setFormData(prev => ({ ...prev, legal_owner_id: savedData.legal_owner_id }));
    } else if (type === 'beneficial_owner') {
      setBeneficialOwners(prev => [...prev, savedData]);
      setFormData(prev => ({ ...prev, beneficial_owner_id: savedData.beneficial_owner_id }));
    } else if (type === 'bank') {
      setMasterBanks(prev => [...prev, savedData]);
      setFormData(prev => ({ ...prev, mortgage_bank: savedData.bank_name }));
    }
  };

  const handleAddUnit = async () => {
    try {
      if (!newUnit.property_id || !newUnit.unit_number) {
        alert('Please fill property and unit number');
        return;
      }
      const payload = { unit_number: newUnit.unit_number };
      const res = await fetch(`${API}/properties/${newUnit.property_id}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const added = await res.json();
        setUnits([...units, added]);
        setFormData({ ...formData, unit_id: added.unit_id });
        setAddUnitOpen(false);
        setNewUnit({ unit_number: '', property_id: '' });
      } else {
        alert('Failed to add unit');
      }
    } catch (e) {
      console.error(e);
      alert('Error adding unit');
    }
  };



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
        ownership_status: "Active",
        legal_owner_id: formData.legal_owner_id || null,
        beneficial_owner_id: formData.beneficial_owner_id || null,
        financier: formData.financier || null,
        unit_size: formData.unit_size ? parseFloat(formData.unit_size) : null,
        floor_number: formData.floor_number || null,
        unit_number: formData.unit_number || null,
        building_number: formData.building_number || null,
        building_name: formData.building_name || null,
        community: formData.community || null,
        emirate: formData.emirate || null,
        property_type: formData.property_type || null,
        unit_size_measure: formData.unit_size_measure || 'Sq.M',
        purchased_from: formData.purchased_from || null,
        notes: formData.notes || null
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
      
      const savedTitleDeed = await res.json();
      
      // Handle Acquisition Costs
      if (formData.purchase_price || formData.registration_fees || formData.broker_commission) {
        const acqPayload = {
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
          registration_fees: formData.registration_fees ? parseFloat(formData.registration_fees) : 0,
          broker_commission: formData.broker_commission ? parseFloat(formData.broker_commission) : 0,
        };
        const acqMethod = (formData as any).acquisition_id ? 'PUT' : 'POST';
        const acqUrl = `${API}/title-deeds/${savedTitleDeed.title_deed_id}/acquisition-cost`;
        
        const acqRes = await fetch(acqUrl, {
          method: acqMethod,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(acqPayload)
        });
        if (!acqRes.ok) {
          console.error("Failed to save acquisition costs");
        }
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
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                fullWidth
                options={[{ unit_id: 'ADD_NEW', unit_number: '+ Add New Unit', property_name: '' }, ...units]}
                getOptionLabel={(option: any) =>
                  option.unit_id === 'ADD_NEW'
                    ? '+ Add New Unit'
                    : `${option.unit_number}${option.property_name ? ` — ${option.property_name}` : ''}`
                }
                value={units.find((u: any) => u.unit_id === formData.unit_id) || null}
                onChange={(_: any, newVal: any) => {
                  if (!newVal) {
                    setFormData(prev => ({ ...prev, unit_id: '' }));
                  } else if (newVal.unit_id === 'ADD_NEW') {
                    setAddUnitOpen(true);
                  } else {
                    setFormData(prev => ({ ...prev, unit_id: newVal.unit_id }));
                  }
                }}
                filterOptions={(options, state) => {
                  const addNew = options.find((o: any) => o.unit_id === 'ADD_NEW');
                  const filtered = options.filter((o: any) =>
                    o.unit_id === 'ADD_NEW' ||
                    `${o.unit_number} ${o.property_name || ''}`.toLowerCase().includes(state.inputValue.toLowerCase())
                  );
                  return filtered.length > 0 ? filtered : addNew ? [addNew] : [];
                }}
                renderOption={(props, option: any) => (
                  <li {...props} key={option.unit_id}>
                    {option.unit_id === 'ADD_NEW' ? (
                      <Box sx={{ color: 'primary.main', fontWeight: 'bold' }}>+ Add New Unit</Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{option.unit_number}</Typography>
                        {option.property_name && (
                          <Typography variant="caption" color="text.secondary">{option.property_name}</Typography>
                        )}
                      </Box>
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Property Unit *"
                    required
                    InputLabelProps={{ sx: { color: 'text.secondary' } }}
                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' }, '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' } }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <DatePicker
                label="Issue Date"
                format="DD/MM/YYYY"
                value={formData.issue_date ? dayjs(formData.issue_date) : null}
                onChange={(newValue) => setFormData({ ...formData, issue_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputLabelProps: { sx: { color: 'text.secondary' } },
                    sx: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' }, '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' } }
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  fullWidth
                  label="Legal Owner"
                  name="legal_owner_id"
                  value={formData.legal_owner_id}
                  onChange={handleChange}
                  InputLabelProps={{ sx: { color: 'text.secondary' } }}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {legalOwners.map((lo) => (
                    <MenuItem key={lo.legal_owner_id} value={lo.legal_owner_id}>
                      {lo.full_name}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton 
                  onClick={() => setQuickAction({ open: true, type: 'legal_owner', mode: 'add' })}
                  sx={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  fullWidth
                  label="Beneficial Owner"
                  name="beneficial_owner_id"
                  value={formData.beneficial_owner_id}
                  onChange={handleChange}
                  InputLabelProps={{ sx: { color: 'text.secondary' } }}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {beneficialOwners.map((bo) => (
                    <MenuItem key={bo.beneficial_owner_id} value={bo.beneficial_owner_id}>
                      {bo.full_name}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton 
                  onClick={() => setQuickAction({ open: true, type: 'beneficial_owner', mode: 'add' })}
                  sx={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Financier"
                name="financier"
                value={formData.financier}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Property Type"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Purchased From (Seller)"
                name="purchased_from"
                value={formData.purchased_from}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Unit Size"
                name="unit_size"
                type="number"
                inputProps={{ step: "0.01" }}
                value={formData.unit_size}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label="Unit"
                name="unit_size_measure"
                value={formData.unit_size_measure}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              >
                <MenuItem value="Sq.M">Sq.M</MenuItem>
                <MenuItem value="Sq.Ft">Sq.Ft</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Floor No."
                name="floor_number"
                value={formData.floor_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Unit No."
                name="unit_number"
                value={formData.unit_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Building No."
                name="building_number"
                value={formData.building_number}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Building Name"
                name="building_name"
                value={formData.building_name}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Community"
                name="community"
                value={formData.community}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                freeSolo
                options={["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Umm Al-Quwain", "Ras Al Khaimah", "Fujairah"]}
                value={formData.emirate}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, emirate: newValue || '' });
                }}
                onInputChange={(event, newInputValue) => {
                  setFormData({ ...formData, emirate: newInputValue || '' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Emirate"
                    InputLabelProps={{ sx: { color: 'text.secondary' } }}
                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white', '& .MuiSvgIcon-root': { color: 'white' } } }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notes & Conditions"
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ color: 'white', mt: 2, mb: 1 }}>Title Deed Document</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
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

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ color: 'white', mt: 2, mb: 1 }}>Acquisition Costs</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Purchase Price"
                name="purchase_price"
                type="number"
                inputProps={{ step: "0.01" }}
                value={(formData as any).purchase_price || ''}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Registration Fees"
                name="registration_fees"
                type="number"
                inputProps={{ step: "0.01" }}
                value={(formData as any).registration_fees || ''}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Broker Commission"
                name="broker_commission"
                type="number"
                inputProps={{ step: "0.01" }}
                value={(formData as any).broker_commission || ''}
                onChange={handleChange}
                InputLabelProps={{ sx: { color: 'text.secondary' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ color: 'white', mt: 2, mb: 1 }}>Mortgage Details</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  fullWidth
                  label="Mortgage Bank"
                  name="mortgage_bank"
                  value={formData.mortgage_bank}
                  onChange={handleChange}
                  InputLabelProps={{ sx: { color: 'text.secondary' } }}
                  sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'white' } }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {masterBanks.map(bank => (
                    <MenuItem key={bank.bank_id} value={bank.bank_name}>{bank.bank_name}</MenuItem>
                  ))}
                </TextField>
                <IconButton 
                  onClick={() => setQuickAction({ open: true, type: 'bank', mode: 'add' })}
                  sx={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
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

            <Grid size={{ xs: 12 }} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
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

      {/* Dialog for Add Property Unit */}
      <Dialog open={addUnitOpen} onClose={() => setAddUnitOpen(false)}>
        <DialogTitle>Add New Property Unit</DialogTitle>
        <DialogContent>
          <TextField
            select
            margin="dense"
            label="Property"
            fullWidth
            value={newUnit.property_id}
            onChange={(e) => setNewUnit({ ...newUnit, property_id: e.target.value })}
          >
            <MenuItem value=""><em>Select Property</em></MenuItem>
            {properties.map(p => (
              <MenuItem key={p.property_id} value={p.property_id}>{p.property_name}</MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Unit Number"
            type="text"
            fullWidth
            value={newUnit.unit_number}
            onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUnitOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUnit} variant="contained" disabled={!newUnit.property_id || !newUnit.unit_number}>Add</Button>
        </DialogActions>
      </Dialog>
      
      <QuickEntityModal
        open={quickAction.open}
        type={quickAction.type}
        mode={quickAction.mode}
        onClose={() => setQuickAction(prev => ({ ...prev, open: false }))}
        onSuccess={handleQuickActionSuccess}
      />
    </Box>
  );
};

export default TitleDeedEntry;
