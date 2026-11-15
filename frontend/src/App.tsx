import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Typography, Paper } from '@mui/material';

// Admin — Master Data Pages (Module 15)
import MasterDataHub from './pages/admin/MasterDataHub';
import BankMaster from './pages/admin/BankMaster';
import CompanyBankMaster from './pages/admin/CompanyBankMaster';
import ExpenseCategoryMaster from './pages/admin/ExpenseCategoryMaster';
import ApprovalLimits from './pages/admin/ApprovalLimits';
import NotificationTemplates from './pages/admin/NotificationTemplates';

// Sprint 2 - Property, Title Deeds, Investment
import PropertyList from './pages/properties/PropertyList';
import PropertyEntry from './pages/properties/PropertyEntry';
import PropertyDetail from './pages/properties/PropertyDetail';
import UnitRegister from './pages/properties/UnitRegister';
import TitleDeedList from './pages/title-deeds/TitleDeedList';
import TitleDeedEntry from './pages/title-deeds/TitleDeedEntry';
import TitleDeedDetail from './pages/title-deeds/TitleDeedDetail';
import PropertyValuationEntry from './pages/title-deeds/PropertyValuationEntry';
import AcquisitionCostEntry from './pages/title-deeds/AcquisitionCostEntry';
import InvestmentDashboard from './pages/dashboard/InvestmentDashboard';

// Sprint 3 - Ownership & Beneficiaries
import OwnershipList from './pages/ownership/OwnershipList';
import OwnershipDetail from './pages/ownership/OwnershipDetail';

// Sprint 4 - Tenants & Leases
import TenantList from './pages/tenants/TenantList';
import TenantEntry from './pages/tenants/TenantEntry';
import TenantDetail from './pages/tenants/TenantDetail';
import LeaseEntry from './pages/leases/LeaseEntry';
import LeaseDetail from './pages/leases/LeaseDetail';
import LeaseList from './pages/leases/LeaseList';

import ReceiptList from './pages/pdc/ReceiptList';
import ReceiptVoucherEntry from './pages/pdc/ReceiptVoucherEntry';
import ReceiptDetail from './pages/pdc/ReceiptDetail';
import AIChat from './pages/AIChat';
import PDCReceivedRegister from './pages/pdc/PDCReceivedRegister';
import PDCReceivedDetail from './pages/pdc/PDCReceivedDetail';

import PDCIssuedRegister from './pages/pdc/PDCIssuedRegister';
import PDCIssuedDetail from './pages/pdc/PDCIssuedDetail';


// Sprint 7 — Expenses, Finance & Loans
import ExpenseList from './pages/expenses/ExpenseList';
import ExpenseEntry from './pages/expenses/ExpenseEntry';
import ExpenseDetail from './pages/expenses/ExpenseDetail';
import LoanList from './pages/loans/LoanList';
import LoanDetail from './pages/loans/LoanDetail';
import PaymentVoucherEntry from './pages/loans/PaymentVoucherEntry';

// Sprint 8 — Maintenance Management
import MaintenanceList from './pages/maintenance/MaintenanceList';
import MaintenanceTicketEntry from './pages/maintenance/MaintenanceTicketEntry';
import MaintenanceTicketDetail from './pages/maintenance/MaintenanceTicketDetail';

// Sprint 8 — Labour Camp Management
import LabourCampManagement from './pages/labourcamp/LabourCampManagement';
import LabourCampResidents from './pages/labourcamp/LabourCampResidents';
import LabourCampUtilities from './pages/labourcamp/LabourCampUtilities';
import LabourCampCashReceipt from './pages/labourcamp/LabourCampCashReceipt';
import LabourCampCashReceiptDetail from './pages/labourcamp/LabourCampCashReceiptDetail';

// Sprint 9 — Role-Based Dashboards
import MdDashboard from './pages/dashboard/MdDashboard';
import FinanceDashboard from './pages/dashboard/FinanceDashboard';
import PropertyDashboard from './pages/dashboard/PropertyDashboard';
import MaintenanceDashboard from './pages/dashboard/MaintenanceDashboard';
import LabourCampDashboard from './pages/dashboard/LabourCampDashboard';

// Sprint 9 — Reports Centre
import ReportCentre from './pages/reports/ReportCentre';

// Generic placeholder page for role authorization testing
const ModulePlaceholder: React.FC<{ name: string }> = ({ name }) => {
  return (
    <Paper className="glass-panel p-6 flex flex-col gap-4 min-h-[400px] justify-center items-center">
      <Typography variant="h4" className="font-bold text-white">
        {name} Module
      </Typography>
      <Typography variant="body1" className="text-slate-400 max-w-md text-center">
        This module is authorized under your role. Full interactive database forms and workflows will be deployed in the upcoming sprints of the development roadmap.
      </Typography>
    </Paper>
  );
};


