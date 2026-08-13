import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Alert, CircularProgress, Divider, IconButton, Chip, Tooltip,
  Autocomplete
} from '@mui/material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Styling tokens ─────────────────────────────────────────────────────────
const labelCell = {
  bgcolor: '#1a1f36',
  color: 'rgba(255,255,255,0.75)',
  px: 2,
  py: 1.2,
  fontWeight: 600,
  fontSize: '0.82rem',
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  letterSpacing: '0.02em',
};
const inputCell = {
  bgcolor: '#0f3460',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  '& .MuiInputBase-root': { borderRadius: 0 },
};
const autoFillCell = {
  bgcolor: '#1a3a1a',
  color: '#86efac',
  px: 2,
  py: 1.2,
  fontSize: '0.85rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontStyle: 'italic',
  minHeight: 42,
};
const tfSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 0,
    '& fieldset': { border: 'none' },
    color: 'white',
    bgcolor: '#0f3460',
  },
  '& .MuiInputBase-input': { py: 1.2, px: 2 },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiInputLabel-root': { display: 'none' },
};
const depositTfSx = {
  ...tfSx,
  '& .MuiOutlinedInput-root': { ...tfSx['& .MuiOutlinedInput-root'], bgcolor: '#0e4d8a' },
};

const CHEQUE_OPTIONS = ['Single cheque', '2 cheques', '3 cheques', '4 cheques', '5 cheques', '6 cheques'];

const mapLabelToCheques = (label: string) => {
  if (!label || label === 'Single cheque') return 1;
  const match = label.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
};
const mapChequesToLabel = (num: number) => {
  if (!num || num === 1) return 'Single cheque';
  return `${num} cheques`;
};

interface DocRow {
  id: string;
  file: File | null;
  document_type: string;
  document_name: string;
  notes: string;
  expiry_date: string;
}

const DOC_TYPES = [
  'Tenancy Contract', 'EJARI Certificate', 'Tenant Emirates ID',
  'Tenant Passport', 'No Objection Certificate', 'Security Deposit Receipt',
  'Title Deed Copy', 'Other'
];

const newDocRow = (): DocRow => ({
  id: Math.random().toString(36).slice(2),
  file: null,
  document_type: 'Tenancy Contract',
  document_name: '',
  notes: '',
  expiry_date: '',
});

const LeaseEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leaseId } = useParams<{ leaseId: string }>();
  const isEditMode = Boolean(leaseId);
  const { token } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const tenantIdParam = queryParams.get('tenantId');

  const [formData, setFormData] = useState({
    lease_number: '',
    lease_date: '',
    legal_owner_id: '',
    tenant_id: tenantIdParam || '',
    unit_id: '',
    // Auto-filled
    legal_owner_name: '',
    tenant_name: '',
    property_usage: '',
    plot_no: '',
    building_name: '',
    unit_no: '',
    property_type: '',
    location: '',
    property_area_sqm: '',
    premises_no: '',
    // Contract terms
    contract_start_date: '',
    contract_end_date: '',
    contract_value: '',
    annual_rent: '',
    security_deposit: '',
    number_of_cheques: 'Single cheque',
    notes: '',
  });

  const [legalOwners, setLegalOwners] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([newDocRow()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTenantIds, setActiveTenantIds] = useState<Set<string>>(new Set());
  const fileRefs = useRef<{ [id: string]: HTMLInputElement | null }>({});

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ─── Fetch dropdowns ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ownersRes, tenantsRes, propsRes, leasesRes] = await Promise.all([
          api.get('/ownership/legal-owners'),
          api.get('/tenants'),
          api.get('/properties'),
          api.get('/leases')
        ]);
        setLegalOwners(ownersRes.data);
        setTenants(tenantsRes.data);
        const allUnits: any[] = [];
        propsRes.data.forEach((p: any) => {
          (p.units || []).forEach((u: any) => allUnits.push({ ...u, parent_property: p }));
        });
        setUnits(allUnits);
        
        const activeIds = new Set<string>();
        leasesRes.data.forEach((l: any) => {
          if (l.status === 'Active') activeIds.add(l.tenant_id);
        });
        setActiveTenantIds(activeIds);
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load dropdown data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ─── Load existing lease for edit ──────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && !loading && leaseId) {
      api.get(`/leases/${leaseId}`).then(res => {
        const data = res.data;
        const ver = data.versions?.find((v: any) => v.is_current_version) || data.versions?.[0] || {};
        setFormData(prev => ({
          ...prev,
          lease_number: data.lease_number || '',
          lease_date: data.lease_date || '',
          legal_owner_id: data.legal_owner_id || '',
          tenant_id: data.tenant_id || '',
          unit_id: data.unit_id || '',
          contract_start_date: ver.contract_start_date || '',
          contract_end_date: ver.contract_end_date || '',
          annual_rent: ver.annual_rent?.toString() || '',
          contract_value: ver.contract_value?.toString() || '',
          number_of_cheques: mapChequesToLabel(ver.number_of_cheques),
          security_deposit: ver.security_deposit?.toString() || '',
          premises_no: ver.premises_no || '',
          notes: ver.notes || '',
        }));
      }).catch(() => {});
    }
  }, [isEditMode, leaseId, loading]);

  // ─── Auto-fill: Legal Owner ─────────────────────────────────────────────────
  useEffect(() => {
    const owner = legalOwners.find(o => o.legal_owner_id === formData.legal_owner_id);
    setFormData(prev => ({ ...prev, legal_owner_name: owner?.full_name || '' }));
  }, [formData.legal_owner_id, legalOwners]);

  // ─── Auto-fill: Tenant ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = tenants.find(t => t.tenant_id === formData.tenant_id);
    setFormData(prev => ({ ...prev, tenant_name: t?.full_name || '' }));
  }, [formData.tenant_id, tenants]);

  // ─── Auto-fill: Unit / Property ────────────────────────────────────────────
  useEffect(() => {
    const unit = units.find(u => u.unit_id === formData.unit_id);
    if (unit) {
      const p = unit.parent_property;
      setFormData(prev => ({
        ...prev,
        property_usage: p?.property_type || '',
        plot_no: unit.plot_number || p?.plot_number || '',
        building_name: p?.building_name || p?.property_name || '',
        unit_no: unit.unit_number || '',
        property_type: p?.property_type || '',
        location: [p?.community, p?.emirate].filter(Boolean).join(', '),
        property_area_sqm: unit.area_sqm ? unit.area_sqm.toString() : '',
        premises_no: unit.makani_number || p?.municipality_property_number || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev, property_usage: '', plot_no: '', building_name: '',
        unit_no: '', property_type: '', location: '', property_area_sqm: '', premises_no: '',
      }));
    }
  }, [formData.unit_id, units]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ─── Document helpers ───────────────────────────────────────────────────────
  const addDocRow = () => setDocuments(prev => [...prev, newDocRow()]);
  const removeDocRow = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));
  const updateDoc = (id: string, field: keyof DocRow, value: any) =>
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      updateDoc(id, 'file', file);
      updateDoc(id, 'document_name', file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // ─── Upload a document file ────────────────────────────────────────────────
  const uploadDocFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: fd,
    });
    if (!res.ok) throw new Error('File upload failed');
    const data = await res.json();
    return data.file_path || data.path || data.url || '';
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lease_number || !formData.unit_id || !formData.tenant_id) {
      setError('Please fill in all mandatory fields: Tenancy Ref.No, Tenant, and Property Unit.');
      return;
    }
    if (!formData.contract_start_date || !formData.contract_end_date) {
      setError('Please fill in the Contract Period (From Date and To Date).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const unit = units.find(u => u.unit_id === formData.unit_id);
      const property_id = unit?.property_id || '';

      // Upload documents
      const uploadedDocs: any[] = [];
      for (const doc of documents) {
        if (doc.file) {
          const path = await uploadDocFile(doc.file);
          uploadedDocs.push({
            document_type: doc.document_type,
            document_name: doc.document_name || doc.file.name,
            file_path: path,
            expiry_date: doc.expiry_date || null,
            notes: doc.notes || null,
          });
        }
      }

      const payload: any = {
        lease_number: formData.lease_number,
        lease_date: formData.lease_date || null,
        legal_owner_id: formData.legal_owner_id || null,
        property_id,
        unit_id: formData.unit_id,
        tenant_id: formData.tenant_id,
        lease_type: 'Residential',
        status: 'Active',
        initial_version: {
          contract_start_date: formData.contract_start_date,
          contract_end_date: formData.contract_end_date,
          contract_value: formData.contract_value ? parseFloat(formData.contract_value) : 0,
          annual_rent: formData.annual_rent ? parseFloat(formData.annual_rent) : 0,
          currency: 'AED',
          payment_frequency: 'Monthly',
          number_of_cheques: mapLabelToCheques(formData.number_of_cheques),
          security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : 0,
          premises_no: formData.premises_no,
          notes: formData.notes,
        },
        ...(uploadedDocs.length > 0 && { documents: uploadedDocs }),
      };

      if (isEditMode) {
        const res = await api.put(`/leases/${leaseId}`, payload);
        setSuccess(true);
        setTimeout(() => navigate(`/tenants-leases/leases/${res.data.lease_id}`), 1200);
      } else {
        const res = await api.post('/leases', payload);
        setSuccess(true);
        setTimeout(() => navigate(`/tenants-leases/leases/${res.data.lease_id}`), 1200);
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((err: any) => `${err.loc.join('.')} - ${err.msg}`).join(', '));
      } else {
        setError(detail || e.message || 'Failed to save contract');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: '#6366f1' }} />
    </Box>
  );

  const AutoFillValue = ({ value, placeholder }: { value: string; placeholder: string }) => (
    <Box sx={autoFillCell}>{value || <span style={{ opacity: 0.5, fontSize: '0.78rem' }}>{placeholder}</span>}</Box>
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/tenants-leases/leases')} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
            {isEditMode ? 'Edit Tenancy Contract' : 'Register Tenancy Contract'}
          </Typography>
          <Typography variant="caption" color="text.secondary">TENANCY CONTRACT – DATA ENTRY SCREEN</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Contract saved successfully! Redirecting…</Alert>}

      <form onSubmit={handleSubmit}>
        {/* ── SECTION 1: Contract Identity ─────────────────────────────── */}
        <Paper sx={{ mb: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#252b4b', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Contract Identity
            </Typography>
          </Box>
          <Grid container>
            {/* Tenancy Ref No */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Tenancy Ref.No *</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth name="lease_number" value={formData.lease_number} onChange={handleChange}
                placeholder="e.g. TC-2024-001" required sx={tfSx} size="small" />
            </Grid>

            {/* Tenancy Date */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Tenancy Date</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <DatePicker 
                format="DD/MM/YYYY"
                value={formData.lease_date ? dayjs(formData.lease_date) : null}
                onChange={(newValue) => setFormData({ ...formData, lease_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{ textField: { fullWidth: true, size: 'small', sx: tfSx } }}
              />
            </Grid>

            {/* Premises No */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Premises No</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth name="premises_no" value={formData.premises_no} onChange={handleChange}
                placeholder="e.g. 123456789" sx={tfSx} size="small" />
            </Grid>
          </Grid>
        </Paper>

        {/* ── SECTION 2: Parties ───────────────────────────────────────── */}
        <Paper sx={{ mb: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#252b4b', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Parties
            </Typography>
          </Box>
          <Grid container>
            {/* Legal Owner ID */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Legal Owner's ID</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <Autocomplete
                fullWidth
                options={legalOwners}
                getOptionLabel={(o: any) => `${o.legal_owner_id?.slice(0, 8)}… — ${o.full_name}`}
                value={legalOwners.find(o => o.legal_owner_id === formData.legal_owner_id) || null}
                onChange={(_, v) => setFormData(p => ({ ...p, legal_owner_id: v?.legal_owner_id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select from legal owners table" sx={tfSx} size="small" />
                )}
                sx={{ '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' } }}
              />
            </Grid>

            {/* Legal Owner Name - autofill */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Legal Owner's Name</Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <AutoFillValue value={formData.legal_owner_name} placeholder="Auto fill after select the legal owner" />
            </Grid>

            {/* Tenant ID */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Tenant's ID *</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <Autocomplete
                fullWidth
                options={tenants.filter(t => !activeTenantIds.has(t.tenant_id) || t.tenant_id === formData.tenant_id)}
                getOptionLabel={(o: any) => `${o.tenant_id?.slice(0, 8)}… — ${o.full_name}`}
                value={tenants.find(t => t.tenant_id === formData.tenant_id) || null}
                onChange={(_, v) => setFormData(p => ({ ...p, tenant_id: v?.tenant_id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select from Tenants table" required sx={tfSx} size="small" />
                )}
                sx={{ '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' } }}
              />
            </Grid>

            {/* Tenant Name - autofill */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Tenants Name</Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <AutoFillValue value={formData.tenant_name} placeholder="Auto fill after select the Tenant" />
            </Grid>
          </Grid>
        </Paper>

        {/* ── SECTION 3: Property Details ──────────────────────────────── */}
        <Paper sx={{ mb: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#252b4b', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Property Details
            </Typography>
          </Box>
          <Grid container>
            {/* Unit Ref No */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Unit Ref.No *</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <Autocomplete
                fullWidth
                options={units.filter(u => u.status === 'Vacant' || u.unit_id === formData.unit_id)}
                getOptionLabel={(u: any) => `${u.unit_number}${u.parent_property?.property_name ? ` — ${u.parent_property.property_name}` : ''}`}
                value={units.find(u => u.unit_id === formData.unit_id) || null}
                onChange={(_, v) => setFormData(p => ({ ...p, unit_id: v?.unit_id || '' }))}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select from the Unit Table" required sx={tfSx} size="small" />
                )}
                sx={{ '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' } }}
              />
            </Grid>

            {/* Auto-fill rows */}
            {[
              { label: 'Property Usage', value: formData.property_usage },
              { label: 'Plot No', value: formData.plot_no },
              { label: 'Building Name', value: formData.building_name },
              { label: 'Unit No', value: formData.unit_no },
              { label: 'Property Type', value: formData.property_type },
              { label: 'Location', value: formData.location },
              { label: 'Property Area SQM', value: formData.property_area_sqm },
            ].map(({ label, value }) => (
              <React.Fragment key={label}>
                <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>{label}</Grid>
                <Grid size={{ xs: 12, sm: 9 }}>
                  <AutoFillValue value={value} placeholder="Auto fill after select the Property Unit" />
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
        </Paper>

        {/* ── SECTION 4: Contract Terms ────────────────────────────────── */}
        <Paper sx={{ mb: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#252b4b', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Contract Terms
            </Typography>
          </Box>
          <Grid container>
            {/* Contract Period */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Contract Period</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Grid container>
                <Grid size={{ xs: 6, sm: 3 }} sx={{ ...labelCell, borderRight: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', justifyContent: 'center' }}>From Date</Grid>
                <Grid size={{ xs: 6, sm: 3 }} sx={inputCell}>
                  <DatePicker 
                    format="DD/MM/YYYY"
                    value={formData.contract_start_date ? dayjs(formData.contract_start_date) : null}
                    onChange={(newValue) => setFormData({ ...formData, contract_start_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                    slotProps={{ textField: { fullWidth: true, size: 'small', sx: tfSx } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }} sx={{ ...labelCell, borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', justifyContent: 'center' }}>To Date</Grid>
                <Grid size={{ xs: 6, sm: 3 }} sx={inputCell}>
                  <DatePicker 
                    format="DD/MM/YYYY"
                    value={formData.contract_end_date ? dayjs(formData.contract_end_date) : null}
                    onChange={(newValue) => setFormData({ ...formData, contract_end_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                    slotProps={{ textField: { fullWidth: true, size: 'small', sx: tfSx } }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Contract Value */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Contract Value (AED)</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth type="number" name="contract_value" value={formData.contract_value}
                onChange={handleChange} placeholder="0.00" sx={tfSx} size="small" />
            </Grid>

            {/* Annual Rent */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Annual Rent (AED)</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth type="number" name="annual_rent" value={formData.annual_rent}
                onChange={handleChange} placeholder="0.00" sx={tfSx} size="small" />
            </Grid>

            {/* Security Deposit */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Security Deposit Amount</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={{ ...inputCell, bgcolor: '#0e2a4d' }}>
              <TextField fullWidth type="number" name="security_deposit" value={formData.security_deposit}
                onChange={handleChange} placeholder="0.00" sx={depositTfSx} size="small" />
            </Grid>

            {/* Mode of Payment */}
            <Grid size={{ xs: 12, sm: 3 }} sx={labelCell}>Mode of Payment</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth select name="number_of_cheques" value={formData.number_of_cheques}
                onChange={handleChange} sx={tfSx} size="small">
                {CHEQUE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Additional Terms */}
            <Grid size={{ xs: 12, sm: 3 }} sx={{ ...labelCell, alignItems: 'flex-start', pt: 2 }}>Additional Terms</Grid>
            <Grid size={{ xs: 12, sm: 9 }} sx={inputCell}>
              <TextField fullWidth multiline rows={4} name="notes" value={formData.notes}
                onChange={handleChange} placeholder="Enter additional terms and conditions…"
                sx={{ ...tfSx, '& .MuiInputBase-input': { py: 1.5, px: 2 } }} size="small" />
            </Grid>
          </Grid>
        </Paper>

        {/* ── SECTION 5: Documents ─────────────────────────────────────── */}
        <Paper sx={{ mb: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#252b4b', px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon sx={{ color: '#818cf8', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                Documents for Tenancy Contract
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<AttachFileIcon />}
              onClick={addDocRow}
              sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', '&:hover': { bgcolor: 'rgba(99,102,241,0.25)' }, textTransform: 'none', fontSize: '0.78rem', borderRadius: 1.5 }}
            >
              Add Document
            </Button>
          </Box>

          <Box sx={{ p: 2 }}>
            {documents.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <UploadFileIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2" opacity={0.5}>No documents added yet. Click "Add Document" to attach files.</Typography>
              </Box>
            )}

            {documents.map((doc, idx) => (
              <Paper key={doc.id} sx={{ mb: 2, p: 2, bgcolor: '#1a1f36', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Chip label={`Document ${idx + 1}`} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600, fontSize: '0.7rem' }} />
                  <IconButton size="small" onClick={() => removeDocRow(doc.id)} sx={{ color: 'rgba(255,100,100,0.7)', '&:hover': { color: '#ef4444' } }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  {/* Document Type */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Document Type</Typography>
                    <TextField fullWidth select size="small" value={doc.document_type}
                      onChange={e => updateDoc(doc.id, 'document_type', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#0f1629', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, color: 'white' }, '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' } }}>
                      {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </TextField>
                  </Grid>

                  {/* Document Name */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Document Name</Typography>
                    <TextField fullWidth size="small" value={doc.document_name} placeholder="Enter document name"
                      onChange={e => updateDoc(doc.id, 'document_name', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#0f1629', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, color: 'white' } }} />
                  </Grid>

                  {/* Expiry Date */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Expiry Date (optional)</Typography>
                    <DatePicker 
                      format="DD/MM/YYYY"
                      value={doc.expiry_date ? dayjs(doc.expiry_date) : null}
                      onChange={(newValue) => updateDoc(doc.id, 'expiry_date', newValue ? newValue.format('YYYY-MM-DD') : '')}
                      slotProps={{ textField: { fullWidth: true, size: 'small', sx: { '& .MuiOutlinedInput-root': { bgcolor: '#0f1629', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, color: 'white' } } } }}
                    />
                  </Grid>

                  {/* File Upload */}
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Attach File</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <input
                        type="file"
                        ref={el => { fileRefs.current[doc.id] = el; }}
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={e => handleFileChange(doc.id, e)}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadFileIcon />}
                        onClick={() => fileRefs.current[doc.id]?.click()}
                        sx={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', '&:hover': { borderColor: '#818cf8', bgcolor: 'rgba(99,102,241,0.1)' }, textTransform: 'none', whiteSpace: 'nowrap' }}
                      >
                        Choose File
                      </Button>
                      {doc.file ? (
                        <Chip
                          label={doc.file.name}
                          size="small"
                          onDelete={() => updateDoc(doc.id, 'file', null)}
                          sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: '#86efac', maxWidth: 250, '& .MuiChip-deleteIcon': { color: '#86efac' } }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>No file selected (PDF, DOC, JPG, PNG)</Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Notes */}
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Notes</Typography>
                    <TextField fullWidth size="small" value={doc.notes} placeholder="Optional notes"
                      onChange={e => updateDoc(doc.id, 'notes', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#0f1629', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, color: 'white' } }} />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            {documents.length > 0 && (
              <Button
                variant="text"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={addDocRow}
                sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' }, textTransform: 'none', mt: 0.5 }}
              >
                + Add Another Document
              </Button>
            )}
          </Box>
        </Paper>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/tenants-leases/leases')}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'white', color: 'white' }, textTransform: 'none', px: 3 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', px: 4, fontWeight: 600 }}
          >
            {saving ? 'Saving…' : 'Save Contract'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default LeaseEntry;
