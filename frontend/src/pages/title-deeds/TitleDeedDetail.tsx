import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Divider, Button, Avatar, CircularProgress, Alert, Chip
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFileUrl } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

interface PropertyAcquisitionCost {
  acquisition_id: string;
  purchase_price: number | null;
  registration_fees: number | null;
  broker_commission: number | null;
  other_acquisition_costs: number | null;
  total_acquisition_cost: number | null;
  purchase_date: string | null;
  seller_name: string | null;
}

interface TitleDeedDetail {
  title_deed_id: string;
  title_deed_number: string | null;
  legal_owner: string | null;
  beneficial_owner: string | null;
  financier: string | null;
  ownership_percentage: number | null;
  ownership_status: string;
  loan_number: string | null;
  mortgage_bank: string | null;
  outstanding_loan: number | null;
  loan_to_value_ratio: number | null;
  loan_to_value_ratio: number | null;
  acquisition_costs: PropertyAcquisitionCost | null;
  attachment_path?: string | null;
  municipality_property_number?: string | null;
  plot_number?: string | null;
  issue_date?: string | null;
  property_type?: string | null;
  unit_size?: number | null;
  unit_size_measure?: string | null;
  floor_number?: string | null;
  unit_number?: string | null;
  building_number?: string | null;
  building_name?: string | null;
  community?: string | null;
  emirate?: string | null;
  purchased_from?: string | null;
  notes?: string | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TitleDeedDetail: React.FC = () => {
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [titleDeed, setTitleDeed] = useState<TitleDeedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchTitleDeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/title-deeds/${titleDeedId}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load title deed details');
      setTitleDeed(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [titleDeedId, authHeaders]);

  useEffect(() => { fetchTitleDeed(); }, [fetchTitleDeed]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${API}/upload/file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file');
      const uploadData = await uploadRes.json();

      const updateRes = await fetch(`${API}/title-deeds/${titleDeedId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ attachment_path: uploadData.url }),
      });

      if (!updateRes.ok) throw new Error('Failed to update title deed');
      
      await fetchTitleDeed();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error || !titleDeed) return <Alert severity="error">{error || 'Title Deed not found'}</Alert>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/title-deeds')} sx={{ mb: 2, color: 'text.secondary' }}>
        Back to Title Deeds
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 56, height: 56 }}>
          <ArticleIcon fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>Title Deed {titleDeed.title_deed_number || '—'}</Typography>
          <Typography variant="subtitle1" color="text.secondary">Legal Owner: {titleDeed.legal_owner || '—'}</Typography>
        </Box>
        <Chip label={titleDeed.ownership_status} sx={{ ml: 'auto', bgcolor: titleDeed.ownership_status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.1)', color: titleDeed.ownership_status === 'Active' ? '#10b981' : 'white' }} />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <PdfExportButton />
          <Button variant="outlined" component="label" disabled={isUploading} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
            {isUploading ? 'Uploading...' : 'Add File'}
            <input type="file" hidden onChange={handleFileUpload} />
          </Button>
          {titleDeed.attachment_path && (
            <Button variant="contained" onClick={() => window.open(getFileUrl(titleDeed.attachment_path), '_blank')}>
              Review File
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Ownership Details</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Beneficial Owner</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.beneficial_owner || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Financier</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.financier || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ownership %</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.ownership_percentage ? `${titleDeed.ownership_percentage}%` : '—'}</Typography>
              </Box>
            </Box>

            <Typography variant="h6" sx={{ color: 'white', mt: 4, mb: 2 }}>Mortgage / Loan Info</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Loan Number</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.loan_number || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Mortgage Bank</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.mortgage_bank || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Outstanding Loan</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.outstanding_loan ? `AED ${titleDeed.outstanding_loan.toLocaleString()}` : '—'}</Typography>
              </Box>
            </Box>
          </Paper>
          
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Title Deed Info</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Municipality Property No.</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.municipality_property_number || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Plot No.</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.plot_number || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Issue Date</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{formatDate(titleDeed.issue_date)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Purchased From (Seller)</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.purchased_from || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">Notes & Conditions</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.notes || '—'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>Acquisition Cost</Typography>
              {!titleDeed.acquisition_costs && (
                <Button size="small" variant="outlined" onClick={() => navigate(`/title-deeds/${titleDeedId}/acquisition-cost`)} sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Record Cost</Button>
              )}
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            
            {titleDeed.acquisition_costs ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Purchase Price</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.acquisition_costs.purchase_price ? `AED ${titleDeed.acquisition_costs.purchase_price.toLocaleString()}` : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Registration Fees</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.acquisition_costs.registration_fees ? `AED ${titleDeed.acquisition_costs.registration_fees.toLocaleString()}` : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Broker Commission</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.acquisition_costs.broker_commission ? `AED ${titleDeed.acquisition_costs.broker_commission.toLocaleString()}` : '—'}</Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Total Acquisition Cost</Typography>
                  <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {titleDeed.acquisition_costs.total_acquisition_cost ? `AED ${titleDeed.acquisition_costs.total_acquisition_cost.toLocaleString()}` : '—'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No acquisition costs recorded.</Typography>
            )}
          </Paper>
          
          <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Property Details</Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Property Type</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.property_type || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Unit Size</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.unit_size ? `${titleDeed.unit_size} ${titleDeed.unit_size_measure || 'Sq.M'}` : '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Floor No.</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.floor_number || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Unit No.</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.unit_number || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Building No.</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.building_number || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Building Name</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.building_name || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Community</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.community || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Emirate</Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>{titleDeed.emirate || '—'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TitleDeedDetail;
