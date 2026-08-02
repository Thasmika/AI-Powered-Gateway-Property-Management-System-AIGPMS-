import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip
} from '@mui/material';
import api from '../../services/api';

interface ScheduleProps {
  versionId: string;
}

const LeasePaymentSchedule: React.FC<ScheduleProps> = ({ versionId }) => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leases/versions/${versionId}/schedules`);
      setSchedules(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    if (versionId) {
      fetchSchedules();
    }
  }, [versionId, fetchSchedules]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Approved Payment Schedule</Typography>
      <Paper elevation={0} sx={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'text.secondary' } }}>
                <TableCell>Instalment</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Period (From - To)</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>No schedule found.</TableCell></TableRow>
              ) : (
                schedules.sort((a,b) => a.instalment_number - b.instalment_number).map((sch) => (
                  <TableRow key={sch.schedule_id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)' } }}>
                    <TableCell><Typography color="white">#{sch.instalment_number}</Typography></TableCell>
                    <TableCell><Typography color="white">{sch.due_date}</Typography></TableCell>
                    <TableCell><Typography color="text.secondary">{sch.period_from || '—'} to {sch.period_to || '—'}</Typography></TableCell>
                    <TableCell><Typography color="white" fontWeight="bold">{sch.amount}</Typography></TableCell>
                    <TableCell>
                      <Chip label={sch.status} size="small" 
                        sx={{ bgcolor: sch.status === 'Paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
                              color: sch.status === 'Paid' ? '#10b981' : '#f59e0b' }} />
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

export default LeasePaymentSchedule;
