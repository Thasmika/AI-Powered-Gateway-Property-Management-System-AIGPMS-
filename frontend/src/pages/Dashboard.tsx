import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Card,
  Typography,
  Box,
  Divider,
  Paper,
  Button,
  Chip
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ShieldIcon from '@mui/icons-material/Shield';
import ChatIcon from '@mui/icons-material/Chat';
import HeroCarousel from '../components/dashboard/HeroCarousel';
import PhotoWall from '../components/dashboard/PhotoWall';

const Dashboard: React.FC = () => {
  const { user, role } = useAuth();

  // Helper to render role-specific dashboard content
  const renderDashboardStats = () => {
    switch (role) {
      case 'Managing Director':
        return (
          <>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2 relative overflow-hidden">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Total Properties</Typography>
                <Typography variant="h3" className="font-extrabold text-white">150</Typography>
                <div className="text-emerald-400 text-xs flex items-center gap-1"><TrendingUpIcon sx={{ fontSize: 14 }} /> +2.5% vs last month</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Occupancy Rate</Typography>
                <Typography variant="h3" className="font-extrabold text-white">92%</Typography>
                <div className="text-slate-400 text-xs">138 Occupied / 12 Vacant</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Monthly Rent Income</Typography>
                <Typography variant="h3" className="font-extrabold text-white">AED 450K</Typography>
                <div className="text-emerald-400 text-xs flex items-center gap-1"><TrendingUpIcon sx={{ fontSize: 14 }} /> +8.0% vs target</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Outstanding Rent</Typography>
                <Typography variant="h3" className="font-extrabold text-red-400">AED 50K</Typography>
                <div className="text-red-400 text-xs">3 Tenants Overdue</div>
              </Card>
            </div>
          </>
        );
      case 'Accountant':
        return (
          <>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Rent Collected</Typography>
                <Typography variant="h3" className="font-extrabold text-white">AED 400K</Typography>
                <div className="text-emerald-400 text-xs">90% of total expected</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Pending Allocations</Typography>
                <Typography variant="h3" className="font-extrabold text-yellow-400">AED 15K</Typography>
                <div className="text-slate-400 text-xs">2 Receipts awaiting allocation</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Open Payment Vouchers</Typography>
                <Typography variant="h3" className="font-extrabold text-white">8</Typography>
                <div className="text-indigo-400 text-xs">Awaiting MD Approval</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Reconciliation Status</Typography>
                <Typography variant="h3" className="font-extrabold text-emerald-400">98.2%</Typography>
                <div className="text-emerald-400 text-xs">Matched with Bank Feed</div>
              </Card>
            </div>
          </>
        );
      case 'Camp Supervisor':
        return (
          <>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Total Camp Capacity</Typography>
                <Typography variant="h3" className="font-extrabold text-white">2,000</Typography>
                <div className="text-slate-400 text-xs">Beds across 5 building zones</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Occupied Beds</Typography>
                <Typography variant="h3" className="font-extrabold text-white">1,750</Typography>
                <div className="text-emerald-400 text-xs">87.5% Occupancy Rate</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Available Beds</Typography>
                <Typography variant="h3" className="font-extrabold text-cyan-400">250</Typography>
                <div className="text-cyan-400 text-xs">Ready for allocation</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Pending Handovers</Typography>
                <Typography variant="h3" className="font-extrabold text-yellow-400">1</Typography>
                <div className="text-slate-400 text-xs">Weekly collection awaiting approval</div>
              </Card>
            </div>
          </>
        );
      case 'Maintenance Staff':
        return (
          <>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Assigned Tickets</Typography>
                <Typography variant="h3" className="font-extrabold text-yellow-400">12</Typography>
                <div className="text-red-400 text-xs font-bold">3 High Priority</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Completed Today</Typography>
                <Typography variant="h3" className="font-extrabold text-white">4</Typography>
                <div className="text-emerald-400 text-xs">Avg resolution time: 3 hours</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Warranties Monitored</Typography>
                <Typography variant="h3" className="font-extrabold text-white">85</Typography>
                <div className="text-indigo-400 text-xs">Assets with active warranty</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Pending Inspections</Typography>
                <Typography variant="h3" className="font-extrabold text-white">2</Typography>
                <div className="text-slate-400 text-xs">Assigned for survey</div>
              </Card>
            </div>
          </>
        );
      default:
        return (
          <>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Active Users</Typography>
                <Typography variant="h3" className="font-extrabold text-white">14</Typography>
                <div className="text-slate-400 text-xs">Online accounts: 6</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Audit Logs Generated</Typography>
                <Typography variant="h3" className="font-extrabold text-white">245</Typography>
                <div className="text-slate-400 text-xs">Security events tracked</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">Database Engine</Typography>
                <Typography variant="h3" className="font-extrabold text-cyan-400">Postgres</Typography>
                <div className="text-cyan-400 text-xs">Status: Active & Stable</div>
              </Card>
            </div>
            <div>
              <Card className="glass-panel p-4 flex flex-col gap-2">
                <Typography variant="body2" className="text-slate-400 font-semibold uppercase tracking-wider text-xs">AI Service Status</Typography>
                <Typography variant="h3" className="font-extrabold text-emerald-400">Ready</Typography>
                <div className="text-emerald-400 text-xs">RAG Models loaded</div>
              </Card>
            </div>
          </>
        );
    }
  };

  return (
    <Box className="flex flex-col gap-6">
      <HeroCarousel user={user} role={role} />
      <PhotoWall />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {renderDashboardStats()}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Quick Actions */}
        <div>
          <Paper className="glass-panel p-6 flex flex-col gap-4 min-h-[300px]">
            <Typography variant="h6" className="font-bold text-white flex items-center gap-2">
              <ShieldIcon className="text-indigo-500" />
              Role Permissions & Boundaries
            </Typography>
            <Divider />
            
            <Typography variant="body2" className="text-slate-400 leading-relaxed">
              As a **{role}**, the AIGPMS security gateway permits you to perform operations defined under your business context:
            </Typography>

            <Box className="flex flex-col gap-3 mt-2">
              <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5 flex items-start gap-3">
                <ApartmentIcon className="text-slate-400 mt-0.5" />
                <div>
                  <Typography variant="subtitle2" className="font-semibold text-slate-200">Properties & Leases</Typography>
                  <Typography variant="caption" className="text-slate-400">
                    {role === 'Managing Director' || role === 'Accountant' || role === 'Administrator' 
                      ? 'Authorized to create, edit property details and lease agreements.' 
                      : 'Read-only access, or restricted entirely based on role settings.'}
                  </Typography>
                </div>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5 flex items-start gap-3">
                <ReceiptIcon className="text-slate-400 mt-0.5" />
                <div>
                  <Typography variant="subtitle2" className="font-semibold text-slate-200">Financial Records</Typography>
                  <Typography variant="caption" className="text-slate-400">
                    {role === 'Managing Director' || role === 'Accountant' 
                      ? 'Full verification of deposits, collections, and approvals.' 
                      : 'Access strictly restricted to preserve financial confidentiality.'}
                  </Typography>
                </div>
              </div>
            </Box>
          </Paper>
        </div>

        {/* Right column: Recent Activity (Mocked logs) */}
        <div>
          <Paper className="glass-panel p-6 flex flex-col gap-4 min-h-[300px]">
            <Typography variant="h6" className="font-bold text-white">
              Recent System Activity
            </Typography>
            <Divider />

            <Box className="flex flex-col gap-4">
              <div className="flex justify-between items-start gap-2 text-sm">
                <Box>
                  <Typography variant="body2" className="font-semibold text-slate-300">Default users database seeded</Typography>
                  <Typography variant="caption" className="text-slate-500">System Admin initialized roles</Typography>
                </Box>
                <Chip label="Seeding" size="small" className="bg-slate-900 text-slate-400 text-[10px]" />
              </div>
              <div className="flex justify-between items-start gap-2 text-sm">
                <Box>
                  <Typography variant="body2" className="font-semibold text-slate-300">JWT Token Auth verified</Typography>
                  <Typography variant="caption" className="text-slate-500">Secure session established successfully</Typography>
                </Box>
                <Chip label="Security" size="small" className="bg-indigo-950 text-indigo-400 text-[10px]" />
              </div>
              <div className="flex justify-between items-start gap-2 text-sm">
                <Box>
                  <Typography variant="body2" className="font-semibold text-slate-300">FastAPI backend running</Typography>
                  <Typography variant="caption" className="text-slate-500">API gateway listening on port 8000</Typography>
                </Box>
                <Chip label="Core" size="small" className="bg-cyan-950 text-cyan-400 text-[10px]" />
              </div>
            </Box>
          </Paper>
        </div>
      </div>
    </Box>
  );
};

export default Dashboard;
