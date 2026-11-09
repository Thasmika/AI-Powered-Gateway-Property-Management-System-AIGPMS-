import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { formatDateTime } from "../../utils/dateUtils";
import {
  Box, Typography, Paper, Grid, Stack, Button, Chip, Divider,
  TextField, CircularProgress, Snackbar, Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PdfExportButton from '../../components/PdfExportButton';

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "white",
    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#6366f1" },
  },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#a5b4fc" },
  "& input[type=date]::-webkit-calendar-picker-indicator": { filter: "invert(1)" },
};

const statusColors: Record<string, string> = {
  Received: "#0ea5e9",
  Held: "#64748b",
  "Due Soon": "#f59e0b",
  Overdue: "#dc2626",
  Deposited: "#0ea5e9",
  Cleared: "#10b981",
  Returned: "#ef4444",
  Replaced: "#f59e0b",
  Cancelled: "#ef4444",
};

const ReadField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.disabled" textTransform="uppercase" letterSpacing={0.8} fontSize={10} fontWeight={600}>
      {label}
    </Typography>
    <Typography variant="body2" color="white" fontWeight={600} mt={0.3}>
      {value || "—"}
    </Typography>
  </Box>
);

const PDCReceivedDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pdc, setPdc] = useState<any>(null);
  const [action, setAction] = useState<string>("");
  const [actionData, setActionData] = useState<any>({});
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchPdc = async () => {
    try {
      const response = await api.get(`/pdc-received/${id}`);
      setPdc(response.data);
    } catch (error) {
      console.error("Failed to fetch PDC", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await api.get("/pdc-issued/bank-accounts");
      setBankAccounts(response.data);
    } catch (error) {
      console.error("Failed to fetch bank accounts", error);
    }
  };

  useEffect(() => {
    fetchPdc();
    fetchBankAccounts();
  }, [id]);

  const handleEditOpen = () => {
    setEditForm({
      cheque_number: pdc.cheque_number || "",
      bank_name: pdc.bank_name || "",
      account_holder: pdc.account_holder || "",
      cheque_date: pdc.cheque_date ? String(pdc.cheque_date).substring(0, 10) : "",
      cheque_amount: pdc.cheque_amount != null ? String(pdc.cheque_amount) : "",
      rental_period_from: pdc.rental_period_from ? String(pdc.rental_period_from).substring(0, 10) : "",
      rental_period_to: pdc.rental_period_to ? String(pdc.rental_period_to).substring(0, 10) : "",
      current_cheque_location: pdc.current_cheque_location || "",
      remarks: pdc.remarks || "",
    });
    setEditMode(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      // Build a clean payload — only send fields that are not blank strings for
      // required fields; convert optional date empty strings to null.
      const payload: Record<string, any> = {};

      if (editForm.cheque_number?.trim()) payload.cheque_number = editForm.cheque_number.trim();
      if (editForm.bank_name?.trim()) payload.bank_name = editForm.bank_name.trim();
      payload.account_holder = editForm.account_holder?.trim() || null;
      payload.cheque_date = editForm.cheque_date || null;
      payload.rental_period_from = editForm.rental_period_from || null;
      payload.rental_period_to = editForm.rental_period_to || null;
      payload.current_cheque_location = editForm.current_cheque_location?.trim() || null;
      payload.remarks = editForm.remarks?.trim() || null;

      // cheque_amount: send only if non-empty and numeric
      if (editForm.cheque_amount !== "" && editForm.cheque_amount != null) {
        const parsed = parseFloat(String(editForm.cheque_amount));
        if (!isNaN(parsed)) payload.cheque_amount = parsed;
      }

      // The PUT endpoint returns the full updated PDC — use it directly so the
      // UI immediately reflects the new values without a second round-trip.
      const response = await api.put(`/pdc-received/${id}`, payload);
      setPdc(response.data);        // ← update state immediately from response
      setEditMode(false);
      setSaveSuccess(true);

      // Also re-fetch in background to get any server-side computed fields
      fetchPdc();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join(".")}: ${d.msg}`).join("; ")
        : detail || "Failed to save changes";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/pdc-received/${id}/${action}`, actionData);
      setAction("");
      setActionData({});
      fetchPdc();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Action failed");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/upload/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await api.patch(`/pdc-received/${id}/attachment`, { attachment_path: uploadRes.data.url });
      fetchPdc();
      alert("Document uploaded successfully");
    } catch (error: any) {
      alert(error.response?.data?.detail || "File upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!pdc) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
      <CircularProgress />
    </Box>
  );

  const backendBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "");
  const statusColor = statusColors[pdc.status] || "#6366f1";

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Typography variant="h5" fontWeight={700} color="white">PDC Details</Typography>
          <Typography variant="h6" fontFamily="monospace" color="#a5b4fc" fontWeight={700}>
            {pdc.pdc_receipt_reference}
          </Typography>
          <Chip label={pdc.status} size="small"
            sx={{ bgcolor: `${statusColor}22`, color: statusColor, fontWeight: 700, border: `1px solid ${statusColor}55` }} />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <PdfExportButton />
          {!editMode && (
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={handleEditOpen}
              sx={{ borderColor: "#6366f1", color: "#a5b4fc", "&:hover": { borderColor: "#818cf8", bgcolor: "rgba(99,102,241,0.1)" } }}>
              Edit Details
            </Button>
          )}
          {editMode && (
            <>
              <Button size="small" variant="contained" onClick={handleEditSave} disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                sx={{ bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                Save
              </Button>
              <Button size="small" variant="outlined" startIcon={<CancelIcon />} onClick={() => setEditMode(false)}
                sx={{ borderColor: "#ef4444", color: "#ef4444", "&:hover": { bgcolor: "rgba(239,68,68,0.1)" } }}>
                Cancel
              </Button>
            </>
          )}
          {!editMode && ["Received", "Held", "Due Soon", "Overdue"].includes(pdc.status) && (
            <Button size="small" variant="contained" onClick={() => setAction("deposit")}
              sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}>Deposit</Button>
          )}
          {!editMode && pdc.status === "Deposited" && (
            <>
              <Button size="small" variant="contained" onClick={() => setAction("clear")}
                sx={{ bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>Clear</Button>
              <Button size="small" variant="contained" onClick={() => setAction("return")}
                sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}>Return</Button>
            </>
          )}
          {!editMode && (pdc.status === "Returned" || pdc.status === "Held") && (
            <Button size="small" variant="contained" onClick={() => setAction("replace")}
              sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}>Replace</Button>
          )}
        </Stack>
      </Stack>

      {/* Details Card */}
      <Paper sx={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="white" mb={2}>
          {editMode ? "Edit PDC Details" : "PDC Information"}
        </Typography>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mb: 2.5 }} />

        {editMode ? (
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Cheque Number" size="small" value={editForm.cheque_number}
                onChange={(e) => setEditForm({ ...editForm, cheque_number: e.target.value })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Bank Name" size="small" value={editForm.bank_name}
                onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Account Holder" size="small" value={editForm.account_holder}
                onChange={(e) => setEditForm({ ...editForm, account_holder: e.target.value })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Amount (AED)" size="small" type="number" value={editForm.cheque_amount}
                onChange={(e) => setEditForm({ ...editForm, cheque_amount: e.target.value })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Cheque Date" size="small" type="date"
                value={editForm.cheque_date}
                onChange={(e) => setEditForm({ ...editForm, cheque_date: e.target.value })}
                InputLabelProps={{ shrink: true }} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Cheque Location" size="small" value={editForm.current_cheque_location}
                placeholder="e.g. Safe, Bank, Finance Office"
                onChange={(e) => setEditForm({ ...editForm, current_cheque_location: e.target.value })} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Rental Period From" size="small" type="date"
                value={editForm.rental_period_from}
                onChange={(e) => setEditForm({ ...editForm, rental_period_from: e.target.value })}
                InputLabelProps={{ shrink: true }} sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Rental Period To" size="small" type="date"
                value={editForm.rental_period_to}
                onChange={(e) => setEditForm({ ...editForm, rental_period_to: e.target.value })}
                InputLabelProps={{ shrink: true }} sx={inputSx} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Remarks" size="small" multiline rows={2} value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} sx={inputSx} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}><ReadField label="Status" value={pdc.status} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Cheque Number" value={pdc.cheque_number} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Bank" value={pdc.bank_name} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Account Holder" value={pdc.account_holder || ""} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Amount (AED)" value={pdc.cheque_amount ? Number(pdc.cheque_amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : ""} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Cheque Date" value={pdc.cheque_date} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Rental From" value={pdc.rental_period_from || ""} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Rental To" value={pdc.rental_period_to || ""} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Tenant" value={pdc.tenant_name || pdc.tenant_id} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Lease No" value={pdc.lease_number || pdc.lease_id} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Cheque Location" value={pdc.current_cheque_location || ""} /></Grid>
            <Grid item xs={6} sm={3}><ReadField label="Date Received" value={pdc.date_received || ""} /></Grid>
            {pdc.remarks && <Grid item xs={12}><ReadField label="Remarks" value={pdc.remarks} /></Grid>}
          </Grid>
        )}
      </Paper>

      {/* Document Attachment */}
      <Paper sx={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="white" mb={1.5}>Document Attachment</Typography>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mb: 2 }} />
        <Stack direction="row" alignItems="center" spacing={2}>
          {pdc.attachment_path ? (
            <a href={`${backendBaseUrl}${pdc.attachment_path}`} target="_blank" rel="noopener noreferrer"
              style={{ color: "#a5b4fc", textDecoration: "underline", fontSize: 14 }}>
              View Uploaded Document
            </a>
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">No document uploaded yet.</Typography>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" style={{ display: "none" }} />
          <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            sx={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", "&:hover": { borderColor: "#6366f1", color: "#a5b4fc" } }}>
            {isUploading ? "Uploading..." : (pdc.attachment_path ? "Replace Document" : "Upload Document")}
          </Button>
        </Stack>
      </Paper>

      {/* Action Forms */}
      {action && (
        <Paper sx={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 2, p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} color="white" mb={2} textTransform="capitalize">
            {action} Cheque
          </Typography>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mb: 2 }} />
          <form onSubmit={handleActionSubmit}>
            <Stack spacing={2}>
              {action === "deposit" && (
                <Box>
                  <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Deposit Bank Account</Typography>
                  <select value={actionData.deposit_bank_account || ""}
                    onChange={e => setActionData({ ...actionData, deposit_bank_account: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", color: "white", fontSize: 14 }}>
                    <option value="" disabled style={{ background: "#1e1e2f" }}>Select a Bank Account</option>
                    {bankAccounts.map((account) => {
                      const dv = `${account.account_name}, ${account.account_number}, ${account.iban || "N/A"}, ${account.bank_name}`;
                      return <option key={account.account_id} value={dv} style={{ background: "#1e1e2f" }}>{dv}</option>;
                    })}
                  </select>
                </Box>
              )}

              {action === "clear" && (
                <>
                  <TextField label="Clear Reason (Optional)" size="small" placeholder="e.g. Cleared by bank"
                    value={actionData.reason || ""}
                    onChange={e => setActionData({ ...actionData, reason: e.target.value })} sx={inputSx} />
                  <TextField label="Notes (Optional)" size="small" multiline rows={2}
                    value={actionData.notes || ""}
                    onChange={e => setActionData({ ...actionData, notes: e.target.value })} sx={inputSx} />
                </>
              )}

              {action === "return" && (
                <>
                  <DatePicker format="DD/MM/YYYY" label="Return Date"
                    value={actionData.return_date ? dayjs(actionData.return_date) : null}
                    onChange={(v) => setActionData({ ...actionData, return_date: v ? v.format("YYYY-MM-DD") : "" })}
                    slotProps={{ textField: { required: true, size: "small", sx: inputSx } }} />
                  <TextField label="Return Reason" size="small" placeholder="e.g. Insufficient funds"
                    value={actionData.return_reason || ""}
                    onChange={e => setActionData({ ...actionData, return_reason: e.target.value })} sx={inputSx} />
                  <TextField label="Bank Charges (AED)" size="small" type="number" placeholder="0.00"
                    value={actionData.bank_charges || ""}
                    onChange={e => setActionData({ ...actionData, bank_charges: e.target.value })} sx={inputSx} />
                </>
              )}

              {action === "replace" && (
                <>
                  <TextField label="Replacement Reason" size="small" required
                    value={actionData.replacement_reason || ""}
                    onChange={e => setActionData({ ...actionData, replacement_reason: e.target.value })} sx={inputSx} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">New Cheque Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField fullWidth label="New Cheque No" size="small" required
                        value={actionData.cheque_number || ""}
                        onChange={e => setActionData({ ...actionData, cheque_number: e.target.value })} sx={inputSx} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="Bank Name" size="small" required
                        value={actionData.bank_name || ""}
                        onChange={e => setActionData({ ...actionData, bank_name: e.target.value })} sx={inputSx} />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker format="DD/MM/YYYY" label="Cheque Date"
                        value={actionData.cheque_date ? dayjs(actionData.cheque_date) : null}
                        onChange={(v) => setActionData({ ...actionData, cheque_date: v ? v.format("YYYY-MM-DD") : "" })}
                        slotProps={{ textField: { required: true, size: "small", sx: { ...inputSx, width: "100%" } } }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth label="Amount (AED)" size="small" type="number" required placeholder="0.00"
                        value={actionData.cheque_amount || ""}
                        onChange={e => setActionData({ ...actionData, cheque_amount: e.target.value })} sx={inputSx} />
                    </Grid>
                  </Grid>
                </>
              )}

              <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                <Button variant="outlined" size="small" onClick={() => setAction("")}
                  sx={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>Cancel</Button>
                <Button type="submit" variant="contained" size="small"
                  sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}>Submit</Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      )}

      {/* Status History */}
      <Paper sx={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="white" mb={1.5}>Status History</Typography>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mb: 2 }} />
        <Stack spacing={2}>
          {pdc.status_history.map((h: any, idx: number) => (
            <Stack key={idx} direction="row" justifyContent="space-between" alignItems="flex-start"
              sx={{ borderLeft: "3px solid #6366f1", pl: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={700} color="white">{h.new_status}</Typography>
                <Typography variant="caption" color="text.secondary">{h.change_reason}</Typography>
              </Box>
              <Typography variant="caption" color="text.disabled">{formatDateTime(h.changed_at)}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* Save Success Toast */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={4000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSaveSuccess(false)}
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ fontWeight: 600 }}
        >
          PDC details saved successfully!
        </Alert>
      </Snackbar>

      {/* Save Error Toast */}
      <Snackbar
        open={!!saveError}
        autoHideDuration={6000}
        onClose={() => setSaveError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSaveError("")} severity="error" sx={{ fontWeight: 600 }}>
          {saveError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PDCReceivedDetail;
