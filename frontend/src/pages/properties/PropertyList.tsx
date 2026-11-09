import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Avatar, Alert,
  IconButton, Tooltip, Grid, LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DomainIcon from "@mui/icons-material/Domain";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LockIcon from "@mui/icons-material/Lock";
import ConstructionIcon from "@mui/icons-material/Construction";
import SquareFootIcon from "@mui/icons-material/SquareFoot";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PdfExportButton from '../../components/PdfExportButton';

interface PropertyUnit {
  unit_id: string;
  unit_number: string;
  status: string;
  area_sqm: number | null;
  unit_type: string | null;
}

interface Property {
  property_id: string;
  property_code: string;
  property_name: string;
  property_type: string | null;
  community: string | null;
  emirate: string | null;
  status: string;
  total_area_sqm: number | null;
  units?: PropertyUnit[];
}

interface Summary {
  totalProperties: number;
  activeProperties: number;
  underConstruction: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
  totalAreaSqm: number;
  byType: Record<string, number>;
  lastUpdated: Date;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

/* Stat card ---------------------------------------------------------------- */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subLabel?: string;
  progress?: number;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subLabel, progress, loading }) => (
  <Paper elevation={0} sx={{
    p: 2.5,
    background: `linear-gradient(135deg, ${color}18 0%, rgba(15,23,42,0.9) 100%)`,
    border: `1px solid ${color}30`,
    borderRadius: 2.5,
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 32px ${color}25` },
  }}>
    <Box sx={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${color}15`, filter: "blur(20px)" }} />
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <Box>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.65rem" }}>
          {label}
        </Typography>
        {loading ? (
          <Box sx={{ mt: 1 }}><CircularProgress size={20} sx={{ color }} /></Box>
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 800, color: "white", lineHeight: 1.2, mt: 0.5 }}>
            {value}
          </Typography>
        )}
        {subLabel && (
          <Typography variant="caption" sx={{ color: `${color}cc`, fontSize: "0.7rem", mt: 0.25, display: "block" }}>
            {subLabel}
          </Typography>
        )}
      </Box>
      <Avatar sx={{ bgcolor: `${color}20`, color, width: 42, height: 42 }}>{icon}</Avatar>
    </Box>
    {progress !== undefined && (
      <Box sx={{ mt: 1.5 }}>
        <LinearProgress variant="determinate" value={progress} sx={{
          height: 4, borderRadius: 2,
          bgcolor: `${color}20`,
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 2 },
        }} />
      </Box>
    )}
  </Paper>
);

