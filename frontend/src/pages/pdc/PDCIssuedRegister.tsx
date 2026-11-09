import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem
} from '@mui/material';
import OutboxIcon from '@mui/icons-material/Outbox';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import PdfExportButton from '../../components/PdfExportButton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const PDCIssuedRegister: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPdc, setSelectedPdc] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);

  const handleEditOpen = (pdc: any) => {
    setSelectedPdc(pdc);
    setEditForm(pdc);
    setEditDialogOpen(true);
  };

  const handleDeleteOpen = (pdc: any) => {
    setSelectedPdc(pdc);
    setDeleteDialogOpen(true);
  };

  const handleEditSave = async () => {
    setActionLoading(true);
    try {
      await api.put(`/pdc-issued/${selectedPdc.pdc_issued_id}`, editForm);
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update PDC', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/pdc-issued/${selectedPdc.pdc_issued_id}`);
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete PDC', error);
    } finally {
      setActionLoading(false);
    }
  };

  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    payee_name: '',
    payee_type: 'Supplier',
    bank_account_id: '',
    cheque_number: '',
    cheque_date: new Date().toISOString().split('T')[0],
    cheque_amount: '',
    purpose: '',
    related_property_id: 'dummy_for_now' // We need at least one link according to validation
  });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, pdcRes] = await Promise.all([
        api.get('/pdc-issued/bank-accounts'),
        api.get('/pdc-issued')
      ]);
      
      setAccounts(accRes.data);
      setPdcs(pdcRes.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/pdc-issued', {
        ...formData,
        cheque_amount: parseFloat(formData.cheque_amount) || 0
      });
      
      setOpen(false);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to create PDC');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Approved': return 'primary';
      case 'Issued': return 'info';
      case 'Cleared': return 'success';
      case 'Returned': return 'error';
      case 'Due Soon': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#ec489920', color: '#ec4899', width: 48, height: 48 }}>
            <OutboxIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>PDC Issued Register</Typography>
            <Typography variant="body2" color="text.secondary">Manage outgoing cheques and approvals</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <PdfExportButton title="PDC Issued Register" />
          <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpen(true)}
          sx={{ bgcolor: '#ec4899', '&:hover': { bgcolor: '#db2777' } }}
        >
          Issue PDC
        </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Reference</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Cheque Date</TableCell>
                <TableCell>Amount (AED)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
              ) : pdcs.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>No issued PDCs found.</TableCell></TableRow>
              ) : (
                pdcs.map((pdc) => (
                  <TableRow key={pdc.pdc_issued_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' } }}>
                    <TableCell><Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{pdc.pdc_issue_reference}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'white' }}>{pdc.payee_name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{pdc.payee_type}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: 'white' }}>{formatDate(pdc.cheque_date)}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{Number(pdc.cheque_amount).toLocaleString()}</Typography></TableCell>
                    <TableCell>
                      <Chip label={pdc.status} color={getStatusColor(pdc.status) as any} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      
                      <Tooltip title="Edit PDC">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOpen(pdc);
                          }}
                          sx={{ color: '#f59e0b', '&:hover': { background: 'rgba(245,158,11,0.15)' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete PDC">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOpen(pdc);
                          }}
                          sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.15)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
<Tooltip title="View Detail">
                        <IconButton size="small" onClick={() => navigate(`/pdc-issued/${pdc.pdc_issued_id}`)} sx={{ color: '#ec4899' }}>
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

      {/* Issue PDC Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { background: '#1e1e1e', color: 'white', minWidth: 600 } }}>
        <DialogTitle>Issue New PDC</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Payee Name" 
                value={formData.payee_name}
                onChange={(e) => setFormData({ ...formData, payee_name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                select fullWidth label="Payee Type" 
                value={formData.payee_type}
                onChange={(e) => setFormData({ ...formData, payee_type: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              >
                <MenuItem value="Supplier">Supplier</MenuItem>
                <MenuItem value="Contractor">Contractor</MenuItem>
                <MenuItem value="Bank">Bank</MenuItem>
                <MenuItem value="Loan Provider">Loan Provider</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField 
                select fullWidth label="Bank Account" 
                value={formData.bank_account_id}
                onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              >
                {accounts.map(acc => (
                  <MenuItem key={acc.account_id} value={acc.account_id}>{acc.bank_name} - {acc.account_number}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth label="Cheque Number" 
                value={formData.cheque_number}
                onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker 
                label="Cheque Date" 
                format="DD/MM/YYYY"
                value={formData.cheque_date ? dayjs(formData.cheque_date) : null}
                onChange={(newValue) => setFormData({ ...formData, cheque_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: { '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth type="number" label="Amount (AED)" 
                value={formData.cheque_amount}
                onChange={(e) => setFormData({ ...formData, cheque_amount: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth label="Purpose" 
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="contained" sx={{ bgcolor: '#ec4899', '&:hover': { bgcolor: '#db2777' } }}>
            {saving ? <CircularProgress size={24} /> : 'Save Draft'}
          </Button>
        </DialogActions>
      </Dialog>
    
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} PaperProps={{ sx: { background: '#1e1e1e', color: 'white', minWidth: 400 } }}>
        <DialogTitle>Edit PDC</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Cheque Number" margin="normal"
            value={editForm.cheque_number || ''}
            onChange={(e) => setEditForm({ ...editForm, cheque_number: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
          />
          <TextField
            fullWidth label="Amount" margin="normal" type="number"
            value={editForm.cheque_amount || ''}
            onChange={(e) => setEditForm({ ...editForm, cheque_amount: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={actionLoading}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { background: '#1e1e1e', color: 'white' } }}>
        <DialogTitle>Delete PDC</DialogTitle>
        <DialogContent>
          <Typography sx={{mt:2}}>Are you sure you want to delete PDC {selectedPdc?.cheque_number}? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={actionLoading}>Delete</Button>
        </DialogActions>
      </Dialog>
</Box>
  );
};

export default PDCIssuedRegister;
