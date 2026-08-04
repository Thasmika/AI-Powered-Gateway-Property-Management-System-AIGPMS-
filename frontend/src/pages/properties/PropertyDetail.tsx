import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Divider, Button, Avatar, CircularProgress, Alert, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Autocomplete
} from '@mui/material';
import DomainIcon from '@mui/icons-material/Domain';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import QuickEntityModal from '../../components/QuickEntityModal';
import type { QuickEntityModalProps } from '../../components/QuickEntityModal';
import ImageUpload from '../../components/ImageUpload';
import PhotoGallery from '../../components/PhotoGallery';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PropertyUnit {
  unit_id: string;
  unit_number: string;
  unit_type: string | null;
  area_sqft: number | null;
  status: string;
  floor_number?: string | null;
  balcony?: string | null;
  unit_description?: string | null;
  photo_1?: string | null;
  photo_2?: string | null;
  photo_3?: string | null;
  photo_4?: string | null;
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
  main_photo?: string | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8000';

const PropertyDetail: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [legalOwners, setLegalOwners] = useState<any[]>([]);
  const [beneficialOwners, setBeneficialOwners] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [viewUnitOpen, setViewUnitOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null);
  const [unitData, setUnitData] = useState({
    unit_id: '',
    unit_number: '',
    unit_type: 'Apartment',
    floor_number: '',
    balcony: 'Without Balcony',
    area_sqft: '',
    status: 'Vacant',
    unit_description: '',
    legal_owner_id: '',
    beneficial_owner_id: '',
    bank_id: '',
    tenant_id: '',
    photo_1: '',
    photo_2: '',
    photo_3: '',
    photo_4: ''
  });
  const [unitSaving, setUnitSaving] = useState(false);

  const [quickAction, setQuickAction] = useState<{
    open: boolean;
    type: QuickEntityModalProps['type'];
    mode: 'add' | 'edit';
    data?: any;
  }>({ open: false, type: 'legal_owner', mode: 'add' });

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/properties/${propertyId}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load property details');
      setProperty(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [propertyId, authHeaders]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const handlePropertyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch(`${API}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image');
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url;

      const updateRes = await fetch(`${API}/properties/${propertyId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ main_photo: imageUrl })
      });
      if (!updateRes.ok) throw new Error('Failed to update property photo');
      
      fetchProperty();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchDropdowns = useCallback(async () => {
    try {
      const [legalRes, benRes, bankRes, tenantRes] = await Promise.all([
        fetch(`${API}/ownership/legal-owners`, { headers: authHeaders }),
        fetch(`${API}/ownership/beneficial-owners`, { headers: authHeaders }),
        fetch(`${API}/master/banks`, { headers: authHeaders }),
        fetch(`${API}/tenants`, { headers: authHeaders })
      ]);
      
      if (legalRes.ok) setLegalOwners(await legalRes.json());
      if (benRes.ok) setBeneficialOwners(await benRes.json());
      if (bankRes.ok) setBanks(await bankRes.json());
      if (tenantRes.ok) setTenants(await tenantRes.json());
    } catch (err) {
      console.error("Failed to fetch dropdowns", err);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (unitModalOpen) fetchDropdowns();
  }, [unitModalOpen, fetchDropdowns]);

  const handleQuickActionSuccess = (type: QuickEntityModalProps['type'], savedData: any) => {
    fetchDropdowns();
    setQuickAction(prev => ({ ...prev, open: false }));
    // Auto-select the newly created or edited entity
    const idField = type === 'legal_owner' ? 'legal_owner_id' :
                   type === 'beneficial_owner' ? 'beneficial_owner_id' :
                   type === 'bank' ? 'bank_id' : 'tenant_id';
    setUnitData(prev => ({ ...prev, [idField]: savedData[idField] }));
  };

  const handleDeleteEntity = async (type: QuickEntityModalProps['type'], id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.replace('_', ' ')}?`)) return;
    try {
      const endpoint = type === 'legal_owner' ? '/ownership/legal-owners' :
                       type === 'beneficial_owner' ? '/ownership/beneficial-owners' :
                       type === 'bank' ? '/master/banks' : '/tenants';
      const res = await fetch(`${API}${endpoint}/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to delete entity');
      }
      fetchDropdowns();
      // Clear selection if it was deleted
      const idField = type === 'legal_owner' ? 'legal_owner_id' :
                   type === 'beneficial_owner' ? 'beneficial_owner_id' :
                   type === 'bank' ? 'bank_id' : 'tenant_id';
      if (unitData[idField as keyof typeof unitData] === id) {
        setUnitData(prev => ({ ...prev, [idField]: '' }));
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveUnit = async () => {
    if (!unitData.unit_number) return;
    setUnitSaving(true);
    try {
      const payload = {
        unit_number: unitData.unit_number,
        unit_type: unitData.unit_type,
        floor_number: unitData.floor_number || null,
        balcony: unitData.balcony || null,
        area_sqft: unitData.area_sqft ? parseFloat(unitData.area_sqft) : null,
        status: unitData.status,
        unit_description: unitData.unit_description || null,
        photo_1: unitData.photo_1 || null,
        photo_2: unitData.photo_2 || null,
        photo_3: unitData.photo_3 || null,
        photo_4: unitData.photo_4 || null,
        ...(unitData.legal_owner_id && { legal_owner_id: unitData.legal_owner_id }),
        ...(unitData.beneficial_owner_id && { beneficial_owner_id: unitData.beneficial_owner_id }),
        ...(unitData.bank_id && { bank_id: unitData.bank_id }),
        ...(unitData.tenant_id && { tenant_id: unitData.tenant_id })
      };
      
      const isEdit = !!unitData.unit_id;
      const url = isEdit ? `${API}/properties/${propertyId}/units/${unitData.unit_id}` : `${API}/properties/${propertyId}/units`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'add'} unit`);
      setUnitModalOpen(false);
      setUnitData({ unit_id: '', unit_number: '', unit_type: 'Apartment', floor_number: '', balcony: 'Without Balcony', area_sqft: '', status: 'Vacant', unit_description: '', legal_owner_id: '', beneficial_owner_id: '', bank_id: '', tenant_id: '', photo_1: '', photo_2: '', photo_3: '', photo_4: '' });
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
        <input 
          type="file" 
          accept="image/png, image/jpeg" 
          hidden 
          ref={fileInputRef} 
          onChange={handlePropertyPhotoUpload} 
        />
        <Box 
          sx={{ position: 'relative', cursor: 'pointer', '&:hover .overlay': { opacity: 1 } }} 
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar 
            src={property.main_photo ? (property.main_photo.startsWith('http') ? property.main_photo : `${BASE_URL}${property.main_photo}`) : undefined}
            sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 160, height: 160 }}
          >
            {!property.main_photo && <DomainIcon sx={{ fontSize: 80 }} />}
          </Avatar>
          <Box 
            className="overlay"
            sx={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s', color: 'white'
            }}
          >
            {photoUploading ? <CircularProgress size={24} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
          </Box>
        </Box>
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
              <Button size="small" variant="outlined" onClick={() => {
                setUnitData({ unit_id: '', unit_number: '', unit_type: 'Apartment', floor_number: '', balcony: 'Without Balcony', area_sqft: '', status: 'Vacant', unit_description: '', legal_owner_id: '', beneficial_owner_id: '', bank_id: '', tenant_id: '', photo_1: '', photo_2: '', photo_3: '', photo_4: '' });
                setUnitModalOpen(true);
              }} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Add Unit</Button>
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
                        <IconButton size="small" onClick={() => { setSelectedUnit(unit); setViewUnitOpen(true); }} sx={{ color: 'text.secondary', '&:hover': { color: 'white' }, mr: 1 }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          setUnitData({
                            unit_id: unit.unit_id,
                            unit_number: unit.unit_number,
                            unit_type: unit.unit_type || 'Apartment',
                            floor_number: unit.floor_number || '',
                            balcony: unit.balcony || 'Without Balcony',
                            area_sqft: unit.area_sqft ? String(unit.area_sqft) : '',
                            status: unit.status,
                            unit_description: unit.unit_description || '',
                            legal_owner_id: unit.legal_owner_id || '',
                            beneficial_owner_id: unit.beneficial_owner_id || '',
                            bank_id: unit.bank_id || '',
                            tenant_id: unit.tenant_id || '',
                            photo_1: unit.photo_1 || '',
                            photo_2: unit.photo_2 || '',
                            photo_3: unit.photo_3 || '',
                            photo_4: unit.photo_4 || ''
                          });
                          setUnitModalOpen(true);
                        }} sx={{ color: 'text.secondary', '&:hover': { color: 'white' }, mr: 1 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
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
        <DialogTitle>{unitData.unit_id ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, minWidth: 400 }}>
          <TextField 
            label="Unit Number *" 
            value={unitData.unit_number} 
            onChange={(e) => setUnitData({...unitData, unit_number: e.target.value})}
            fullWidth
            sx={{ mt: 1 }}
          />
          <Autocomplete
            freeSolo
            options={['Apartment', 'Villa', 'Office', 'Retail', 'Warehouse', 'Room']}
            value={unitData.unit_type}
            onChange={(_, newValue) => setUnitData({...unitData, unit_type: newValue || ''})}
            onInputChange={(_, newInputValue) => setUnitData({...unitData, unit_type: newInputValue})}
            renderInput={(params) => (
              <TextField {...params} label="Type" fullWidth />
            )}
          />
          <TextField 
            label="Floor Number" 
            value={unitData.floor_number} 
            onChange={(e) => setUnitData({...unitData, floor_number: e.target.value})}
            fullWidth
          />
          <TextField 
            select 
            label="Balcony" 
            value={unitData.balcony} 
            onChange={(e) => setUnitData({...unitData, balcony: e.target.value})}
            fullWidth
          >
            {['With Balcony', 'Without Balcony'].map(opt => (
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
          <TextField
            label="Unit Description"
            value={unitData.unit_description}
            onChange={(e) => setUnitData({...unitData, unit_description: e.target.value})}
            fullWidth
            multiline
            rows={2}
          />

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Typography variant="subtitle2" color="text.secondary">Unit Photos</Typography>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((num) => (
              <Grid size={{ xs: 6, sm: 3 }} key={`photo_${num}`}>
                <ImageUpload
                  label={`Photo ${num}`}
                  value={(unitData as any)[`photo_${num}`]}
                  onChange={(url) => setUnitData({ ...unitData, [`photo_${num}`]: url })}
                />
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Typography variant="subtitle2" color="text.secondary">Optional Associations (Auto-creates records)</Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField 
              select 
              label="Legal Owner" 
              value={unitData.legal_owner_id} 
              onChange={(e) => setUnitData({...unitData, legal_owner_id: e.target.value})}
              fullWidth
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {legalOwners.map(owner => (
                <MenuItem key={owner.legal_owner_id} value={owner.legal_owner_id}>{owner.full_name}</MenuItem>
              ))}
            </TextField>
            <IconButton size="small" onClick={() => setQuickAction({ open: true, type: 'legal_owner', mode: 'add' })}>
              <AddIcon fontSize="small" />
            </IconButton>
            {unitData.legal_owner_id && (
              <>
                <IconButton size="small" onClick={() => {
                  const data = legalOwners.find(o => o.legal_owner_id === unitData.legal_owner_id);
                  setQuickAction({ open: true, type: 'legal_owner', mode: 'edit', data });
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteEntity('legal_owner', unitData.legal_owner_id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setUnitData({...unitData, legal_owner_id: ''})}><ClearIcon fontSize="small" /></IconButton>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField 
              select 
              label="Beneficial Owner" 
              value={unitData.beneficial_owner_id} 
              onChange={(e) => setUnitData({...unitData, beneficial_owner_id: e.target.value})}
              fullWidth
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {beneficialOwners.map(owner => (
                <MenuItem key={owner.beneficial_owner_id} value={owner.beneficial_owner_id}>{owner.full_name}</MenuItem>
              ))}
            </TextField>
            <IconButton size="small" onClick={() => setQuickAction({ open: true, type: 'beneficial_owner', mode: 'add' })}>
              <AddIcon fontSize="small" />
            </IconButton>
            {unitData.beneficial_owner_id && (
              <>
                <IconButton size="small" onClick={() => {
                  const data = beneficialOwners.find(o => o.beneficial_owner_id === unitData.beneficial_owner_id);
                  setQuickAction({ open: true, type: 'beneficial_owner', mode: 'edit', data });
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteEntity('beneficial_owner', unitData.beneficial_owner_id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setUnitData({...unitData, beneficial_owner_id: ''})}><ClearIcon fontSize="small" /></IconButton>
              </>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField 
              select 
              label="Bank Account" 
              value={unitData.bank_id} 
              onChange={(e) => setUnitData({...unitData, bank_id: e.target.value})}
              fullWidth
              disabled={!unitData.beneficial_owner_id}
              helperText={!unitData.beneficial_owner_id ? 'Select Beneficiary first' : ''}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {banks.map(bank => (
                <MenuItem key={bank.bank_id} value={bank.bank_id}>{bank.bank_name}</MenuItem>
              ))}
            </TextField>
            <IconButton size="small" onClick={() => setQuickAction({ open: true, type: 'bank', mode: 'add' })}>
              <AddIcon fontSize="small" />
            </IconButton>
            {unitData.bank_id && (
              <>
                <IconButton size="small" onClick={() => {
                  const data = banks.find(b => b.bank_id === unitData.bank_id);
                  setQuickAction({ open: true, type: 'bank', mode: 'edit', data });
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setUnitData({...unitData, bank_id: ''})}><ClearIcon fontSize="small" /></IconButton>
              </>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField 
              select 
              label="Tenant" 
              value={unitData.tenant_id} 
              onChange={(e) => setUnitData({...unitData, tenant_id: e.target.value})}
              fullWidth
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {tenants.map(tenant => (
                <MenuItem key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.first_name} {tenant.last_name}</MenuItem>
              ))}
            </TextField>
            <IconButton size="small" onClick={() => setQuickAction({ open: true, type: 'tenant', mode: 'add' })}>
              <AddIcon fontSize="small" />
            </IconButton>
            {unitData.tenant_id && (
              <>
                <IconButton size="small" onClick={() => {
                  const data = tenants.find(t => t.tenant_id === unitData.tenant_id);
                  setQuickAction({ open: true, type: 'tenant', mode: 'edit', data });
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteEntity('tenant', unitData.tenant_id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setUnitData({...unitData, tenant_id: ''})}><ClearIcon fontSize="small" /></IconButton>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
          <Button onClick={() => {
            setUnitModalOpen(false);
            setUnitData({ unit_id: '', unit_number: '', unit_type: 'Apartment', floor_number: '', balcony: 'Without Balcony', area_sqft: '', status: 'Vacant', unit_description: '', legal_owner_id: '', beneficial_owner_id: '', bank_id: '', tenant_id: '', photo_1: '', photo_2: '', photo_3: '', photo_4: '' });
          }} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveUnit} 
            disabled={!unitData.unit_number || unitSaving}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {unitSaving ? <CircularProgress size={24} color="inherit" /> : 'Save Unit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewUnitOpen} onClose={() => setViewUnitOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1e1e2d', color: 'white', borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Unit Details - {selectedUnit?.unit_number}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Type</Typography>
              <Typography variant="body2">{selectedUnit?.unit_type || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="body2">{selectedUnit?.status || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Floor</Typography>
              <Typography variant="body2">{selectedUnit?.floor_number || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Balcony</Typography>
              <Typography variant="body2">{selectedUnit?.balcony || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Area (SqFt)</Typography>
              <Typography variant="body2">{selectedUnit?.area_sqft || '—'}</Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Description</Typography>
            <Typography variant="body2">{selectedUnit?.unit_description || '—'}</Typography>
          </Box>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Grid container spacing={2}>
             {[selectedUnit?.photo_1, selectedUnit?.photo_2, selectedUnit?.photo_3, selectedUnit?.photo_4].map((photo, i) => {
                const imageUrl = photo ? (photo.startsWith('http') ? photo : `${BASE_URL}${photo}`) : null;
                return (
                  <Grid size={{ xs: 6, sm: 3 }} key={i}>
                    <Box sx={{ height: 100, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                       {imageUrl ? <img src={imageUrl} alt={`Photo ${i+1}`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : `Photo ${i+1}`}
                    </Box>
                  </Grid>
                );
             })}
          </Grid>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
            <Button variant="outlined" size="small" onClick={() => navigate('/tenants-leases')} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Tenancy History</Button>
            <Button variant="outlined" size="small" onClick={() => setGalleryOpen(true)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Photo Gallery</Button>
            <Button variant="outlined" size="small" onClick={() => navigate('/maintenance')} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Maintenance History</Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setViewUnitOpen(false)} sx={{ color: 'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <QuickEntityModal
        open={quickAction.open}
        type={quickAction.type}
        mode={quickAction.mode}
        initialData={quickAction.data}
        onClose={() => setQuickAction(prev => ({ ...prev, open: false }))}
        onSuccess={handleQuickActionSuccess}
      />

      {selectedUnit && (
        <PhotoGallery
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          unitNumber={selectedUnit.unit_number}
          photos={[selectedUnit.photo_1, selectedUnit.photo_2, selectedUnit.photo_3, selectedUnit.photo_4].map(p => p ? (p.startsWith('http') ? p : `${BASE_URL}${p}`) : '').filter(Boolean)}
        />
      )}
    </Box>
  );
};

export default PropertyDetail;
