/**
 * AIGPMS Date Utility
 * -------------------
 * UAE standard date format: dd/MM/yyyy (e.g. 18/08/2026)
 *
 * INTERNAL RULE: The API always stores/receives dates as YYYY-MM-DD (ISO 8601).
 * These helpers are for DISPLAY ONLY — they convert to the UAE-standard format
 * that must be shown consistently on every screen throughout the project.
 *
 * DO NOT use toLocaleDateString(), dayjs().format('YYYY-MM-DD') in JSX display,
 * or raw ISO string rendering for user-facing dates. Use these functions instead.
 */

/**
 * Formats a date-only string (YYYY-MM-DD or ISO 8601) to UAE dd/MM/yyyy.
 * Uses UTC getters to avoid timezone off-by-one errors for date-only fields.
 *
 * @example formatDate('2026-08-18') → '18/08/2026'
 * @example formatDate(null)         → '—'
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year  = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a datetime string (ISO 8601 with time) to UAE dd/MM/yyyy HH:mm.
 * Uses local getters so the time reflects the user's timezone.
 *
 * @example formatDateTime('2026-08-18T09:30:00Z') → '18/08/2026 15:00' (IST)
 * @example formatDateTime(null)                    → '—'
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, '0');
  const mm    = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${mm}`;
}
