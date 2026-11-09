import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, TextField,
  Tab, Tabs, Card, CardContent, CardActions, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, IconButton, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Assessment as ReportIcon,
  Lock as LockIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Report Catalogue Definition
// ─────────────────────────────────────────────────────────────────────────────

type ReportCategory = 'Property' | 'Finance' | 'Investment' | 'Maintenance' | 'Labour Camp' | 'Admin';

interface ReportDef {
  code: string;
  name: string;
  category: ReportCategory;
  description: string;
  formats: ('PDF' | 'Excel')[];
  roles: string[];
  apiEndpoint: string;
  apiParams?: (from: string, to: string, propertyId?: string) => Record<string, string>;
  tableColumns: { key: string; header: string }[];
}

const ALL_ROLES = ['Managing Director', 'Accountant', 'Administrator', 'Camp Supervisor', 'Maintenance Staff'];

const REPORTS: ReportDef[] = [
  {
    code: 'R01', name: 'Property Register', category: 'Property',
    description: 'Complete list of all properties with status, type, and emirate.',
    formats: ['PDF', 'Excel'], roles: ALL_ROLES,
    apiEndpoint: '/properties',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property Name' },
      { key: 'property_type', header: 'Type' },
      { key: 'emirate', header: 'Emirate' },
      { key: 'status', header: 'Status' },
      { key: 'total_units', header: 'Units' },
    ],
  },
  {
    code: 'R02', name: 'Unit Occupancy Report', category: 'Property',
    description: 'Vacancy and occupancy breakdown by property and unit.',
    formats: ['PDF', 'Excel'], roles: ALL_ROLES,
    apiEndpoint: '/properties',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property' },
      { key: 'unit_number', header: 'Unit No.' },
      { key: 'unit_type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'floor', header: 'Floor' },
    ],
  },
  {
    code: 'R03', name: 'Lease Expiry Report', category: 'Property',
    description: 'All active leases expiring within the selected date range.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/leases',
    apiParams: (from, to) => ({ status: 'Active', end_date_from: from, end_date_to: to }),
    tableColumns: [
      { key: 'lease_reference', header: 'Lease Ref' },
      { key: 'tenant_name', header: 'Tenant' },
      { key: 'property_name', header: 'Property' },
      { key: 'end_date', header: 'End Date' },
      { key: 'annual_rent', header: 'Annual Rent (AED)' },
    ],
  },
  {
    code: 'R04', name: 'Lease Schedule Report', category: 'Property',
    description: 'Payment schedules for all active leases.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/leases',
    apiParams: () => ({ status: 'Active' }),
    tableColumns: [
      { key: 'lease_reference', header: 'Lease Ref' },
      { key: 'tenant_name', header: 'Tenant' },
      { key: 'annual_rent', header: 'Annual Rent (AED)' },
      { key: 'start_date', header: 'Start Date' },
      { key: 'end_date', header: 'End Date' },
    ],
  },
  {
    code: 'R05', name: 'Rental Collection Report', category: 'Finance',
    description: 'All rental receipts collected within the selected period.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/rental-receipts',
    apiParams: (from, to) => ({ date_from: from, date_to: to }),
    tableColumns: [
      { key: 'receipt_number', header: 'Receipt #' },
      { key: 'tenant_name', header: 'Tenant' },
      { key: 'receipt_date', header: 'Date' },
      { key: 'amount', header: 'Amount (AED)' },
      { key: 'payment_method', header: 'Method' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R06', name: 'PDC Received Register', category: 'Finance',
    description: 'All received Post-Dated Cheques with current status.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/pdc-received',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'cheque_number', header: 'Cheque #' },
      { key: 'tenant_name', header: 'Tenant' },
      { key: 'bank_name', header: 'Bank' },
      { key: 'cheque_amount', header: 'Amount (AED)' },
      { key: 'cheque_date', header: 'Cheque Date' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R07', name: 'PDC Due Report', category: 'Finance',
    description: 'PDCs due for deposit within the selected date range.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/pdc-received',
    apiParams: (from, to) => ({ due_from: from, due_to: to }),
    tableColumns: [
      { key: 'cheque_number', header: 'Cheque #' },
      { key: 'bank_name', header: 'Bank' },
      { key: 'cheque_amount', header: 'Amount (AED)' },
      { key: 'cheque_date', header: 'Due Date' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R08', name: 'Returned Cheque Report', category: 'Finance',
    description: 'All returned cheques with return reasons and current status.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/pdc-received',
    apiParams: () => ({ status: 'Returned' }),
    tableColumns: [
      { key: 'cheque_number', header: 'Cheque #' },
      { key: 'tenant_name', header: 'Tenant' },
      { key: 'bank_name', header: 'Bank' },
      { key: 'cheque_amount', header: 'Amount (AED)' },
      { key: 'cheque_date', header: 'Cheque Date' },
      { key: 'return_reason', header: 'Return Reason' },
    ],
  },
  {
    code: 'R09', name: 'PDC Issued Register', category: 'Finance',
    description: 'All issued Post-Dated Cheques with payee and status.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/pdc-issued',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'cheque_number', header: 'Cheque #' },
      { key: 'payee_name', header: 'Payee' },
      { key: 'payee_type', header: 'Payee Type' },
      { key: 'cheque_amount', header: 'Amount (AED)' },
      { key: 'cheque_date', header: 'Cheque Date' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R10', name: 'Bank Commitment Report', category: 'Finance',
    description: 'Outstanding issued PDCs grouped by bank account.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/pdc-issued',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'bank_account_name', header: 'Bank Account' },
      { key: 'payee_name', header: 'Payee' },
      { key: 'cheque_amount', header: 'Amount (AED)' },
      { key: 'cheque_date', header: 'Due Date' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R11', name: 'Expense Analysis Report', category: 'Finance',
    description: 'Expenses by category, property, and period.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/expenses',
    apiParams: (from, to) => ({ date_from: from, date_to: to }),
    tableColumns: [
      { key: 'expense_date', header: 'Date' },
      { key: 'category_name', header: 'Category' },
      { key: 'property_name', header: 'Property' },
      { key: 'description', header: 'Description' },
      { key: 'amount', header: 'Amount (AED)' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R12', name: 'Shared Expense Allocation', category: 'Finance',
    description: 'Shared expense allocation breakdown per property.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/expenses',
    apiParams: (from, to) => ({ is_shared: 'true', date_from: from, date_to: to }),
    tableColumns: [
      { key: 'expense_date', header: 'Date' },
      { key: 'description', header: 'Description' },
      { key: 'amount', header: 'Total (AED)' },
      { key: 'allocation_method', header: 'Allocation' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R13', name: 'Cash Flow Forecast', category: 'Finance',
    description: 'Incoming vs outgoing PDC commitments and cash flow projection.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/dashboard/finance',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'label', header: 'Month' },
      { key: 'incoming', header: 'Incoming (AED)' },
      { key: 'outgoing', header: 'Outgoing (AED)' },
      { key: 'net', header: 'Net (AED)' },
    ],
  },
  {
    code: 'R14', name: 'Investment Portfolio Report', category: 'Investment',
    description: 'Properties with purchase cost vs current market value comparison.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Administrator'],
    apiEndpoint: '/investment/dashboard',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property' },
      { key: 'total_acquisition_cost', header: 'Purchase Cost (AED)' },
      { key: 'current_market_value', header: 'Market Value (AED)' },
      { key: 'unrealized_gain', header: 'Unrealized Gain (AED)' },
      { key: 'appreciation_percentage', header: 'Appreciation %' },
    ],
  },
  {
    code: 'R15', name: 'Capital Appreciation Report', category: 'Investment',
    description: 'Capital appreciation percentage ranked by property.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Administrator'],
    apiEndpoint: '/investment/dashboard',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property' },
      { key: 'total_acquisition_cost', header: 'Purchase Cost (AED)' },
      { key: 'current_market_value', header: 'Current Value (AED)' },
      { key: 'appreciation_percentage', header: 'Appreciation %' },
    ],
  },
  {
    code: 'R16', name: 'Rental Yield Report', category: 'Investment',
    description: 'Net rental yield percentage by property.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/investment/dashboard',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property' },
      { key: 'current_market_value', header: 'Market Value (AED)' },
      { key: 'net_rental_yield', header: 'Net Yield %' },
    ],
  },
  {
    code: 'R17', name: 'Profitability Report', category: 'Investment',
    description: 'Income minus expenses per property — net profitability.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/investment/dashboard',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'property_name', header: 'Property' },
      { key: 'total_income', header: 'Total Income (AED)' },
      { key: 'total_expenses', header: 'Total Expenses (AED)' },
      { key: 'net_profit', header: 'Net Profit (AED)' },
    ],
  },
  {
    code: 'R18', name: 'Loan Outstanding Report', category: 'Finance',
    description: 'All active loans with outstanding balance.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/loans',
    apiParams: () => ({ status: 'Active' }),
    tableColumns: [
      { key: 'lender_name', header: 'Lender' },
      { key: 'principal_amount', header: 'Principal (AED)' },
      { key: 'outstanding_balance', header: 'Outstanding (AED)' },
      { key: 'interest_rate', header: 'Interest Rate %' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R19', name: 'Loan Instalment Schedule', category: 'Finance',
    description: 'Payment schedule by loan with upcoming instalments.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/loans',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'lender_name', header: 'Lender' },
      { key: 'due_date', header: 'Due Date' },
      { key: 'total_amount', header: 'Amount (AED)' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    code: 'R20', name: 'Maintenance Summary Report', category: 'Maintenance',
    description: 'Maintenance tickets by status, category, and cost.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator'],
    apiEndpoint: '/maintenance-tickets',
    apiParams: (from, to) => ({ date_from: from, date_to: to }),
    tableColumns: [
      { key: 'ticket_number', header: 'Ticket #' },
      { key: 'title', header: 'Title' },
      { key: 'property_name', header: 'Property' },
      { key: 'category', header: 'Category' },
      { key: 'status', header: 'Status' },
      { key: 'estimated_cost', header: 'Est. Cost (AED)' },
    ],
  },
  {
    code: 'R21', name: 'Labour Camp Occupancy Report', category: 'Labour Camp',
    description: 'Bed / room occupancy and utility costs for the camp.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Camp Supervisor', 'Administrator'],
    apiEndpoint: '/labour-camp/units',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'unit_number', header: 'Room / Unit' },
      { key: 'block', header: 'Block' },
      { key: 'capacity', header: 'Capacity' },
      { key: 'status', header: 'Status' },
      { key: 'resident_count', header: 'Residents' },
    ],
  },
  {
    code: 'R22', name: 'Audit Trail Report', category: 'Admin',
    description: 'Full audit trail — all data changes within the selected period.',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Administrator'],
    apiEndpoint: '/audit-logs',
    apiParams: (from, to) => ({ date_from: from, date_to: to }),
    tableColumns: [
      { key: 'timestamp', header: 'Timestamp' },
      { key: 'user_name', header: 'User' },
      { key: 'module', header: 'Module' },
      { key: 'action', header: 'Action' },
      { key: 'entity_reference', header: 'Reference' },
    ],
  },
  {
    code: 'R23', name: 'Owner Beneficiary Report', category: 'Admin',
    description: 'Income distribution per owner and beneficiary.',
    formats: ['PDF'], roles: ['Managing Director', 'Administrator'],
    apiEndpoint: '/ownership',
    apiParams: () => ({}),
    tableColumns: [
      { key: 'owner_name', header: 'Owner' },
      { key: 'property_name', header: 'Property' },
      { key: 'ownership_percentage', header: 'Ownership %' },
      { key: 'share_amount', header: 'Share (AED)' },
    ],
  },
  {
    code: 'R24', name: 'Document Expiry Report', category: 'Admin',
    description: 'Documents expiring within the selected period. (Sprint 10 — Documents module required)',
    formats: ['PDF', 'Excel'], roles: ['Managing Director', 'Accountant', 'Administrator'],
    apiEndpoint: '/documents/expiring',
    apiParams: (from, to) => ({ expiry_from: from, expiry_to: to }),
    tableColumns: [
      { key: 'document_name', header: 'Document' },
      { key: 'entity_type', header: 'Entity Type' },
      { key: 'entity_reference', header: 'Reference' },
      { key: 'expiry_date', header: 'Expiry Date' },
    ],
  },
];

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  Property: '#8b5cf6',
  Finance: '#06b6d4',
  Investment: '#f59e0b',
  Maintenance: '#f97316',
  'Labour Camp': '#22c55e',
  Admin: '#64748b',
};

