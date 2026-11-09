import React from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActionArea,
  Chip, Avatar, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CategoryIcon from '@mui/icons-material/Category';
import BuildIcon from '@mui/icons-material/Build';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';

const masterModules = [
  {
    title: 'Banks',
    subtitle: 'UAE banking institutions',
    icon: <AccountBalanceIcon sx={{ fontSize: 36 }} />,
    path: '/admin/master/banks',
    color: '#6366f1',
    tag: 'Lookups',
  },
  {
    title: 'Company Bank Accounts',
    subtitle: 'Internal accounts for PDC issuance',
    icon: <AccountBalanceIcon sx={{ fontSize: 36 }} />,
    path: '/admin/company-banks',
    color: '#10b981',
    tag: 'Finance',
  },
  {
    title: 'Expense Categories',
    subtitle: 'General & Property expense types',
    icon: <CategoryIcon sx={{ fontSize: 36 }} />,
    path: '/admin/master/expense-categories',
    color: '#f59e0b',
    tag: 'Finance',
  },
  {
    title: 'Maintenance Categories',
    subtitle: 'Repair & maintenance types with SLA',
    icon: <BuildIcon sx={{ fontSize: 36 }} />,
    path: '/admin/master/maintenance-categories',
    color: '#10b981',
    tag: 'Operations',
  },
  {
    title: 'Payment Methods',
    subtitle: 'Cheque, transfer, cash etc.',
    icon: <PaymentIcon sx={{ fontSize: 36 }} />,
    path: '/admin/master/payment-methods',
    color: '#06b6d4',
    tag: 'Finance',
  },
  {
    title: 'Approval Limits',
    subtitle: 'Role-based financial thresholds',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 36 }} />,
    path: '/admin/approval-limits',
    color: '#ef4444',
    tag: 'Config',
  },
  {
    title: 'Notification Templates',
    subtitle: 'Alert message configuration',
    icon: <NotificationsActiveIcon sx={{ fontSize: 36 }} />,
    path: '/admin/notification-templates',
    color: '#8b5cf6',
    tag: 'Alerts',
  },
  {
    title: 'AI Prompt Templates',
    subtitle: 'PM AI query suggestions',
    icon: <PsychologyIcon sx={{ fontSize: 36 }} />,
    path: '/admin/master/ai-prompts',
    color: '#ec4899',
    tag: 'AI',
  },
];

const MasterDataHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ bgcolor: '#6366f1', width: 48, height: 48 }}>
            <SettingsIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
              Master Data Hub
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Module 15 — System Configuration &amp; Reference Data
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
      </Box>

      {/* Info Banner */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 2,
          p: 3,
          mb: 4,
        }}
      >
        <Typography variant="body1" sx={{ color: 'white', fontWeight: 500 }}>
          All module dropdowns — Banks, Property Types, Communities, Expense Categories, Payment Methods —
          pull from this master data. Changes here take effect immediately across the entire system.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Administrator / Managing Director</strong> access required for edit operations.
        </Typography>
      </Paper>

      {/* Module Cards */}
      <Grid container spacing={3}>
        {masterModules.map((mod) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={mod.title}>
            <Card
              elevation={0}
              sx={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${mod.color}40`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${mod.color}20`,
                },
              }}
            >
              <CardActionArea onClick={() => navigate(mod.path)} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: `${mod.color}20`, color: mod.color, width: 56, height: 56 }}>
                      {mod.icon}
                    </Avatar>
                    <Chip
                      label={mod.tag}
                      size="small"
                      sx={{
                        bgcolor: `${mod.color}20`,
                        color: mod.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                      }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                    {mod.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mod.subtitle}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats Footer */}
      <Paper
        elevation={0}
        sx={{
          mt: 4,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          MASTER DATA SCOPE
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {[
            { label: 'UAE Banks', value: '20' },
            { label: 'Emirates', value: '7' },
            { label: 'Communities', value: '28' },
            { label: 'Property Types', value: '14' },
            { label: 'Expense Categories', value: '31' },
            { label: 'Payment Methods', value: '8' },
            { label: 'Alert Templates', value: '11' },
            { label: 'AI Prompts', value: '15' },
          ].map((stat) => (
            <Grid size="auto" key={stat.label}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }} color="primary.light">
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default MasterDataHub;
