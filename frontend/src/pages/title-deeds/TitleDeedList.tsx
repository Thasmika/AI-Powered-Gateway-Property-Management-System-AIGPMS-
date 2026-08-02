import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TitleDeed {
  title_deed_id: string;
  property_id: string;
  title_deed_number: string | null;
  ownership_status: string;
  legal_owner: string | null;
  loan_number: string | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const TitleDeedList: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [titleDeeds, setTitleDeeds] = useState<TitleDeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchTitleDeeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/title-deeds`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load title deeds');
      setTitleDeeds(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { fetchTitleDeeds(); }, [fetchTitleDeeds]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#6366f120', color: '#6366f1', width: 48, height: 48 }}>
            <ArticleIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Title Deeds</Typography>
            <Typography variant="body2" color="text.secondary">{titleDeeds.length} title deeds registered</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/title-deeds/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Register Title Deed
          </Button>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Deed Number</TableCell>
                <TableCell>Legal Owner</TableCell>
                <TableCell>Loan Status</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : titleDeeds.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No title deeds found.</TableCell></TableRow>
              ) : (
                titleDeeds.map((td) => (
                  <TableRow key={td.title_deed_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{td.title_deed_number || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{td.legal_owner || '—'}</Typography></TableCell>
                    <TableCell>
                      {td.loan_number ? (
                        <Chip label={`Mortgaged (${td.loan_number})`} size="small" sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.7rem' }} />
                      ) : (
                        <Chip label="Clear" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.7rem' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={td.ownership_status} size="small"
                        sx={{ bgcolor: td.ownership_status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.1)', color: td.ownership_status === 'Active' ? '#10b981' : 'white', fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => navigate(`/title-deeds/${td.title_deed_id}`)} sx={{ color: '#6366f1' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default TitleDeedList;
