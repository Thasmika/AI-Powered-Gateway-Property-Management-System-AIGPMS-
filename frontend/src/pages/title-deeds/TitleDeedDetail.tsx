import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Divider, Button, Avatar, CircularProgress, Alert, Chip
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
  acquisition_costs: PropertyAcquisitionCost | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TitleDeedDetail: React.FC = () => {
  const { titleDeedId } = useParams<{ titleDeedId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [titleDeed, setTitleDeed] = useState<TitleDeedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        </Grid>
      </Grid>
    </Box>
  );
};

export default TitleDeedDetail;
