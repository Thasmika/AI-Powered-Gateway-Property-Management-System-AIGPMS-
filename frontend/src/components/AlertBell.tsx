import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  IconButton, Badge, Popover, Box, Typography, Chip,
  List, ListItem, ListItemText, Divider, Button, Tooltip,
  CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import api from '../services/api';

interface Alert {
  id: number;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: number;
}

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  Critical: { color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)', icon: <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} /> },
  Urgent: { color: '#f97316', bgColor: 'rgba(249,115,22,0.12)', icon: <WarningAmberIcon sx={{ fontSize: 16, color: '#f97316' }} /> },
  Warning: { color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', icon: <WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> },
  Info: { color: '#06b6d4', bgColor: 'rgba(6,182,212,0.10)', icon: <InfoIcon sx={{ fontSize: 16, color: '#06b6d4' }} /> },
};

const getSeverityConfig = (severity: string) =>
  SEVERITY_CONFIG[severity] || SEVERITY_CONFIG['Info'];

const AlertBell: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [dismissing, setDismissing] = useState<number | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts/active');
      const data = res.data;
      setAlerts(Array.isArray(data) ? data : data.alerts || data.items || []);
    } catch {
      // Silently fail — alert bell is non-critical
    }
  }, []);

  // Initial fetch + polling every 60 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchAlerts(); // refresh on open
  };

  const handleClose = () => setAnchorEl(null);

  const handleDismiss = async (alertId: number) => {
    setDismissing(alertId);
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // try alternative dismiss endpoint
      try {
        await api.patch(`/alerts/${alertId}`, { status: 'Dismissed' });
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      } catch {
        // ignore
      }
    } finally {
      setDismissing(null);
    }
  };

  const handleDismissAll = async () => {
    const critical = alerts.filter((a) => a.severity === 'Critical');
    const nonCritical = alerts.filter((a) => a.severity !== 'Critical');
    for (const a of nonCritical) {
      await handleDismiss(a.id);
    }
  };

  const open = Boolean(anchorEl);
  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const urgentCount = alerts.filter((a) => a.severity === 'Urgent').length;
  const badgeCount = alerts.length;

  // Sort: Critical first, then Urgent, then Warning, then Info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { Critical: 0, Urgent: 1, Warning: 2, Info: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <>
      <Tooltip title={badgeCount > 0 ? `${badgeCount} alert${badgeCount !== 1 ? 's' : ''} — ${criticalCount} critical` : 'No active alerts'}>
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{
            color: criticalCount > 0 ? '#ef4444' : badgeCount > 0 ? '#f59e0b' : 'rgba(148,163,184,0.7)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: criticalCount > 0 ? '#fca5a5' : '#f1f5f9' },
            transition: 'color 0.2s',
            position: 'relative',
          }}
        >
          <Badge
            badgeContent={badgeCount || null}
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: criticalCount > 0 ? '#ef4444' : urgentCount > 0 ? '#f97316' : '#f59e0b',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 800,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                animation: criticalCount > 0 ? 'pulse 1.5s infinite' : 'none',
              },
            }}
          >
            {badgeCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: 20, animation: criticalCount > 0 ? 'pulse 1.5s infinite' : 'none' }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: 20 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(15,23,42,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            width: 380,
            maxHeight: 520,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem' }}>
                Alerts
              </Typography>
              {badgeCount > 0 && (
                <Chip
                  label={`${badgeCount} Active`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: criticalCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: criticalCount > 0 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}
                />
              )}
            </Box>
            <Box display="flex" gap={1}>
              {alerts.filter((a) => a.severity !== 'Critical').length > 0 && (
                <Button size="small" onClick={handleDismissAll}
                  sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.7rem', '&:hover': { color: '#e2e8f0' }, p: 0, minWidth: 'auto' }}>
                  Dismiss non-critical
                </Button>
              )}
              <Button
                size="small"
                component={Link}
                to="/ai-assistant"
                onClick={handleClose}
                sx={{ color: '#6366f1', fontSize: '0.7rem', '&:hover': { color: '#818cf8' }, p: 0, minWidth: 'auto' }}
              >
                Ask AI →
              </Button>
            </Box>
          </Box>

          {/* Severity summary pills */}
          {badgeCount > 0 && (
            <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
              {criticalCount > 0 && <Chip label={`${criticalCount} Critical`} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }} />}
              {urgentCount > 0 && <Chip label={`${urgentCount} Urgent`} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(249,115,22,0.15)', color: '#f97316', fontWeight: 700 }} />}
              {alerts.filter((a) => a.severity === 'Warning').length > 0 && <Chip label={`${alerts.filter((a) => a.severity === 'Warning').length} Warning`} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }} />}
            </Box>
          )}
        </Box>

        {/* Alert List */}
        <Box sx={{ overflowY: 'auto', maxHeight: 380 }}>
          {sortedAlerts.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} gap={2}>
              <CheckIcon sx={{ fontSize: 40, color: '#22c55e', opacity: 0.7 }} />
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.5)', textAlign: 'center' }}>
                No active alerts.<br />All systems normal.
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {sortedAlerts.map((alert, idx) => {
                const cfg = getSeverityConfig(alert.severity);
                return (
                  <React.Fragment key={alert.id}>
                    <ListItem
                      disableGutters
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        alignItems: 'flex-start',
                        bgcolor: cfg.bgColor,
                        borderLeft: `3px solid ${cfg.color}`,
                        transition: 'opacity 0.2s',
                        opacity: dismissing === alert.id ? 0.4 : 1,
                      }}
                    >
                      <Box sx={{ mr: 1.5, mt: 0.2 }}>{cfg.icon}</Box>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                            <Box flex={1}>
                              <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block' }}>
                                {alert.severity} · {alert.alert_type?.replace(/_/g, ' ') || 'System'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem', mt: 0.2, lineHeight: 1.4 }}>
                                {alert.title || alert.message}
                              </Typography>
                              {alert.title && alert.message && alert.title !== alert.message && (
                                <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.72rem', mt: 0.3, display: 'block', lineHeight: 1.4 }}>
                                  {alert.message}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                                {alert.created_at ? new Date(alert.created_at).toLocaleString('en-AE') : ''}
                              </Typography>
                            </Box>
                            <Tooltip title="Dismiss">
                              <IconButton
                                size="small"
                                onClick={() => handleDismiss(alert.id)}
                                disabled={dismissing === alert.id}
                                sx={{ color: 'rgba(148,163,184,0.4)', '&:hover': { color: '#e2e8f0', bgcolor: 'rgba(255,255,255,0.06)' }, mt: -0.5, width: 24, height: 24 }}
                              >
                                {dismissing === alert.id ? (
                                  <CircularProgress size={12} sx={{ color: 'rgba(148,163,184,0.4)' }} />
                                ) : (
                                  <CheckIcon sx={{ fontSize: 14 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                        disableTypography
                      />
                    </ListItem>
                    {idx < sortedAlerts.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default AlertBell;
