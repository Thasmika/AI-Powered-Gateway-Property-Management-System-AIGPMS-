import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Avatar,
  Chip, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Tooltip, LinearProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarningIcon from '@mui/icons-material/Warning';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TenantDetailData {
  tenant_id: string;
  tenant_type: string;
  full_name: string;
  trade_name: string | null;
  id_number: string | null;
  id_type: string | null;
  id_expiry: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  employer: string | null;
  emergency_contact: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface TenantDocument {
  document_id: string;
  tenant_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  upload_date: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  'Emirates ID',
  'Passport',
  'Trade License',
  'Visa',
  'NOC Letter',
  'Tenancy Contract',
  'Bank Statement',
  'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns null | 'warn' | 'expired' based on expiry date */
function expiryStatus(expiryDate: string | null): null | 'warn' | 'expired' {
  if (!expiryDate) return null;
  const now = new Date();
  const exp = new Date(expiryDate);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'warn';
  return null;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Strip leading slash and build full URL to the uploads folder */
function buildFileUrl(filePath: string): string {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');
  const clean = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${base}${clean}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tenant-tabpanel-${index}`}
      aria-labelledby={`tenant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const TenantDetail: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Documents state
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogDoc, setDeleteDialogDoc] = useState<TenantDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload form state
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ── Fetch tenant profile ──────────────────────────────────────────────────
  const fetchTenant = useCallback(async () => {
    try {
      const res = await api.get(`/tenants/${tenantId}`);
      setTenant(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // ── Fetch documents ───────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await api.get(`/tenants/${tenantId}/documents`);
      setDocuments(res.data);
    } catch {
      // silently swallow — list will just be empty
    } finally {
      setDocsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
    fetchDocuments();
  }, [fetchTenant, fetchDocuments]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);

  const resetUploadForm = () => {
    setDocType('');
    setDocName('');
    setDocExpiry('');
    setDocNotes('');
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleOpenUpload = () => {
    resetUploadForm();
    setUploadDialogOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!docType || !docName || !selectedFile) {
      setUploadError('Document type, name, and file are required.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      // Step 1 — upload the physical file
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await api.post('/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const filePath: string = uploadRes.data.url;

      // Step 2 — register the document record
      await api.post(`/tenants/${tenantId}/documents`, {
        document_type: docType,
        document_name: docName,
        file_path: filePath,
        expiry_date: docExpiry || null,
        notes: docNotes || null,
      });

      setUploadDialogOpen(false);
      resetUploadForm();
      fetchDocuments();
    } catch (e: any) {
      setUploadError(e.response?.data?.detail || e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialogDoc) return;
    try {
      await api.delete(`/tenants/${tenantId}/documents/${deleteDialogDoc.document_id}`);
      setDeleteDialogDoc(null);
      fetchDocuments();
    } catch {
      // keep dialog open on failure
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!tenant) return <Alert severity="warning" sx={{ m: 3 }}>Tenant not found.</Alert>;

  return (
    <Box>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/tenants-leases/tenants')}
            sx={{ color: 'text.secondary' }}
          >
            Back
          </Button>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>{tenant.full_name}</Typography>
            <Typography variant="body2" color="text.secondary">Tenant ID: {tenant.tenant_id}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/tenants-leases/tenants/${tenantId}/edit`)}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            Edit Tenant
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/tenants-leases/leases/new?tenantId=${tenantId}`)}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            New Lease
          </Button>
        </Box>
      </Box>

      {/* ── Tab Container ───────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
            <Tab label="Tenant Profile" id="tenant-tab-0" aria-controls="tenant-tabpanel-0" />
            <Tab label="Lease History"  id="tenant-tab-1" aria-controls="tenant-tabpanel-1" />
            <Tab label="PDC History"    id="tenant-tab-2" aria-controls="tenant-tabpanel-2" />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  Documents
                  {documents.length > 0 && (
                    <Chip
                      label={documents.length}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#6366f140', color: '#a5b4fc' }}
                    />
                  )}
                </Box>
              }
              id="tenant-tab-3"
              aria-controls="tenant-tabpanel-3"
            />
          </Tabs>
        </Box>

        {/* ── Tab 0: Tenant Profile ──────────────────────────────────────── */}
        <CustomTabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Basic Information</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Type</Typography><Typography color="white" fontWeight={500}>{tenant.tenant_type}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Status</Typography>
                    <Chip label={tenant.status} size="small" sx={{ mt: 0.5, bgcolor: tenant.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: tenant.status === 'Active' ? '#10b981' : '#64748b' }} />
                  </Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Trade Name</Typography><Typography color="white" fontWeight={500}>{tenant.trade_name || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Nationality</Typography><Typography color="white" fontWeight={500}>{tenant.nationality || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Contact Information</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Email</Typography><Typography color="white" fontWeight={500}>{tenant.email || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Phone</Typography><Typography color="white" fontWeight={500}>{tenant.phone || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">WhatsApp</Typography><Typography color="white" fontWeight={500}>{tenant.whatsapp || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography color="text.secondary" variant="body2">Address</Typography><Typography color="white" fontWeight={500}>{tenant.address || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1 }}>Identification &amp; Other</Typography>
              <Paper elevation={0} sx={{ p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Type</Typography><Typography color="white" fontWeight={500}>{tenant.id_type || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Number</Typography><Typography color="white" fontWeight={500}>{tenant.id_number || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">ID Expiry</Typography><Typography color="white" fontWeight={500}>{tenant.id_expiry ? new Date(tenant.id_expiry).toLocaleDateString() : '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">Employer</Typography><Typography color="white" fontWeight={500}>{tenant.employer || '—'}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary" variant="body2">Emergency Contact</Typography><Typography color="white" fontWeight={500}>{tenant.emergency_contact || '—'}</Typography></Grid>
                  <Grid item xs={12}><Typography color="text.secondary" variant="body2">Notes</Typography><Typography color="white" fontWeight={500}>{tenant.notes || '—'}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* ── Tab 1: Lease History ───────────────────────────────────────── */}
        <CustomTabPanel value={tabValue} index={1}>
          <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            <ReceiptIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography>Lease history will be displayed here.</Typography>
          </Box>
        </CustomTabPanel>

        {/* ── Tab 2: PDC History ─────────────────────────────────────────── */}
        <CustomTabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
            <Typography>PDC History will be implemented in Sprint 5.</Typography>
          </Box>
        </CustomTabPanel>

        {/* ── Tab 3: Documents ──────────────────────────────────────────── */}
        <CustomTabPanel value={tabValue} index={3}>
          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                Tenant Documents
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Emirates ID, Passport, Trade License, Visas, and other supporting files.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleOpenUpload}
              sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none' }}
            >
              Upload Document
            </Button>
          </Box>

          {docsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!docsLoading && documents.length === 0 && (
            <Box
              sx={{
                textAlign: 'center', py: 8, color: 'text.secondary',
                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2,
              }}
            >
              <DescriptionIcon sx={{ fontSize: 52, mb: 1.5, opacity: 0.35 }} />
              <Typography variant="body1" sx={{ mb: 0.5 }}>No documents uploaded yet.</Typography>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Upload Emirates ID, Passport, Trade License or any relevant files.
              </Typography>
            </Box>
          )}

          {documents.length > 0 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Document Name</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => {
                    const expStatus = expiryStatus(doc.expiry_date);
                    return (
                      <TableRow
                        key={doc.document_id}
                        hover
                        sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon sx={{ fontSize: 16, color: '#6366f1', opacity: 0.8 }} />
                            <Typography variant="body2" color="white">{doc.document_type}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="white">{doc.document_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{formatDate(doc.upload_date)}</Typography>
                        </TableCell>
                        <TableCell>
                          {doc.expiry_date ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {expStatus === 'expired' && (
                                <Chip
                                  icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Expired"
                                  size="small"
                                  sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.68rem', height: 20 }}
                                />
                              )}
                              {expStatus === 'warn' && (
                                <Chip
                                  icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Expiring Soon"
                                  size="small"
                                  sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: '0.68rem', height: 20 }}
                                />
                              )}
                              <Typography variant="body2" color={expStatus ? (expStatus === 'expired' ? '#f87171' : '#fbbf24') : 'text.secondary'}>
                                {formatDate(doc.expiry_date)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View / Download">
                              <IconButton
                                size="small"
                                onClick={() => window.open(buildFileUrl(doc.file_path), '_blank')}
                                sx={{ color: '#6366f1', '&:hover': { bgcolor: 'rgba(99,102,241,0.12)' } }}
                                aria-label={`view-${doc.document_id}`}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Document">
                              <IconButton
                                size="small"
                                onClick={() => setDeleteDialogDoc(doc)}
                                sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' } }}
                                aria-label={`delete-${doc.document_id}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CustomTabPanel>
      </Paper>

      {/* ── Upload Document Dialog ─────────────────────────────────────── */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CloudUploadIcon sx={{ color: '#6366f1' }} />
            Upload Tenant Document
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)', pt: 2 }}>
          <Grid container spacing={2}>
            {/* Document Type */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Document Type *"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                id="doc-type-select"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Document Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Document Name *"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. John Doe Passport"
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                id="doc-name-input"
              />
            </Grid>

            {/* Expiry Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date (optional)"
                type="date"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true, style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                id="doc-expiry-input"
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Notes (optional)"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                fullWidth
                size="small"
                placeholder="Any relevant notes"
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                id="doc-notes-input"
              />
            </Grid>

            {/* File Picker */}
            <Grid item xs={12}>
              <Box
                sx={{
                  border: '1px dashed rgba(99,102,241,0.4)',
                  borderRadius: 2,
                  p: 2.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#6366f1', bgcolor: 'rgba(99,102,241,0.05)' },
                }}
                onClick={() => document.getElementById('tenant-doc-file-input')?.click()}
              >
                <UploadFileIcon sx={{ fontSize: 36, color: '#6366f1', mb: 1 }} />
                {selectedFile ? (
                  <Box>
                    <Typography variant="body2" color="white" fontWeight={600}>{selectedFile.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="white">Click to select a file</Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF, JPG, PNG, DOCX, etc. supported
                    </Typography>
                  </Box>
                )}
                <input
                  type="file"
                  id="tenant-doc-file-input"
                  hidden
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </Box>
            </Grid>

            {uploadError && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>{uploadError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' }, textTransform: 'none', minWidth: 140 }}
            id="upload-doc-submit-btn"
          >
            {uploading ? 'Uploading…' : 'Upload Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!deleteDialogDoc}
        onClose={() => setDeleteDialogDoc(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 700 }}>Delete Document?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to remove{' '}
            <strong style={{ color: 'white' }}>{deleteDialogDoc?.document_name}</strong>
            {' '}from this tenant's profile? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogDoc(null)}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            sx={{ textTransform: 'none' }}
            id="confirm-delete-doc-btn"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantDetail;
