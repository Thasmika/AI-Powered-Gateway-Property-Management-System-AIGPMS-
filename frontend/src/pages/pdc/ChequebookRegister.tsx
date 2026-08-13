import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const ChequebookRegister: React.FC = () => {
  const { token } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bank_account_id: '',
    cheque_book_number: '',
    series_from: '',
    series_to: '',
    received_date: new Date().toISOString().split('T')[0],
  });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, bookRes] = await Promise.all([
        fetch(`${API}/pdc-issued/bank-accounts`, { headers: authHeaders }),
        fetch(`${API}/pdc-issued/cheque-books`, { headers: authHeaders })
      ]);
      
      if (!accRes.ok || !bookRes.ok) throw new Error('Failed to load data');
      
      setAccounts(await accRes.json());
      setBooks(await bookRes.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pdc-issued/cheque-books`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to register cheque book');
      setOpen(false);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#3b82f620', color: '#3b82f6', width: 48, height: 48 }}>
            <LibraryBooksIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Cheque Books</Typography>
            <Typography variant="body2" color="text.secondary">Register and manage company cheque books</Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpen(true)}
          sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Register Book
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' } }}>
                <TableCell>Bank Account</TableCell>
                <TableCell>Book Number</TableCell>
                <TableCell>Series Range</TableCell>
                <TableCell>Received Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
              ) : books.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>No cheque books found.</TableCell></TableRow>
              ) : (
                books.map((book) => {
                  const account = accounts.find(a => a.account_id === book.bank_account_id);
                  return (
                    <TableRow key={book.cheque_book_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' } }}>
                      <TableCell><Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{account?.bank_name} - {account?.account_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: 'white' }}>{book.cheque_book_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{book.series_from} - {book.series_to}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{book.received_date}</Typography></TableCell>
                      <TableCell>
                        <Chip label={book.status} size="small" sx={{ bgcolor: book.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.1)', color: book.status === 'Active' ? '#10b981' : 'white', fontSize: '0.7rem' }} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Register Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { background: '#1e1e1e', color: 'white', minWidth: 500 } }}>
        <DialogTitle>Register Cheque Book</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
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
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Book Number" 
                value={formData.cheque_book_number}
                onChange={(e) => setFormData({ ...formData, cheque_book_number: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker 
                label="Received Date" 
                format="DD/MM/YYYY"
                value={formData.received_date ? dayjs(formData.received_date) : null}
                onChange={(newValue) => setFormData({ ...formData, received_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: { '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Series From" 
                value={formData.series_from}
                onChange={(e) => setFormData({ ...formData, series_from: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth label="Series To" 
                value={formData.series_to}
                onChange={(e) => setFormData({ ...formData, series_to: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="contained" sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            {saving ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChequebookRegister;
