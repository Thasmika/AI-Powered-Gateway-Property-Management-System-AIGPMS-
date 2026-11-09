import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/api';
import PdfExportButton from '../../components/PdfExportButton';

const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await api.get(`/rental-receipts/${id}`);
        setReceipt(response.data);
      } catch (error) {
        console.error('Failed to fetch receipt', error);
      }
    };
    fetchReceipt();
  }, [id]);

  const handlePost = async () => {
    if (window.confirm("Are you sure you want to Post this receipt? It cannot be edited after posting.")) {
      try {
        const response = await api.post(`/rental-receipts/${id}/post`);
        setReceipt(response.data);
      } catch (error) {
        console.error('Failed to post receipt', error);
      }
    }
  };

  if (!receipt) return <Box p={3} color="white">Loading...</Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700} color="white">
          Receipt {receipt.receipt_number}
        </Typography>
        <Stack direction="row" spacing={2}>
          <PdfExportButton />
          <Button 
            variant="outlined" 
            startIcon={<PrintIcon />} 
            onClick={() => window.print()}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Print PDF
          </Button>
          {receipt.receipt_status !== 'Posted' && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<SendIcon />} 
              onClick={handlePost}
            >
              Post Receipt
            </Button>
          )}
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Box mt={0.5}>
              <Chip 
                label={receipt.receipt_status} 
                color={receipt.receipt_status === 'Posted' ? 'success' : 'warning'} 
                size="small" 
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">Date</Typography>
            <Typography variant="body1" color="white" fontWeight={600}>{receipt.receipt_date}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">Total Amount</Typography>
            <Typography variant="body1" color="white" fontWeight={600}>{receipt.total_amount} {receipt.currency}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">Lease Number</Typography>
            <Typography variant="body1" color="white" fontWeight={600}>{receipt.lease?.lease_number || 'N/A'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 0, bgcolor: '#1a1f36', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <Box p={2} borderBottom="1px solid rgba(255,255,255,0.1)">
          <Typography variant="h6" color="white">Payment Lines</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>#</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Type</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Cheque No</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Bank</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Date</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Amount</TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: 'none' }}>Linked PDC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipt.payment_lines.map((line: any, idx: number) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.line_number}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.instrument_type}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.cheque_number || '-'}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.bank_name || '-'}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.instrument_date || '-'}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.05)' }}>{line.amount}</TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {line.pdc_received_id ? (
                      <Button component={Link} to={`/pdc/register/${line.pdc_received_id}`} size="small" variant="outlined" sx={{ color: '#6366f1', borderColor: 'rgba(99,102,241,0.5)' }}>
                        View PDC
                      </Button>
                    ) : (
                      <Typography color="text.secondary" variant="body2">-</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ReceiptDetail;