/* Main -------------------------------------------------------------------- */
const PropertyList: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedProperties, setDetailedProperties] = useState<Property[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/properties`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load properties");
      setProperties(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchDetailedSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const listRes = await fetch(`${API}/properties`, { headers: authHeaders });
      if (!listRes.ok) return;
      const list: Property[] = await listRes.json();
      const details = await Promise.all(
        list.map(async (p) => {
          try {
            const dRes = await fetch(`${API}/properties/${p.property_id}`, { headers: authHeaders });
            if (dRes.ok) return await dRes.json();
          } catch { /* ignore */ }
          return p;
        })
      );
      setDetailedProperties(details);
      setLastRefresh(new Date());
    } finally { setSummaryLoading(false); }
  }, [authHeaders]);

  useEffect(() => {
    fetchProperties();
    fetchDetailedSummary();
  }, [fetchProperties, fetchDetailedSummary]);

  useEffect(() => {
    const timer = setInterval(() => fetchDetailedSummary(), 30_000);
    return () => clearInterval(timer);
  }, [fetchDetailedSummary]);

  const summary: Summary = useMemo(() => {
    const allUnits = detailedProperties.flatMap((p) => p.units ?? []);
    const occupied  = allUnits.filter((u) => u.status === "Occupied").length;
    const vacant    = allUnits.filter((u) => u.status === "Vacant").length;
    const maint     = allUnits.filter((u) => u.status === "Maintenance").length;
    const totalU    = allUnits.length;
    const totalArea = detailedProperties.reduce((acc, p) => acc + (Number(p.total_area_sqm) || 0), 0);
    const byType: Record<string, number> = {};
    detailedProperties.forEach((p) => {
      const t = p.property_type || "Other";
      byType[t] = (byType[t] ?? 0) + 1;
    });
    return {
      totalProperties: detailedProperties.length,
      activeProperties: detailedProperties.filter((p) => p.status === "Active").length,
      underConstruction: detailedProperties.filter((p) => p.status === "Under Construction").length,
      totalUnits: totalU, occupiedUnits: occupied, vacantUnits: vacant, maintenanceUnits: maint,
      occupancyRate: totalU > 0 ? Math.round((occupied / totalU) * 100) : 0,
      totalAreaSqm: totalArea, byType, lastUpdated: lastRefresh,
    };
  }, [detailedProperties, lastRefresh]);

  const handleDelete = async (propertyId: string) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      const res = await fetch(`${API}/properties/${propertyId}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to delete property"); }
      fetchProperties(); fetchDetailedSummary();
    } catch (e: any) { setError(e.message); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return { bg: "rgba(16,185,129,0.15)", text: "#10b981" };
      case "Inactive": return { bg: "rgba(100,116,139,0.15)", text: "#64748b" };
      case "Under Construction": return { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" };
      default: return { bg: "rgba(255,255,255,0.1)", text: "white" };
    }
  };

  const fmtArea = (n: number) => {
    if (!n) return '0 sqm';
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M sqm`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K sqm`
    : `${n} sqm`;
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "#6366f120", color: "#6366f1", width: 48, height: 48 }}><DomainIcon /></Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "white" }}>Properties Master</Typography>
            <Typography variant="body2" color="text.secondary">{properties.length} properties registered</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title={`Last updated: ${summary.lastUpdated.toLocaleTimeString()}`}>
            <IconButton onClick={() => { fetchProperties(); fetchDetailedSummary(); }} disabled={summaryLoading}
              sx={{ color: summaryLoading ? "text.disabled" : "#6366f1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 1.5 }}>
              <RefreshIcon fontSize="small" sx={{
                animation: summaryLoading ? "spin 1s linear infinite" : "none",
                "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
              }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PdfExportButton title="Properties Master" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/properties/new")}
            sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}>
            Add Property
          </Button>
          </Box>
        </Box>
      </Box>

      {/* Real-time Summary */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <TrendingUpIcon sx={{ color: "#6366f1", fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.72rem" }}>
            Live Portfolio Summary
          </Typography>
          {summaryLoading && <CircularProgress size={12} sx={{ color: "#6366f1" }} />}
          {!summaryLoading && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.62rem" }}>
              · updated {summary.lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        {/* Row 1 — Property level */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid xs={6} sm={3}>
            <StatCard label="Total Properties" value={summary.totalProperties} icon={<DomainIcon fontSize="small" />}
              color="#6366f1" subLabel={`${summary.activeProperties} active`} loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Active Properties" value={summary.activeProperties} icon={<CheckCircleIcon fontSize="small" />}
              color="#10b981"
              subLabel={summary.totalProperties > 0 ? `${Math.round((summary.activeProperties / summary.totalProperties) * 100)}% of total` : "—"}
              progress={summary.totalProperties > 0 ? (summary.activeProperties / summary.totalProperties) * 100 : 0}
              loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Under Construction" value={summary.underConstruction} icon={<ConstructionIcon fontSize="small" />}
              color="#f59e0b" subLabel="properties" loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Total Area" value={summary.totalAreaSqm > 0 ? fmtArea(summary.totalAreaSqm) : "—"}
              icon={<SquareFootIcon fontSize="small" />} color="#8b5cf6" subLabel="combined portfolio" loading={summaryLoading} />
          </Grid>
        </Grid>

        {/* Row 2 — Unit level */}
        <Grid container spacing={2}>
          <Grid xs={6} sm={3}>
            <StatCard label="Total Units" value={summary.totalUnits} icon={<ApartmentIcon fontSize="small" />}
              color="#6366f1" subLabel="across all properties" loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Occupied Units" value={summary.occupiedUnits} icon={<LockIcon fontSize="small" />}
              color="#10b981" subLabel={`${summary.occupancyRate}% occupancy rate`} progress={summary.occupancyRate} loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Vacant Units" value={summary.vacantUnits} icon={<MeetingRoomIcon fontSize="small" />}
              color="#f59e0b"
              subLabel={summary.totalUnits > 0 ? `${Math.round((summary.vacantUnits / summary.totalUnits) * 100)}% of units` : "—"}
              progress={summary.totalUnits > 0 ? (summary.vacantUnits / summary.totalUnits) * 100 : 0}
              loading={summaryLoading} />
          </Grid>
          <Grid xs={6} sm={3}>
            <StatCard label="Under Maintenance" value={summary.maintenanceUnits} icon={<ConstructionIcon fontSize="small" />}
              color="#ef4444"
              subLabel={summary.totalUnits > 0 ? `${Math.round((summary.maintenanceUnits / summary.totalUnits) * 100)}% of units` : "—"}
              loading={summaryLoading} />
          </Grid>
        </Grid>

        {/* Row 3 — Type breakdown + occupancy gauge */}
        {!summaryLoading && Object.keys(summary.byType).length > 0 && (
          <Paper elevation={0} sx={{
            mt: 2, p: 2,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 2,
            display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap",
          }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, fontSize: "0.65rem", minWidth: 100 }}>
              By Property Type
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", flex: 1 }}>
              {Object.entries(summary.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = summary.totalProperties > 0 ? Math.round((count / summary.totalProperties) * 100) : 0;
                return (
                  <Box key={type} sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(99,102,241,0.08)", borderRadius: 1.5, px: 1.5, py: 0.6, border: "1px solid rgba(99,102,241,0.2)" }}>
                    <Typography variant="caption" sx={{ color: "#a5b4fc", fontWeight: 600, fontSize: "0.72rem" }}>{type}</Typography>
                    <Chip label={`${count} · ${pct}%`} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "rgba(99,102,241,0.2)", color: "#c7d2fe" }} />
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>OCCUPANCY</Typography>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress variant="determinate" value={summary.occupancyRate} size={52} thickness={5}
                  sx={{ color: summary.occupancyRate >= 80 ? "#10b981" : summary.occupancyRate >= 50 ? "#f59e0b" : "#ef4444" }} />
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "white", fontSize: "0.68rem" }}>
                    {summary.occupancyRate}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Property Table */}
      <Paper elevation={0} sx={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { borderColor: "rgba(255,255,255,0.06)", color: "text.secondary", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" } }}>
                <TableCell>Code</TableCell>
                <TableCell>Property Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : properties.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>No properties found.</TableCell></TableRow>
              ) : (
                properties.map((prop) => {
                  const sc = getStatusColor(prop.status);
                  return (
                    <TableRow key={prop.property_id} sx={{ "& td": { borderColor: "rgba(255,255,255,0.04)" }, "&:hover": { background: "rgba(255,255,255,0.02)" } }}>
                      <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>{prop.property_code}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: "white" }}>{prop.property_name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{prop.property_type || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{prop.community ? `${prop.community}, ${prop.emirate}` : (prop.emirate || "—")}</Typography></TableCell>
                      <TableCell>
                        <Chip label={prop.status} size="small" sx={{ bgcolor: sc.bg, color: sc.text, fontWeight: 600, fontSize: "0.7rem" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/properties/${prop.property_id}`)} sx={{ color: "#6366f1" }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/properties/${prop.property_id}/edit`)} sx={{ color: "text.secondary", "&:hover": { color: "white" } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(prop.property_id)} sx={{ color: "text.secondary", "&:hover": { color: "#ef4444" } }}>
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
    </Box>
  );
};

export default PropertyList;

