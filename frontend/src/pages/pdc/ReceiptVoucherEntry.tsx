import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Grid, MenuItem,
  Alert, IconButton, Divider, Stack, Autocomplete, Tooltip
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const tfSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1,
    color: 'white',
    bgcolor: 'rgba(255,255,255,0.05)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.7)' }
};

interface LeaseOption {
  lease_id: string;
  lease_number: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  current_version: any;
}

const ReceiptVoucherEntry: React.FC = () => {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [selectedLease, setSelectedLease] = useState<LeaseOption | null>(null);

  const [formData, setFormData] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    payment_purpose: 'New Tenancy',
    currency: 'AED',
    total_amount: 0,
    remarks: '',
  });

  const [lines, setLines] = useState([{
    instrument_type: 'PDC',
    amount: 0,
    cheque_number: '',
    bank_name: '',
    instrument_date: ''
  }]);

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeases = async () => {
      try {
        const response = await api.get('/leases/');
        const leaseOptions = response.data.map((lease: any) => {
          const currentVersion = lease.versions?.find((v: any) => v.is_current_version) || lease.versions?.[lease.versions.length - 1];
          return {
            ...lease,
            current_version: currentVersion
          };
        });
        setLeases(leaseOptions);
      } catch (error) {
        console.error('Failed to fetch leases', error);
      }
    };
    fetchLeases();
  }, []);

  const handleLeaseSelection = (event: any, newValue: LeaseOption | null) => {
    setSelectedLease(newValue);
    if (newValue && newValue.current_version) {
      setFormData({
        ...formData,
        currency: newValue.current_version.currency || 'AED',
        total_amount: Number(newValue.current_version.annual_rent || 0),
      });
    } else {
      setFormData({
        ...formData,
        total_amount: 0
      });
    }
  };

  const handleLoadFromContract = () => {
    if (!selectedLease || !selectedLease.current_version?.payment_schedules) {
      setError("No payment schedule found on the selected tenancy contract.");
      return;
    }
    
    const schedules = selectedLease.current_version.payment_schedules;
    if (schedules.length === 0) {
      setError("The selected contract has no scheduled installments.");
      return;
    }

    const newLines = schedules.map((schedule: any) => ({
      instrument_type: 'PDC',
      amount: Number(schedule.amount),
      cheque_number: '',
      bank_name: '',
      instrument_date: schedule.due_date,
      rental_period_from: schedule.period_from,
      rental_period_to: schedule.period_to,
      receivable_id: schedule.schedule_id,
    }));
    
    setLines(newLines);
    setError('');
    
    const sum = newLines.reduce((acc: number, line: any) => acc + line.amount, 0);
    setFormData({ ...formData, total_amount: sum });
  };

  const addLine = () => {
    setLines([...lines, {
      instrument_type: 'PDC',
      amount: 0,
      cheque_number: '',
      bank_name: '',
      instrument_date: ''
    }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedLease || !selectedLease.current_version) {
      setError("Please select a valid Tenancy Contract.");
      return;
    }

    const calculatedTotal = lines.reduce((sum, line) => sum + Number(line.amount), 0);
    if (Math.abs(calculatedTotal - Number(formData.total_amount)) > 0.01) {
      setError(`Receipt total (${formData.total_amount}) does not match sum of lines (${calculatedTotal})`);
      return;
    }

    try {
      const payload = {
        ...formData,
        lease_id: selectedLease.lease_id,
        lease_version_id: selectedLease.current_version.version_id,
        payment_lines: lines.map(line => ({
          ...line,
          amount: Number(line.amount)
        }))
      };
      
      const response = await api.post('/rental-receipts/', payload);
      navigate(`/pdc/receipts/${response.data.receipt_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create receipt');
    }
  };

  return (
    <Box sx={{ p: 3, width: '100%', mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} color="white" gutterBottom>
        Create Receipt Voucher
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" color="white" mb={3}>1. Tenancy Contract & Header Details</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={leases}
                ListboxProps={{ sx: { maxHeight: '500px', '& li': { py: 2, px: 2 } } }}
                getOptionLabel={(option) => 
                  `Lease ${option.lease_number} — ${option.tenant_name} (${option.property_name} - Unit ${option.unit_number || 'N/A'})`
                }
                value={selectedLease}
                onChange={handleLeaseSelection}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Tenancy Contract" 
                    required 
                    multiline
                    rows={4}
                    sx={{
                      ...tfSx,
                      '& .MuiOutlinedInput-root': {
                        ...tfSx['& .MuiOutlinedInput-root'],
                        minHeight: '120px', // Very large box area
                        fontSize: '1.25rem', 
                        alignItems: 'flex-start',
                        padding: '16px'
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '1.2rem', // Larger label
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1.25rem', 
                        lineHeight: 1.5
                      }
                    }}
                    placeholder="Search by tenant, property, or lease number..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Lease {option.lease_number}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {option.tenant_name} | {option.property_name} | Unit {option.unit_number || 'N/A'}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {selectedLease && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tenant</Typography>
                      <Typography variant="body2" color="white" fontWeight={600}>{selectedLease.tenant_name}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Property & Unit</Typography>
                      <Typography variant="body2" color="white" fontWeight={600}>{selectedLease.property_name} - {selectedLease.unit_number || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Contract Period</Typography>
                      <Typography variant="body2" color="white" fontWeight={600}>
                        {selectedLease.current_version?.contract_start_date} to {selectedLease.current_version?.contract_end_date}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Annual Rent</Typography>
                      <Typography variant="body2" color="white" fontWeight={600}>
                        {Number(selectedLease.current_version?.annual_rent || 0).toLocaleString()} {selectedLease.current_version?.currency || 'AED'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Receipt Date"
                format="DD/MM/YYYY"
                value={formData.receipt_date ? dayjs(formData.receipt_date) : null}
                onChange={(newValue) => setFormData({ ...formData, receipt_date: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    sx: tfSx
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Payment Purpose"
                select
                required
                sx={tfSx}
                value={formData.payment_purpose}
                onChange={e => setFormData({...formData, payment_purpose: e.target.value})}
              >
                <MenuItem value="New Tenancy">New Tenancy</MenuItem>
                <MenuItem value="Renewal">Renewal</MenuItem>
                <MenuItem value="Partial Rent">Partial Rent</MenuItem>
                <MenuItem value="Security Deposit">Security Deposit</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Total Amount"
                type="number"
                required
                sx={tfSx}
                value={formData.total_amount}
                onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" color="white">2. Payment Instruments</Typography>
            <Stack direction="row" spacing={2}>
              <Tooltip title="Auto-populate cheques using the approved payment schedule from the Tenancy Contract">
                <Button 
                  variant="outlined" 
                  color="success" 
                  startIcon={<LibraryAddIcon />}
                  onClick={handleLoadFromContract}
                  disabled={!selectedLease}
                >
                  Load from Contract Schedule
                </Button>
              </Tooltip>
              <Button 
                variant="outlined" 
                startIcon={<AddCircleOutlinedIcon />}
                onClick={addLine}
              >
                Add Row Manually
              </Button>
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {lines.map((line, idx) => (
              <Box key={idx} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      select
                      label="Type"
                      size="small"
                      sx={tfSx}
                      value={line.instrument_type}
                      onChange={e => updateLine(idx, 'instrument_type', e.target.value)}
                    >
                      <MenuItem value="PDC">PDC</MenuItem>
                      <MenuItem value="Current-Dated Cheque">Current-Dated Cheque</MenuItem>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      required
                      size="small"
                      sx={tfSx}
                      value={line.amount}
                      onChange={e => updateLine(idx, 'amount', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Cheque/Ref No"
                      size="small"
                      sx={tfSx}
                      value={line.cheque_number}
                      onChange={e => updateLine(idx, 'cheque_number', e.target.value)}
                      required={line.instrument_type.includes('Cheque') || line.instrument_type === 'PDC'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      size="small"
                      sx={tfSx}
                      value={line.bank_name}
                      onChange={e => updateLine(idx, 'bank_name', e.target.value)}
                      required={line.instrument_type.includes('Cheque') || line.instrument_type === 'PDC'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <DatePicker
                      label="Date"
                      format="DD/MM/YYYY"
                      value={line.instrument_date ? dayjs(line.instrument_date) : null}
                      onChange={(newValue) => updateLine(idx, 'instrument_date', newValue ? newValue.format('YYYY-MM-DD') : '')}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          required: line.instrument_type.includes('Cheque') || line.instrument_type === 'PDC',
                          sx: tfSx
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1} textAlign="center">
                    {lines.length > 1 && (
                      <IconButton color="error" onClick={() => removeLine(idx)}>
                        <DeleteOutlinedIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Stack>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary" mr={2}>Total Allocated:</Typography>
            <Typography variant="h5" color={lines.reduce((s, l) => s + Number(l.amount), 0) === formData.total_amount ? "success.main" : "error.main"} fontWeight={700}>
              {lines.reduce((s, l) => s + Number(l.amount), 0).toLocaleString()} {formData.currency}
            </Typography>
          </Box>
        </Paper>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate('/pdc/receipts')} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Save Receipt
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default ReceiptVoucherEntry;
