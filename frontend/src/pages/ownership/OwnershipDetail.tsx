import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Property {
  property_id: string;
  property_name: string;
  property_code: string;
}

interface Owner {
  owner_id: string;
  full_name: string;
  owner_type: string;
}

interface BeneficiaryAllocation {
  allocation_id: string;
  allocation_percentage: number;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  iban: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_current: boolean;
  beneficiary: Owner;
}

interface OwnershipRecord {
  ownership_id: string;
  property_id: string;
  ownership_type: string;
  ownership_percentage: number;
  effective_from: string | null;
  effective_to: string | null;
  is_current: boolean;
  owner: Owner;
  beneficiary_allocations: BeneficiaryAllocation[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const OwnershipDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [records, setRecords] = useState<OwnershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [propRes, recordsRes] = await Promise.all([
        fetch(`${API}/properties/${id}`, { headers: authHeaders }),
        fetch(`${API}/ownership/records?property_id=${id}`, { headers: authHeaders })
      ]);

      if (!propRes.ok) throw new Error('Failed to load property details');
      if (!recordsRes.ok) throw new Error('Failed to load ownership records');

      setProperty(await propRes.json());
      setRecords(await recordsRes.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!property) return <Alert severity="warning">Property not found</Alert>;

  const currentRecords = records.filter(r => r.is_current);
  const totalOwnership = currentRecords.reduce((sum, r) => sum + Number(r.ownership_percentage), 0);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/ownership')} sx={{ mb: 2, color: 'text.secondary' }}>
        Back to Ownership List
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>{property.property_name}</Typography>
          <Typography variant="body1" color="text.secondary">Code: {property.property_code}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary">Total Configured Ownership</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: totalOwnership === 100 ? '#10b981' : '#f59e0b' }}>
            {totalOwnership}%
          </Typography>
          {totalOwnership !== 100 && (
            <Typography variant="caption" color="error">Must equal 100%</Typography>
          )}
        </Box>
      </Box>

      {currentRecords.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography color="text.secondary">No active ownership records found for this property.</Typography>
          <Button variant="outlined" sx={{ mt: 2, borderColor: '#10b981', color: '#10b981' }}>Add Co-Owner</Button>
        </Paper>
      ) : (
        currentRecords.map(record => (
          <Paper key={record.ownership_id} sx={{ mb: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  {record.owner.full_name} <Chip size="small" label={record.ownership_type} sx={{ ml: 1, bgcolor: '#6366f120', color: '#6366f1' }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">Effective: {record.effective_from || 'N/A'}</Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 700 }}>{Number(record.ownership_percentage)}%</Typography>
            </Box>

            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                Beneficiary Allocations
              </Typography>

              {record.beneficiary_allocations.length === 0 ? (
                <Alert severity="info" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>No beneficiaries assigned. Income defaults to owner.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary' } }}>
                        <TableCell>Beneficiary Name</TableCell>
                        <TableCell>Share (%)</TableCell>
                        <TableCell>Bank Details</TableCell>
                        <TableCell>IBAN</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {record.beneficiary_allocations.map(alloc => (
                        <TableRow key={alloc.allocation_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' } }}>
                          <TableCell sx={{ color: 'white' }}>{alloc.beneficiary.full_name}</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>{Number(alloc.allocation_percentage)}%</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccountBalanceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="body2" sx={{ color: 'white' }}>{alloc.bank_name || 'N/A'}</Typography>
                                <Typography variant="caption" color="text.secondary">{alloc.bank_account_number || 'No Account #'}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{alloc.iban || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
};

export default OwnershipDetail;