import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/en-gb';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <CssBaseline />
        <AuthProvider>
          <Router>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Private Gateway Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* ── Core ─────────────────────────────────────────────────── */}
              <Route index element={<Dashboard />} />
              <Route
                path="properties"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/:propertyId/edit"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/:propertyId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="unit-register"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <UnitRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <TitleDeedList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <TitleDeedEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds/:titleDeedId/edit"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <TitleDeedEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds/:titleDeedId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <TitleDeedDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds/:titleDeedId/valuation"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyValuationEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="title-deeds/:titleDeedId/acquisition-cost"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <AcquisitionCostEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="investment-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Administrator']}>
                    <InvestmentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="ownership"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <OwnershipList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="ownership/:id"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <OwnershipDetail />
                  </ProtectedRoute>
                }
              />


              {/* ── Tenancy ──────────────────────────────────────────────── */}
              <Route
                path="tenants-leases"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <TenantList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/tenants"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <TenantList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/tenants/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <TenantEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/tenants/:tenantId/edit"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <TenantEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/tenants/:tenantId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <TenantDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/leases/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LeaseEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/leases/:leaseId/edit"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LeaseEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/leases/:leaseId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LeaseDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="leases"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LeaseList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants-leases/leases"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LeaseList />
                  </ProtectedRoute>
                }
              />
              {/* ── Tenancy & Rentals ────────────────────────────────────── */}
              <Route
                path="pdc/receipts"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <ReceiptList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pdc/receipts/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ReceiptVoucherEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pdc/receipts/:id"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ReceiptDetail />
                  </ProtectedRoute>
                }
              />

              {/* ── PDC (Post-Dated Cheques) ─────────────────────────────── */}
              <Route
                path="pdc/register"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PDCReceivedRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pdc/register/:id"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PDCReceivedDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pdc-issued"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PDCIssuedRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pdc-issued/:id"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PDCIssuedDetail />
                  </ProtectedRoute>
                }
              />


              {/* ── Finance & Expenses ───────────────────────────────────── */}
              <Route
                path="expenses"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ExpenseList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ExpenseEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses/:expenseId/edit"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ExpenseEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses/:expenseId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <ExpenseDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="finance"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <LoanList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="loans"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <LoanList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="loans/:loanId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <LoanDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payment-vouchers"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PaymentVoucherEntry />
                  </ProtectedRoute>
                }
              />

              {/* ── Operations — Maintenance (Sprint 8) ─────────────────── */}
              <Route
                path="maintenance"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator']}>
                    <MaintenanceList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="maintenance/new"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator']}>
                    <MaintenanceTicketEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="maintenance/:ticketId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator']}>
                    <MaintenanceTicketDetail />
                  </ProtectedRoute>
                }
              />

              {/* ── Operations — Labour Camp (Sprint 8) ──────────────────── */}
              <Route
                path="labour-camp"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="labour-camp/residents"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampResidents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="labour-camp/utilities"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampUtilities />
                  </ProtectedRoute>
                }
              />

              {/* ── Labour Camp — Cash Collection (Technical Instruction Sheet Aug 2026) ── */}
              <Route
                path="labour-camp/cash-receipts"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampCashReceipt />
                  </ProtectedRoute>
                }
              />
              <Route
                path="labour-camp/cash-receipts/:receiptId"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampCashReceiptDetail />
                  </ProtectedRoute>
                }
              />

              {/* ── AI ───────────────────────────────────────────────────── */}
              <Route
                path="ai-assistant"
                element={
                  <ProtectedRoute>
                    <AIChat />
                  </ProtectedRoute>
                }
              />

              {/* ── Sprint 9 — Role-Based Dashboards ─────────────────────── */}
              <Route
                path="dashboard/md"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Administrator']}>
                    <MdDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/finance"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <FinanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/property"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Administrator']}>
                    <PropertyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/maintenance"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator']}>
                    <MaintenanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard/labour-camp"
                element={
                  <ProtectedRoute allowedRoles={['Managing Director', 'Camp Supervisor', 'Administrator']}>
                    <LabourCampDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Sprint 9 — Reports Centre ─────────────────────────────── */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute>
                    <ReportCentre />
                  </ProtectedRoute>
                }
              />

              {/* ── Admin — Master Data (Module 15) ───────────────────── */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
                    <MasterDataHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/master/banks"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
                    <BankMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/company-banks"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
                    <CompanyBankMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/master/expense-categories"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director', 'Accountant']}>
                    <ExpenseCategoryMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/approval-limits"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
                    <ApprovalLimits />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/notification-templates"
                element={
                  <ProtectedRoute allowedRoles={['Administrator', 'Managing Director']}>
                    <NotificationTemplates />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
