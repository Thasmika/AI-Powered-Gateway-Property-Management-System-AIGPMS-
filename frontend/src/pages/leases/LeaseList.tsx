import React, { useEffect, useState, useCallback } from 'react';
import { formatDate } from '../../utils/dateUtils';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert, IconButton, Tooltip,
  Stack, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';

import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';
import PdfExportButton from '../../components/PdfExportButton';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface Lease {
  lease_id: string;
  lease_number: string;
  tenant_id: string;
  property_id: string;
  unit_number?: string;
  lease_type: string;
  status: string;
  versions: any[];
}

const LeaseList: React.FC = () => {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [expirationFilter, setExpirationFilter] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<Lease | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leasesRes, tenantsRes, propsRes] = await Promise.all([
        api.get('/leases'),
        api.get('/tenants'),
        api.get('/properties')
      ]);
      
      setLeases(leasesRes.data);
      
      const tenantMap: Record<string, string> = {};
      tenantsRes.data.forEach((t: any) => {
        tenantMap[t.tenant_id] = t.full_name + (t.trade_name ? ` (${t.trade_name})` : '');
      });
      setTenants(tenantMap);

      const propMap: Record<string, string> = {};
      propsRes.data.forEach((p: any) => {
        propMap[p.property_id] = p.property_name;
      });
      setProperties(propMap);

    } catch (e: any) { 
      setError(e.response?.data?.detail || e.message || 'Failed to load data'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
      case 'Expired': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
      case 'Terminated': return { bg: 'rgba(100,116,139,0.15)', text: '#64748b' };
      default: return { bg: 'rgba(255,255,255,0.1)', text: 'white' };
    }
  };

  const handleDeleteClick = (lease: Lease) => {
    setLeaseToDelete(lease);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!leaseToDelete) return;
    try {
      await api.delete(`/leases/${leaseToDelete.lease_id}`);
      setLeases(leases.filter(l => l.lease_id !== leaseToDelete.lease_id));
      setDeleteDialogOpen(false);
      setLeaseToDelete(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to delete lease');
      setDeleteDialogOpen(false);
    }
  };

  // Compute effective status: if stored status is 'Active' but end date is in the past, treat as 'Expired'
  const getEffectiveStatus = (lease: Lease): string => {
    if (lease.status !== 'Active') return lease.status;
    const currentVersion = lease.versions?.find((v: any) => v.is_current_version) || (lease.versions?.length ? lease.versions[lease.versions.length - 1] : null);
    if (currentVersion?.contract_end_date) {
      const endDate = dayjs(currentVersion.contract_end_date).startOf('day');
      const today = dayjs().startOf('day');
      if (endDate.isBefore(today)) return 'Expired';
    }
    return lease.status;
  };

  // Filter leases
  const filteredLeases = leases.filter((lease) => {
    const matchesSearch = !search || 
      lease.lease_number?.toLowerCase().includes(search.toLowerCase()) ||
      (tenants[lease.tenant_id] || lease.tenant_id)?.toLowerCase().includes(search.toLowerCase()) ||
      (properties[lease.property_id] || lease.property_id)?.toLowerCase().includes(search.toLowerCase());

    const effectiveStatus = getEffectiveStatus(lease);
    const matchesStatus = !statusFilter || effectiveStatus === statusFilter;
    
    let matchesExpiration = true;
    if (expirationFilter) {
      const currentVersion = lease.versions?.find((v: any) => v.is_current_version) || (lease.versions?.length ? lease.versions[lease.versions.length - 1] : null);
      if (currentVersion && currentVersion.contract_end_date) {
        const endDate = dayjs(currentVersion.contract_end_date).startOf('day');
        const today = dayjs().startOf('day');
        const diffDays = endDate.diff(today, 'day');

        if (expirationFilter === 'expired') {
          matchesExpiration = diffDays < 0;
        } else if (expirationFilter === '30_days') {
          matchesExpiration = diffDays >= 0 && diffDays <= 30;
        } else if (expirationFilter === '60_days') {
          matchesExpiration = diffDays >= 0 && diffDays <= 60;
        } else if (expirationFilter === '90_days') {
          matchesExpiration = diffDays >= 0 && diffDays <= 90;
        }
      } else {
        matchesExpiration = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesExpiration;
  });

  // ── Excel export: always pulls fresh data from the server at click time ──
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [leasesRes, tenantsRes, propsRes] = await Promise.all([
        api.get('/leases'),
        api.get('/tenants'),
        api.get('/properties'),
      ]);
      const freshLeases: Lease[] = leasesRes.data;
      const tenantMap: Record<string, any> = {};
      tenantsRes.data.forEach((t: any) => { tenantMap[t.tenant_id] = t; });
      const propMap: Record<string, string> = {};
      propsRes.data.forEach((p: any) => { propMap[p.property_id] = p.property_name; });

      const toDate = (d: any) => (d ? dayjs(d).toDate() : '');
      const toNum = (n: any) => (n === null || n === undefined || n === '' ? '' : Number(n));
      const pickCurrent = (l: any) =>
        l.versions?.find((v: any) => v.is_current_version) || (l.versions?.length ? l.versions[l.versions.length - 1] : null);
      const today = dayjs().startOf('day');

      const sorted = [...freshLeases].sort((a, b) => {
        const ea = pickCurrent(a)?.contract_end_date || '';
        const eb = pickCurrent(b)?.contract_end_date || '';
        return String(ea).localeCompare(String(eb));
      });

      const contractRows = sorted.map((l: any, i) => {
        const v = pickCurrent(l) || {};
        const t = tenantMap[l.tenant_id] || {};
        const end = v.contract_end_date ? dayjs(v.contract_end_date).startOf('day') : null;
        return {
          '#': i + 1,
          'Lease Number': l.lease_number,
          'Property': propMap[l.property_id] || '',
          'Unit Number': l.unit_number || '',
          'Tenant': t.full_name || l.tenant_id,
          'Trade Name': t.trade_name || '',
          'Tenant Type': t.tenant_type || '',
          'Tenant ID Type': t.id_type || '',
          'Tenant ID Number': t.id_number || '',
          'Nationality': t.nationality || '',
          'Phone': t.phone || '',
          'Email': t.email || '',
          'Lease Type': l.lease_type || '',
          'Lease Date': toDate(l.lease_date),
          'Status': getEffectiveStatus(l),
          'Version No.': v.version_number ?? '',
          'Contract Start': toDate(v.contract_start_date),
          'Contract End': toDate(v.contract_end_date),
          'Days to Expiry': end ? end.diff(today, 'day') : '',
          'Currency': v.currency || 'AED',
          'Annual Rent': toNum(v.annual_rent),
          'Contract Value': toNum(v.contract_value),
          'Payment Frequency': v.payment_frequency || '',
          'No. of Cheques': toNum(v.number_of_cheques),
          'Security Deposit': toNum(v.security_deposit),
          'Agent Commission': toNum(v.agent_commission),
          'Municipality Fee': toNum(v.municipality_fee),
          'Ejari Number': v.ejari_number || '',
          'Premises No.': v.premises_no || '',
          'Contract Reference': v.contract_reference || '',
          'Renewal Reason': v.renewal_reason || '',
          'Notes': v.notes || '',
        };
      });

      const scheduleRows: any[] = [];
      sorted.forEach((l: any) => {
        const v = pickCurrent(l);
        (v?.payment_schedules || []).forEach((p: any) => {
          scheduleRows.push({
            'Lease Number': l.lease_number,
            'Property': propMap[l.property_id] || '',
            'Unit Number': l.unit_number || '',
            'Tenant': tenantMap[l.tenant_id]?.full_name || l.tenant_id,
            ...Object.fromEntries(
              Object.entries(p)
                .filter(([k]) => !k.endsWith('_id'))
                .map(([k, val]) => [
                  k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  /date|period_from|period_to/.test(k) && val ? dayjs(val as any).toDate()
                    : k === 'amount' ? toNum(val) : (val ?? ''),
                ])
            ),
          });
        });
      });

      const makeSheet = (rows: any[]) => {
        const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: 'dd/mm/yyyy' });
        const headers = rows.length ? Object.keys(rows[0]) : [];
        ws['!cols'] = headers.map(h => ({
          wch: Math.min(40, Math.max(h.length, ...rows.map(r => String(r[h] instanceof Date ? '00/00/0000' : r[h] ?? '').length)) + 2),
        }));
        // number formats for money columns
        const money = new Set(['Annual Rent', 'Contract Value', 'Security Deposit', 'Agent Commission', 'Municipality Fee', 'Amount']);
        headers.forEach((h, c) => {
          if (!money.has(h)) return;
          for (let r = 1; r <= rows.length; r++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.t === 'n') cell.z = '#,##0.00';
          }
        });
        ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };
        return ws;
      };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, makeSheet(contractRows), 'Tenancy Contracts');
      if (scheduleRows.length) XLSX.utils.book_append_sheet(wb, makeSheet(scheduleRows), 'Payment Schedules');
      XLSX.writeFile(wb, `Tenancy_Contracts_Register_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  // KPI Stats — use effective status so expired-by-date contracts are counted correctly
  const byEffectiveStatus = (s: string) => leases.filter(l => getEffectiveStatus(l) === s).length;
  const kpis = [
    { label: 'Total Contracts', value: leases.length, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Active', value: byEffectiveStatus('Active'), color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Expired', value: byEffectiveStatus('Expired'), color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    { label: 'Terminated', value: byEffectiveStatus('Terminated'), color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.2)', width: 40, height: 40 }}>
              <AssignmentIcon sx={{ color: '#6366f1', fontSize: 22 }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="white">
              Tenancy Contracts Register
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" ml={7}>
            Manage and track all tenancy contracts, statuses, and property associations
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Tenancy Contracts Register" />
            <Button
              variant="outlined"
              onClick={handleExportExcel}
              disabled={exporting}
              startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
              sx={{ color: '#10b981', borderColor: '#10b98166', '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(16,185,129,0.08)' } }}
            >
              {exporting ? 'Exporting...' : 'Download Excel'}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tenants-leases/leases/new')}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}>
            Add Lease
          </Button>
          </Box>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Strip */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            sx={{
              flex: '1 1 200px',
              background: kpi.bg,
              border: `1px solid ${kpi.color}33`,
              borderRadius: 2,
              cursor: 'default',
            }}
          >
            <CardContent sx={{ p: '12px 16px !important' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={10} letterSpacing={0.8}>
                {kpi.label}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: kpi.color, mt: 0.3 }}>
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2.5} alignItems="center" flexWrap="wrap">
        <TextField
          placeholder="Search lease no., tenant, property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Terminated">Terminated</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Expiration Timeline</InputLabel>
          <Select
            value={expirationFilter}
            label="Expiration Timeline"
            onChange={(e) => setExpirationFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Expirations</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="30_days">Expiring within 30 Days</MenuItem>
            <MenuItem value="60_days">Expiring within 60 Days</MenuItem>
            <MenuItem value="90_days">Expiring within 90 Days</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" ml="auto !important">
          Showing {filteredLeases.length} of {leases.length} contracts
        </Typography>
      </Stack>
      
      <Paper elevation={0} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
                <TableCell>Lease Number</TableCell>
                <TableCell>Unit Name</TableCell>
                <TableCell>Unit Number</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell align="right">Annual Rent</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : filteredLeases.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No tenancy contracts found.</TableCell></TableRow>
              ) : (
                [...filteredLeases].sort((a, b) => {
                  const aVersion = a.versions?.find((v: any) => v.is_current_version) || (a.versions?.length ? a.versions[a.versions.length - 1] : null);
                  const bVersion = b.versions?.find((v: any) => v.is_current_version) || (b.versions?.length ? b.versions[b.versions.length - 1] : null);
                  const aDate = aVersion?.contract_end_date ? new Date(aVersion.contract_end_date).getTime() : 0;
                  const bDate = bVersion?.contract_end_date ? new Date(bVersion.contract_end_date).getTime() : 0;
                  return aDate - bDate;
                }).map((lease) => {
                  const effectiveStatus = getEffectiveStatus(lease);
                  const statusColors = getStatusColor(effectiveStatus);
                  const propName = properties[lease.property_id] || lease.property_id || 'Unknown Property';
                  const currentVersion = lease.versions?.find((v: any) => v.is_current_version) || (lease.versions?.length ? lease.versions[lease.versions.length - 1] : null);
                  const expiryDate = formatDate(currentVersion?.contract_end_date);
                  
                  return (
                    <TableRow key={lease.lease_id} sx={{ cursor: 'pointer', '& td': { borderColor: 'rgba(255,255,255,0.04)' }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }} onClick={() => navigate(`/tenants-leases/leases/${lease.lease_id}`)}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>{lease.lease_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{propName}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{lease.unit_number || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{tenants[lease.tenant_id] || lease.tenant_id}</Typography></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#34d399' }}>
                          {currentVersion?.annual_rent != null && currentVersion.annual_rent !== ''
                            ? `${currentVersion.currency || 'AED'} ${Number(currentVersion.annual_rent).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{expiryDate}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={effectiveStatus} size="small" sx={{ bgcolor: statusColors.bg, color: statusColors.text, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/tenants-leases/leases/${lease.lease_id}`); }} sx={{ color: '#6366f1', '&:hover': { background: 'rgba(99,102,241,0.15)' } }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/tenants-leases/leases/${lease.lease_id}/edit`); }} sx={{ color: '#f59e0b', '&:hover': { background: 'rgba(245,158,11,0.15)' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteClick(lease); }} sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.15)' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: '#1e1e2f',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <DialogTitle>Delete Tenancy Contract</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to delete the contract <strong>{leaseToDelete?.lease_number}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaseList;
