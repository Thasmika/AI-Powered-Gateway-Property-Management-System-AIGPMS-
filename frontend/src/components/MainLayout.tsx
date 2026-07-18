import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GavelIcon from '@mui/icons-material/Gavel';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConstructionIcon from '@mui/icons-material/Construction';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DomainIcon from '@mui/icons-material/Domain';
import ChatIcon from '@mui/icons-material/Chat';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';        // Title Deed
import MoneyOffIcon from '@mui/icons-material/MoneyOff';            // PDC Received
import PaymentIcon from '@mui/icons-material/Payment';              // PDC Issued
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';    // Expenses
import SettingsIcon from '@mui/icons-material/Settings';              // Admin

const drawerWidth = 260;

const MainLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  // Define sidebar navigation items based on roles
  const getNavItems = () => {
    const items = [
      // ── Core ─────────────────────────────────────────────────────────────
      { text: 'Dashboard',             icon: <DashboardIcon />,            path: '/',              roles: ['Managing Director', 'Accountant', 'Camp Supervisor', 'Maintenance Staff', 'Administrator'] },
      { text: 'Property Master',        icon: <ApartmentIcon />,            path: '/properties',    roles: ['Managing Director', 'Accountant', 'Administrator'] },
      { text: 'Title Deeds',            icon: <AssignmentIcon />,           path: '/title-deeds',   roles: ['Managing Director', 'Accountant', 'Administrator'] },
      { text: 'Investment Dashboard',   icon: <ShowChartIcon />,            path: '/investment-dashboard', roles: ['Managing Director', 'Administrator'] },
      { text: 'Ownership',              icon: <GavelIcon />,                path: '/ownership',     roles: ['Managing Director', 'Accountant', 'Administrator'] },
      // ── Tenancy ──────────────────────────────────────────────────────────
      { text: 'Tenants & Leases',       icon: <PeopleIcon />,               path: '/tenants-leases', roles: ['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator'] },
      { text: 'Rental Collection',      icon: <ReceiptIcon />,              path: '/rentals',       roles: ['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator'] },
      // ── PDC ──────────────────────────────────────────────────────────────
      { text: 'PDC Received',           icon: <MoneyOffIcon />,             path: '/pdc-received',  roles: ['Managing Director', 'Accountant', 'Administrator'] },
      { text: 'PDC Issued',             icon: <PaymentIcon />,              path: '/pdc-issued',    roles: ['Managing Director', 'Accountant', 'Administrator'] },
      // ── Finance ──────────────────────────────────────────────────────────
      { text: 'Expenses',               icon: <RequestQuoteIcon />,         path: '/expenses',      roles: ['Managing Director', 'Accountant', 'Administrator'] },
      { text: 'Finance & Vouchers',     icon: <AccountBalanceWalletIcon />, path: '/finance',       roles: ['Managing Director', 'Accountant', 'Administrator'] },
      // ── Operations ───────────────────────────────────────────────────────
      { text: 'Maintenance',            icon: <ConstructionIcon />,         path: '/maintenance',   roles: ['Managing Director', 'Accountant', 'Maintenance Staff', 'Administrator'] },
      { text: 'Labour Camp',            icon: <DomainIcon />,               path: '/labour-camp',   roles: ['Managing Director', 'Accountant', 'Camp Supervisor', 'Administrator'] },
      // ── AI ───────────────────────────────────────────────────────────────
      { text: 'AI Assistant',           icon: <ChatIcon />,                 path: '/ai-assistant',  roles: ['Managing Director', 'Accountant', 'Camp Supervisor', 'Maintenance Staff', 'Administrator'] },
      // ── Admin ────────────────────────────────────────────────────────────
      { text: 'System Admin',           icon: <SettingsIcon />,             path: '/admin',         roles: ['Administrator', 'Managing Director'] },
    ];

    return items.filter(item => role && item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0f172a' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        }}
      >
        <Toolbar className="flex justify-between items-center px-4">
          <Box className="flex items-center gap-2">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <ApartmentIcon sx={{ color: '#6366f1', fontSize: 28 }} />
            <Typography variant="h6" noWrap className="font-extrabold tracking-tight text-white">
              AIGPMS
            </Typography>
            <Chip
              label="Enterprise Gateway"
              size="small"
              className="bg-indigo-950 text-indigo-300 border border-indigo-900 ml-2 hidden sm:inline-flex"
            />
          </Box>

          {/* User profile actions */}
          <Box className="flex items-center gap-4">
            <IconButton color="inherit" className="relative hover:bg-white/5">
              <NotificationsIcon />
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-[#0f172a]"></span>
            </IconButton>

            <Box className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded-lg" onClick={handleProfileMenuOpen}>
              <Avatar
                sx={{
                  bgcolor: '#6366f1',
                  color: '#ffffff',
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user?.full_name.charAt(0)}
              </Avatar>
              <Box className="hidden md:flex flex-col text-left leading-none">
                <Typography variant="body2" className="font-bold text-slate-200">
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" className="text-indigo-400 font-semibold">
                  {role}
                </Typography>
              </Box>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              slotProps={{
                paper: {
                  className: 'glass-panel border border-white/10 mt-2 shadow-xl min-w-[180px]',
                  style: { backgroundColor: '#1e293b' }
                }
              }}
            >
              <MenuItem disabled className="text-slate-400 font-semibold border-b border-white/5 pb-2 text-xs">
                SIGNED IN AS
                <span className="block font-bold text-slate-200">{user?.email}</span>
              </MenuItem>
              <MenuItem onClick={handleProfileMenuClose} className="flex gap-2 text-slate-200 text-sm hover:bg-white/5 mt-1">
                <AccountCircleIcon sx={{ fontSize: 18 }} /> Profile Settings
              </MenuItem>
              <MenuItem onClick={handleLogout} className="flex gap-2 text-red-400 text-sm hover:bg-red-950/20">
                <LogoutIcon sx={{ fontSize: 18 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 70,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 70,
            boxSizing: 'border-box',
            backgroundColor: '#0f172a',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            transition: 'width 225ms cubic-bezier(0.4, 0, 0.6, 1)',
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', pb: 2 }}>
          <List className="px-2 flex flex-col gap-1 mt-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.text}
                  component={Link}
                  to={item.path}
                  className={`rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? '#ffffff' : '#64748b',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText>
                      <span className="font-semibold text-sm">
                        {item.text}
                      </span>
                    </ListItemText>
                  )}
                </ListItemButton>
              );
            })}
          </List>

          {/* Sidebar Collapse Action */}
          {open && (
            <Box className="px-4 py-2 bg-slate-900/40 border border-white/5 rounded-xl mx-3 flex flex-col gap-1">
              <Typography variant="caption" className="text-slate-400 block">SYSTEM STATUS</Typography>
              <Box className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Typography variant="caption" className="text-emerald-400 font-semibold">Online & Secure</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1 }} className="text-slate-200">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
