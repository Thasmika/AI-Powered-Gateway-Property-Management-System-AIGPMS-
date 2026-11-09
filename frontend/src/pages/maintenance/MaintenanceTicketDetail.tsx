import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, CircularProgress, Alert,
  Divider, Stack, TextField, MenuItem, Tab, Tabs, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDateTime } from '../../utils/dateUtils';
import PdfExportButton from '../../components/PdfExportButton';

const priorityColors: Record<string, 'default' | 'warning' | 'error' | 'info' | 'success'> = {
  Low: 'default', Medium: 'info', High: 'warning', Critical: 'error',
};
const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Open: 'warning', Assigned: 'info', 'In Progress': 'info',
  'Pending Parts/LPO': 'warning', Completed: 'success', Verified: 'success',
  Closed: 'default', Cancelled: 'error',
};

const LIFECYCLE = [
  'Open', 'Assigned', 'In Progress', 'Pending Parts/LPO', 'Completed', 'Verified', 'Closed'
];

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box pt={2}>{children}</Box>}</div>
);

const MaintenanceTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Status update dialog
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assign dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/maintenance-tickets/${ticketId}`);
      setTicket(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const canManage = ['Administrator', 'Managing Director', 'Accountant'].includes(user?.role || '');

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdatingStatus(true);
    try {
      await api.post(`/maintenance-tickets/${ticketId}/status`, {
        status: newStatus,
        notes: statusNotes || null,
      });
      setActionMsg(`Status updated to "${newStatus}"`);
      setStatusDialog(false);
      setNewStatus(''); setStatusNotes('');
      fetchTicket();
    } catch (e: any) {
      setActionMsg(e.response?.data?.detail || 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await api.post(`/maintenance-tickets/${ticketId}/assign`, {
        assigned_to_name: assignName || null,
        notes: assignNotes || null,
      });
      setActionMsg('Assignment recorded.');
      setAssignDialog(false);
      setAssignName(''); setAssignNotes('');
      fetchTicket();
    } catch (e: any) {
      setActionMsg(e.response?.data?.detail || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Close this ticket?')) return;
    try {
      await api.post(`/maintenance-tickets/${ticketId}/close`);
      setActionMsg('Ticket closed.');
      fetchTicket();
    } catch (e: any) {
      setActionMsg(e.response?.data?.detail || 'Close failed');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;
  if (!ticket) return null;

  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/maintenance')} sx={{ mb: 1 }}>
            Back to Maintenance
          </Button>
          <Typography variant="h5" fontWeight={700}>
            <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {ticket.ticket_number} — {ticket.title}
          </Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Chip label={ticket.status} color={statusColors[ticket.status] || 'default'} />
            <Chip label={`Priority: ${ticket.priority}`} color={priorityColors[ticket.priority] || 'default'} variant="outlined" />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <PdfExportButton />
        {canManage && !['Closed', 'Cancelled'].includes(ticket.status) && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Button
              variant="outlined"
              startIcon={<AssignmentIndIcon />}
              onClick={() => setAssignDialog(true)}
            >
              Assign
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setStatusDialog(true)}
            >
              Update Status
            </Button>
            {['Completed', 'Verified'].includes(ticket.status) && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleClose}
              >
                Close Ticket
              </Button>
            )}
          </Stack>
        )}
        </Stack>
      </Stack>

      {actionMsg && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setActionMsg(null)}
        >
          {actionMsg}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 0 }}>
        <Tab label="Ticket Details" />
        <Tab label={`Assignments (${ticket.assignments?.length || 0})`} />
        <Tab label={`Documents (${ticket.documents?.length || 0})`} />
      </Tabs>

      {/* Tab 0 — Details */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 2 }}>
              <Typography variant="subtitle2" color="primary.main" fontWeight={700} gutterBottom>
                Ticket Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: 'Ticket Number', value: ticket.ticket_number },
                  { label: 'Property ID', value: ticket.property_id },
                  { label: 'Unit', value: ticket.unit_id || '—' },
                  { label: 'Category', value: ticket.category?.category_name || ticket.category_id },
                  { label: 'Priority', value: ticket.priority },
                  { label: 'Status', value: ticket.status },
                  { label: 'Reported Date', value: ticket.reported_date },
                  { label: 'Reported By', value: ticket.reported_by || '—' },
                  { label: 'Tenant', value: ticket.tenant_id || '—' },
                  { label: 'Target Completion', value: ticket.target_completion_date || '—' },
                  { label: 'Actual Completion', value: ticket.actual_completion_date || '—' },
                  { label: 'Closed Date', value: ticket.closed_date || '—' },
                ].map(row => (
                  <Grid item xs={12} sm={6} key={row.label}>
                    <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {ticket.description && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {ticket.description}
                  </Typography>
                </Box>
              )}

              {ticket.resolution_notes && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">Resolution Notes</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {ticket.resolution_notes}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 2 }}>
              <Typography variant="subtitle2" color="primary.main" fontWeight={700} gutterBottom>
                Costs & Supplier
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {[
                { label: 'Supplier', value: ticket.supplier_name || '—' },
                { label: 'LPO Number', value: ticket.lpo_number || '—' },
                {
                  label: 'LPO Amount',
                  value: ticket.lpo_amount
                    ? `AED ${Number(ticket.lpo_amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                {
                  label: 'Estimated Cost',
                  value: ticket.estimated_cost
                    ? `AED ${Number(ticket.estimated_cost).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                {
                  label: 'Actual Cost',
                  value: ticket.actual_cost
                    ? `AED ${Number(ticket.actual_cost).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                { label: 'Linked Expense', value: ticket.expense_id || '—' },
              ].map(row => (
                <Box key={row.label} mb={1.5}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
                </Box>
              ))}
            </Paper>

            {ticket.internal_notes && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">Internal Notes</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {ticket.internal_notes}
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 1 — Assignments */}
      <TabPanel value={tab} index={1}>
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>Assigned To</strong></TableCell>
                <TableCell><strong>Assigned At</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Started</strong></TableCell>
                <TableCell><strong>Completed</strong></TableCell>
                <TableCell><strong>Notes</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(ticket.assignments || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No assignments yet.
                  </TableCell>
                </TableRow>
              ) : (
                (ticket.assignments || []).map((a: any) => (
                  <TableRow key={a.assignment_id} hover>
                    <TableCell>{a.assigned_to_name || a.assigned_to_user_id || '—'}</TableCell>
                    <TableCell>{formatDateTime(a.assigned_at)}</TableCell>
                    <TableCell>
                      <Chip label={a.assignment_status} size="small" />
                    </TableCell>
                    <TableCell>{formatDateTime(a.started_at)}</TableCell>
                    <TableCell>{formatDateTime(a.completed_at)}</TableCell>
                    <TableCell>{a.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </TabPanel>

      {/* Tab 2 — Documents */}
      <TabPanel value={tab} index={2}>
        <Paper sx={{ p: 3 }}>
          {(ticket.documents || []).length === 0 ? (
            <Box textAlign="center" py={4} color="text.secondary">
              <AttachFileIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography>No documents or photos uploaded yet.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>File Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Uploaded</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(ticket.documents || []).map((doc: any) => (
                  <TableRow key={doc.document_id} hover>
                    <TableCell><Chip label={doc.document_type} size="small" /></TableCell>
                    <TableCell>{doc.file_name}</TableCell>
                    <TableCell>{doc.description || '—'}</TableCell>
                    <TableCell>{formatDateTime(doc.uploaded_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        href={`/uploads/${doc.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </TabPanel>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Ticket Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select fullWidth label="New Status" size="small"
              value={newStatus} onChange={e => setNewStatus(e.target.value)}
            >
              {LIFECYCLE.filter(s => s !== ticket.status).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              fullWidth multiline rows={2} label="Notes (Optional)" size="small"
              value={statusNotes} onChange={e => setStatusNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={!newStatus || updatingStatus}
            startIcon={updatingStatus ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              fullWidth label="Assign To (Name or Contractor)" size="small"
              value={assignName} onChange={e => setAssignName(e.target.value)}
              placeholder="Enter staff name or contractor"
            />
            <TextField
              fullWidth multiline rows={2} label="Notes" size="small"
              value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={assigning}
            startIcon={assigning ? <CircularProgress size={14} color="inherit" /> : <AssignmentIndIcon />}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceTicketDetail;