const CATEGORIES: ReportCategory[] = ['Property', 'Finance', 'Investment', 'Maintenance', 'Labour Camp', 'Admin'];

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generator
// ─────────────────────────────────────────────────────────────────────────────

function generatePDF(report: ReportDef, rows: any[], dateFrom: string, dateTo: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 300, 40, 'F');
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AIGPMS', 14, 16);
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(14);
  doc.text(`${report.code} — ${report.name}`, 14, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`AI Powered Gateway Property Management System`, 14, 36);
  doc.text(`Period: ${dateFrom} to ${dateTo}`, 200, 28);
  doc.text(`Generated: ${new Date().toLocaleString('en-AE')}`, 200, 34);

  if (rows.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(12);
    doc.text('No data found for the selected period.', 14, 60);
    doc.save(`${report.code}_${report.name.replace(/\s+/g, '_')}.pdf`);
    return;
  }

  // Normalize data
  const flatRows = flattenData(report, rows);
  const headers = report.tableColumns.map((c) => c.header);
  const body = flatRows.map((row: any) => report.tableColumns.map((c) => {
    const val = row[c.key];
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString('en-AE', { maximumFractionDigits: 2 });
    return String(val);
  }));

  autoTable(doc, {
    head: [headers],
    body,
    startY: 45,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 23, 42] },
    bodyStyles: { fillColor: [20, 30, 48], textColor: [226, 232, 240] },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 280, 200, { align: 'right' });
    doc.text(`${report.code} — ${report.name} | AIGPMS Confidential`, 14, 200);
  }

  doc.save(`${report.code}_${report.name.replace(/\s+/g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel Generator
// ─────────────────────────────────────────────────────────────────────────────

function generateExcel(report: ReportDef, rows: any[], dateFrom: string, dateTo: string) {
  const flatRows = flattenData(report, rows);
  const headers = report.tableColumns.map((c) => c.header);
  const body = flatRows.map((row: any) =>
    report.tableColumns.map((c) => {
      const val = row[c.key];
      return val === null || val === undefined ? '' : val;
    })
  );

  const wsData = [
    ['AIGPMS — AI Powered Gateway Property Management System'],
    [`Report: ${report.code} — ${report.name}`],
    [`Period: ${dateFrom} to ${dateTo}`, '', `Generated: ${new Date().toLocaleString('en-AE')}`],
    [],
    headers,
    ...body,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = report.tableColumns.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.code);
  XLSX.writeFile(wb, `${report.code}_${report.name.replace(/\s+/g, '_')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Flattener
// ─────────────────────────────────────────────────────────────────────────────

function flattenData(report: ReportDef, data: any): any[] {
  if (!data) return [];
  // Handle dashboard/finance endpoint (cash_flow array)
  if (report.code === 'R13' && data.cash_flow) return data.cash_flow;
  // Handle investment dashboard endpoint
  if (['R14', 'R15', 'R16', 'R17'].includes(report.code)) {
    if (data.properties) return data.properties;
    if (data.portfolio_breakdown) return data.portfolio_breakdown;
    if (Array.isArray(data)) return data;
    return [];
  }
  if (Array.isArray(data)) return data;
  if (data.items) return data.items;
  if (data.data) return data.data;
  if (data.results) return data.results;
  // Try to find the first array value
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Card Component
// ─────────────────────────────────────────────────────────────────────────────

const ReportCard: React.FC<{
  report: ReportDef;
  onExport: (report: ReportDef, format: 'PDF' | 'Excel') => void;
  accessible: boolean;
}> = ({ report, onExport, accessible }) => {
  const color = CATEGORY_COLORS[report.category];

  return (
    <Card sx={{
      bgcolor: accessible ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.5)',
      border: `1px solid ${accessible ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
      borderRadius: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': accessible ? { transform: 'translateY(-2px)', boxShadow: `0 8px 32px ${color}20` } : {},
      opacity: accessible ? 1 : 0.45,
    }}>
      <CardContent sx={{ p: 2.5, flex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={report.code}
              size="small"
              sx={{ bgcolor: `${color}20`, color, fontWeight: 800, fontSize: '0.65rem', height: 20, letterSpacing: 0.5 }}
            />
            <Chip
              label={report.category}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.8)', fontSize: '0.62rem', height: 18 }}
            />
          </Box>
          {!accessible && (
            <Tooltip title="You don't have access to this report">
              <LockIcon sx={{ fontSize: 16, color: 'rgba(148,163,184,0.3)' }} />
            </Tooltip>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: accessible ? '#f1f5f9' : 'rgba(148,163,184,0.5)', fontWeight: 700, mb: 1, fontSize: '0.88rem', lineHeight: 1.4 }}>
          {report.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)', lineHeight: 1.5, display: 'block' }}>
          {report.description}
        </Typography>
      </CardContent>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
      <CardActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        {report.formats.includes('PDF') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PdfIcon sx={{ fontSize: 14 }} />}
            disabled={!accessible}
            onClick={() => onExport(report, 'PDF')}
            sx={{
              borderColor: `${color}30`,
              color: accessible ? color : 'rgba(148,163,184,0.3)',
              fontSize: '0.7rem',
              py: 0.5,
              '&:hover': { borderColor: color, bgcolor: `${color}10` },
              '&:disabled': { borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.2)' },
            }}
          >
            PDF
          </Button>
        )}
        {report.formats.includes('Excel') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ExcelIcon sx={{ fontSize: 14 }} />}
            disabled={!accessible}
            onClick={() => onExport(report, 'Excel')}
            sx={{
              borderColor: 'rgba(34,197,94,0.3)',
              color: accessible ? '#22c55e' : 'rgba(148,163,184,0.3)',
              fontSize: '0.7rem',
              py: 0.5,
              '&:hover': { borderColor: '#22c55e', bgcolor: 'rgba(34,197,94,0.08)' },
              '&:disabled': { borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.2)' },
            }}
          >
            Excel
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Report Centre
// ─────────────────────────────────────────────────────────────────────────────

const ReportCentre: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState<Dayjs | null>(dayjs().endOf('month'));
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successReport, setSuccessReport] = useState('');

  const currentCategory = CATEGORIES[activeTab];
  const reports = REPORTS.filter((r) => r.category === currentCategory);

  const isAccessible = (report: ReportDef) => {
    if (!role) return false;
    return report.roles.includes(role);
  };

  const handleExport = async (report: ReportDef, format: 'PDF' | 'Excel') => {
    if (!isAccessible(report)) return;

    const from = dateFrom ? dateFrom.format('YYYY-MM-DD') : '';
    const to = dateTo ? dateTo.format('YYYY-MM-DD') : '';

    setGenerating(`${report.code}-${format}`);
    setError('');
    setSuccessReport('');

    try {
      const params = report.apiParams ? report.apiParams(from, to) : {};
      const res = await api.get(report.apiEndpoint, { params });
      const rows = flattenData(report, res.data);

      if (format === 'PDF') {
        generatePDF(report, rows, from, to);
      } else {
        generateExcel(report, rows, from, to);
      }

      setSuccessReport(`${report.code} — ${report.name} exported as ${format}`);
    } catch (err: any) {
      setError(`Failed to generate ${report.code}: ${err?.response?.data?.detail || err?.message || 'API error'}`);
    } finally {
      setGenerating(null);
    }
  };

  const accessibleCount = REPORTS.filter(isAccessible).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 800, mb: 0.5 }}>
            Reports Centre
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.7)' }}>
            {accessibleCount} of {REPORTS.length} reports available for your role · PDF & Excel export
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <DatePicker
            label="From"
            value={dateFrom}
            onChange={setDateFrom}
            slotProps={{
              textField: {
                size: 'small',
                sx: { '& .MuiOutlinedInput-root': { bgcolor: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '0.82rem' }, '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem' } },
              },
            }}
          />
          <DatePicker
            label="To"
            value={dateTo}
            onChange={setDateTo}
            slotProps={{
              textField: {
                size: 'small',
                sx: { '& .MuiOutlinedInput-root': { bgcolor: 'rgba(15,23,42,0.8)', color: '#f1f5f9', fontSize: '0.82rem' }, '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem' } },
              },
            }}
          />
        </Box>
      </Box>

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', '& .MuiAlert-icon': { color: '#ef4444' } }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successReport && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(34,197,94,0.08)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)', '& .MuiAlert-icon': { color: '#22c55e' } }} onClose={() => setSuccessReport('')}>
          ✓ {successReport}
        </Alert>
      )}

      {/* Category Tabs */}
      <Paper sx={{ bgcolor: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: 'rgba(148,163,184,0.6)', fontWeight: 600, fontSize: '0.82rem', textTransform: 'none', minHeight: 52 },
            '& .Mui-selected': { color: '#f1f5f9 !important' },
            '& .MuiTabs-indicator': { bgcolor: '#6366f1', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          {CATEGORIES.map((cat) => {
            const count = REPORTS.filter((r) => r.category === cat && isAccessible(r)).length;
            return (
              <Tab
                key={cat}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CATEGORY_COLORS[cat] }} />
                    {cat}
                    <Chip label={count} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: count > 0 ? `${CATEGORY_COLORS[cat]}20` : 'rgba(255,255,255,0.05)', color: count > 0 ? CATEGORY_COLORS[cat] : 'rgba(148,163,184,0.4)', fontWeight: 700 }} />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Report Grid */}
      <Grid container spacing={2.5}>
        {reports.map((report) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={report.code}>
            <Box position="relative">
              {generating === `${report.code}-PDF` || generating === `${report.code}-Excel` ? (
                <Box
                  position="absolute" top={0} left={0} right={0} bottom={0} zIndex={10}
                  display="flex" alignItems="center" justifyContent="center"
                  sx={{ bgcolor: 'rgba(15,23,42,0.8)', borderRadius: 3, backdropFilter: 'blur(4px)' }}
                >
                  <Box textAlign="center">
                    <CircularProgress size={28} sx={{ color: '#6366f1', mb: 1 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)', display: 'block' }}>
                      Generating…
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              <ReportCard
                report={report}
                onExport={handleExport}
                accessible={isAccessible(report)}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Role Access Legend */}
      <Paper sx={{ mt: 4, p: 2.5, bgcolor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>
          Role Access Guide
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap">
          {[
            { label: 'Managing Director', desc: 'All 24 reports' },
            { label: 'Accountant', desc: 'R01–R18, R20–R22, R24' },
            { label: 'Camp Supervisor', desc: 'R21 only' },
            { label: 'Maintenance Staff', desc: 'R20 only' },
            { label: 'Administrator', desc: 'R22, R23, R24 + selected' },
          ].map((r) => (
            <Box key={r.label}>
              <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700, display: 'block' }}>{r.label}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>{r.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default ReportCentre;
