/**
 * AIGPMS PDF Export Utility
 * -------------------------
 * Builds a branded A4 PDF from whatever is currently rendered on a page.
 *
 * It reads three kinds of content from the DOM (in on-screen order):
 *   1. Section headings  – <Typography variant="h6">
 *   2. Labelled fields   – <Typography variant="caption">Label</Typography> followed by its value
 *   3. Tables            – MUI <Table> (an "Actions" column is dropped automatically)
 *
 * Because it reads the rendered page, the PDF always matches what the user sees,
 * including any search / filters they have applied.
 *
 * Mark any element with  data-pdf-ignore  to leave it out of the PDF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Cell = string | { content: string; colSpan: number };

export type PdfBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'fields'; pairs: [string, string][] }
  | { kind: 'table'; head: string[]; body: Cell[][]; foot: Cell[][]; emptyMessage?: string }
  | { kind: 'end' };

export interface PdfSection {
  index: number;
  title: string;
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  fileName?: string;
  orientation?: 'portrait' | 'landscape' | 'auto';
}

// ─────────────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────────────

// jsPDF's built-in fonts only cover Windows-1252; strip anything else (emoji, icons…)
const NON_PRINTABLE = /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;

export function cleanText(s: string): string {
  return s
    .replace(/ /g, ' ')
    .replace(NON_PRINTABLE, '')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const SKIP_TAGS = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'SVG', 'SCRIPT', 'STYLE', 'IMG', 'CANVAS', 'NOSCRIPT', 'VIDEO', 'IFRAME']);

function isHidden(el: Element): boolean {
  return (el as HTMLElement).getClientRects().length === 0;
}

function shouldSkip(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName.toUpperCase())) return true;
  if (el.hasAttribute('data-pdf-ignore')) return true;
  if (el.getAttribute('role') === 'dialog' || el.getAttribute('role') === 'tooltip') return true;
  if (el.classList.contains('MuiTabs-root') || el.classList.contains('MuiDialog-root')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  return isHidden(el);
}

/** Visible text of an element; block children become new lines, inline-blocks (chips) get spaces. */
function textOf(el: Element): string {
  let out = '';
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as HTMLElement;
    const tag = e.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      const v = (e as HTMLInputElement).value;
      const type = (e as HTMLInputElement).type;
      if (v && type !== 'hidden' && type !== 'checkbox' && type !== 'radio') out += ` ${v} `;
      return;
    }
    if (tag === 'SVG' || tag === 'svg' || tag === 'SCRIPT' || tag === 'STYLE' || e.hasAttribute('data-pdf-ignore')) return;
    if (isHidden(e)) return;
    const display = getComputedStyle(e).display;
    const sep = display === 'inline' || display === 'contents' ? '' : display.startsWith('inline') ? ' ' : '\n';
    out += sep;
    e.childNodes.forEach(visit);
    out += sep;
  };
  visit(el);
  return cleanText(out);
}

const isCaption = (el: Element) => el.classList.contains('MuiTypography-caption');
const HEADING_CLASSES = ['MuiTypography-h6', 'MuiTypography-overline', 'MuiTypography-subtitle1', 'MuiTypography-subtitle2'];
const isHeadingTag = (el: Element) => el.tagName === 'H6' || HEADING_CLASSES.some((c) => el.classList.contains(c));
const isTitleTag = (el: Element) => /^H[1-6]$/.test(el.tagName) || /MuiTypography-(h[1-6]|subtitle[12]|overline)\b/.test(el.className);
/** True when el sits next to the page title (h4/h5) – i.e. it is part of the page header. */
const inPageHeader = (el: Element) => !!el.parentElement && Array.from(el.parentElement.children).some(
  (s) => s !== el && (s.tagName === 'H4' || s.tagName === 'H5' || s.classList.contains('MuiTypography-h4') || s.classList.contains('MuiTypography-h5')));

/**
 * "Label / value" container: exactly two meaningful children, the first a short plain
 * Typography (e.g. <Typography variant="body2">Start Date</Typography><Typography>01/01/2026</Typography>).
 */
function asLabelValue(el: Element): [string, string] | null {
  if (el.tagName === 'TABLE' || isCard(el)) return null;
  const kids = Array.from(el.children).filter((k) => !shouldSkip(k));
  if (kids.length !== 2) return null;
  const [a, b] = kids;
  if (!a.classList.contains('MuiTypography-root') || isTitleTag(a) || isCaption(a)) return null;
  if (a.querySelector('*:not(strong):not(b):not(span)')) return null;
  if (b.querySelector('table') || b.tagName === 'TABLE' || isCard(b)) return null;
  if (isHeadingTag(b) && !/MuiTypography-h6/.test(b.className)) return null;
  const label = textOf(a);
  if (!label || label.length > 60 || label.includes('\n')) return null;
  const value = textOf(b);
  if (value.length > 600) return null;
  return [label, value];
}
const isCard = (el: Element) => el.classList.contains('MuiPaper-root') || el.classList.contains('MuiCard-root');

// ─────────────────────────────────────────────────────────────────────────────
// Table parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseRow(row: HTMLTableRowElement, drop: Set<number>): Cell[] {
  const cells: Cell[] = [];
  let col = 0;
  for (const cell of Array.from(row.cells)) {
    const span = Math.max(1, cell.colSpan || 1);
    let kept = 0;
    for (let c = col; c < col + span; c++) if (!drop.has(c)) kept++;
    col += span;
    if (kept === 0) continue;
    const txt = textOf(cell);
    cells.push(kept > 1 ? { content: txt, colSpan: kept } : txt);
  }
  return cells;
}

function parseTable(table: HTMLTableElement): PdfBlock | null {
  const headRows = table.tHead ? Array.from(table.tHead.rows) : [];
  const headRow = headRows[headRows.length - 1];
  const drop = new Set<number>();
  const head: string[] = [];
  if (headRow) {
    let col = 0;
    for (const cell of Array.from(headRow.cells)) {
      const span = Math.max(1, cell.colSpan || 1);
      const txt = textOf(cell).replace(/\n/g, ' ');
      if (/^(actions?|)$/i.test(txt) && cell.closest('thead')) {
        for (let c = col; c < col + span; c++) drop.add(c);
      } else {
        for (let c = 0; c < span; c++) head.push(c === 0 ? txt : '');
      }
      col += span;
    }
  }
  const colCount = head.length;

  let emptyMessage: string | undefined;
  const body: Cell[][] = [];
  for (const tb of Array.from(table.tBodies)) {
    for (const row of Array.from(tb.rows)) {
      if (isHidden(row)) continue;
      // A single cell spanning the whole table = "Loading…" / "No records" / expandable detail row
      if (row.cells.length === 1 && colCount > 1 && (row.cells[0].colSpan || 1) > 1) {
        const msg = textOf(row.cells[0]);
        if (msg && !row.cells[0].querySelector('table')) emptyMessage = msg;
        continue;
      }
      const r = parseRow(row, drop);
      if (r.some((c) => (typeof c === 'string' ? c : c.content).trim() !== '')) body.push(r);
    }
  }
  const foot: Cell[][] = table.tFoot ? Array.from(table.tFoot.rows).map((r) => parseRow(r, drop)) : [];

  if (!colCount && body.length === 0) return null;
  return { kind: 'table', head, body, foot, emptyMessage };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM → blocks
// ─────────────────────────────────────────────────────────────────────────────

function pushPair(out: PdfBlock[], label: string, value: string) {
  label = label.replace(/\n/g, ' ').replace(/:$/, '');
  if (!label) return;
  const last = out[out.length - 1];
  if (last && last.kind === 'fields') last.pairs.push([label, value || '—']);
  else out.push({ kind: 'fields', pairs: [[label, value || '—']] });
}

function walk(el: Element, out: PdfBlock[], consumed: Set<Element> = new Set()) {
  const kids = Array.from(el.children);
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (shouldSkip(c)) continue;

    if (c.tagName === 'TABLE') {
      const t = parseTable(c as HTMLTableElement);
      if (t) out.push(t);
      continue;
    }

    if (isCaption(c)) {
      const label = textOf(c);
      const ci = i;
      const valueEls: Element[] = [];
      for (let j = i + 1; j < kids.length; j++) {
        const s = kids[j];
        if (isCaption(s) || s.tagName === 'TABLE' || s.querySelector('table, .MuiTypography-caption')) break;
        if (!shouldSkip(s)) valueEls.push(s);
        i = j;
      }
      valueEls.forEach((v) => consumed.add(v));
      let value = valueEls.map(textOf).filter(Boolean).join(' ');

      if (!value && valueEls.length === 0) {
        const prev = ci > 0 ? kids[ci - 1] : undefined;
        const next = kids[ci + 1];
        const last = out[out.length - 1];
        if (prev && consumed.has(prev) && last && last.kind === 'fields') {
          // Sub-label under a KPI value, e.g. "12" + "4 active"  →  "12 (4 active)"
          const pair = last.pairs[last.pairs.length - 1];
          if (label) pair[1] = `${pair[1]} (${label.replace(/\n/g, ' ')})`;
          continue;
        }
        if (next && isCaption(next) && kids.length === 2 && ci === 0) {
          // Two captions side by side: "Portfolio Occupancy"  "72%"
          value = textOf(next);
          consumed.add(next);
          i = ci + 1;
        } else if (prev && !isCaption(prev) && !consumed.has(prev) && !prev.querySelector('table')
          && prev.closest('.MuiPaper-root, .MuiCard-root')) {
          // KPI card with the value above its caption
          value = textOf(prev);
          consumed.add(prev);
        }
      }
      if (value || valueEls.length) pushPair(out, label, value);
      continue;
    }

    if (isHeadingTag(c)) {
      const next = kids[i + 1];
      const prev = kids[i - 1];
      const isStatValue = (next && isCaption(next)) || (prev && isCaption(prev));
      if (!isStatValue && !inPageHeader(c)) {
        const text = textOf(c).replace(/\n/g, ' ');
        if (text && text.length <= 70) out.push({ kind: 'heading', text });
      }
      continue;
    }

    const lv = asLabelValue(c);
    if (lv && !inPageHeader(c) && !c.parentElement?.closest('header')) {
      pushPair(out, lv[0], lv[1]);
      continue;
    }

    walk(c, out, consumed);
    if (isCard(c)) out.push({ kind: 'end' });
  }
}

export function extractBlocks(root: Element): PdfBlock[] {
  const out: PdfBlock[] = [];
  walk(root, out);
  return out;
}

/** Content between the n-th heading and the next heading / end of its card. */
function sectionBlocks(blocks: PdfBlock[], headingOrdinal: number): PdfBlock[] {
  let n = -1;
  let start = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].kind === 'heading' && ++n === headingOrdinal) { start = i + 1; break; }
  }
  if (start < 0) return [];
  const res: PdfBlock[] = [];
  for (let i = start; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'heading' || b.kind === 'end') break;
    res.push(b);
  }
  return res;
}

export function listSections(root: Element): PdfSection[] {
  const blocks = extractBlocks(root);
  const sections: PdfSection[] = [];
  let n = -1;
  blocks.forEach((b) => {
    if (b.kind !== 'heading') return;
    n++;
    if (sectionBlocks(blocks, n).length) sections.push({ index: n, title: b.text });
  });
  return sections;
}

/** Page title / subtitle from the page header (first h4 or h5). */
export function detectPageTitle(root: Element, preferred?: string): { title: string; subtitle?: string } {
  const candidates = Array.from(root.querySelectorAll('h4, h5, .MuiTypography-h4, .MuiTypography-h5'))
    .filter((h) => !h.closest('.MuiPaper-root, .MuiCard-root, [role="dialog"]') && !isHidden(h));
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const h = (preferred && candidates.find((c) => norm(textOf(c)) === norm(preferred))) || candidates[0];
  if (!h) return { title: preferred || document.title || 'Report' };
  const title = preferred || textOf(h).replace(/\n/g, ' ') || 'Report';
  let sib: Element | null = h.nextElementSibling;
  if (!sib && h.parentElement) sib = h.parentElement.nextElementSibling;
  let subtitle = sib && !shouldSkip(sib) && !sib.querySelector('table, button') ? textOf(sib).replace(/\n/g, ' ') : '';
  if (subtitle.length > 160) subtitle = '';
  return { title, subtitle: subtitle || undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF rendering
// ─────────────────────────────────────────────────────────────────────────────

const INDIGO: [number, number, number] = [99, 102, 241];
const NAVY: [number, number, number] = [15, 23, 42];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

function safeFileName(s: string) {
  return s.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'Report';
}

export function renderPdf(blocks: PdfBlock[], opts: PdfExportOptions) {
  const tables = blocks.filter((b): b is Extract<PdfBlock, { kind: 'table' }> => b.kind === 'table');
  const maxCols = tables.reduce((m, t) => Math.max(m, t.head.length), 0);
  const orientation = !opts.orientation || opts.orientation === 'auto' ? (maxCols > 6 ? 'landscape' : 'portrait') : opts.orientation;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  const generated = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const title = cleanText(opts.title).replace(/\n/g, ' ');
  const subtitle = opts.subtitle ? cleanText(opts.subtitle).replace(/\n/g, ' ') : '';

  // ── Header band (first page) ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFillColor(...INDIGO);
  doc.rect(0, 32, W, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INDIGO);
  doc.text('AIGPMS', M, 12);
  doc.setFontSize(13);
  doc.setTextColor(241, 245, 249);
  doc.text(doc.splitTextToSize(title, W - M * 2 - 60)[0], M, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(subtitle ? doc.splitTextToSize(subtitle, W - M * 2 - 60)[0] : 'AI Powered Gateway Property Management System', M, 28);
  doc.text(`Generated: ${generated}`, W - M, 12, { align: 'right' });
  if (tables.length === 1) doc.text(`Records: ${tables[0].body.length}`, W - M, 18, { align: 'right' });

  let y = 42;
  const topMargin = 18;
  const lastY = () => ((doc as any).lastAutoTable?.finalY ?? y) as number;
  const ensureSpace = (needed: number) => {
    if (y + needed > H - 18) { doc.addPage(); y = topMargin + 2; }
  };

  const content = blocks.filter((b) => b.kind !== 'end');
  if (content.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text('No data available to export on this page.', M, y + 6);
  }

  for (const b of content) {
    if (b.kind === 'heading') {
      ensureSpace(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...SLATE);
      doc.text(cleanText(b.text), M, y);
      doc.setDrawColor(...INDIGO);
      doc.setLineWidth(0.5);
      doc.line(M, y + 1.8, M + 18, y + 1.8);
      y += 6;
      continue;
    }

    if (b.kind === 'fields') {
      const perRow = orientation === 'landscape' ? 3 : 2;
      const rows: string[][] = [];
      for (let i = 0; i < b.pairs.length; i += perRow) {
        const row: string[] = [];
        for (let k = 0; k < perRow; k++) {
          const p = b.pairs[i + k];
          row.push(p ? p[0] : '', p ? p[1] : '');
        }
        rows.push(row);
      }
      const labelW = orientation === 'landscape' ? 38 : 36;
      const columnStyles: Record<number, any> = {};
      for (let k = 0; k < perRow; k++) {
        columnStyles[k * 2] = { fontStyle: 'bold', textColor: MUTED, fillColor: [241, 245, 249], cellWidth: labelW };
        columnStyles[k * 2 + 1] = { textColor: NAVY };
      }
      ensureSpace(14);
      autoTable(doc, {
        body: rows,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.2, valign: 'middle', overflow: 'linebreak' },
        columnStyles,
        margin: { left: M, right: M, top: topMargin },
      });
      y = lastY() + 7;
      continue;
    }

    if (b.kind === 'table') {
      if (b.body.length === 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(cleanText(b.emptyMessage || 'No records found.'), M, y + 2);
        y += 9;
        continue;
      }
      const cols = b.head.length || Math.max(...b.body.map((r) => r.length));
      const fontSize = cols > 11 ? 6.5 : cols > 8 ? 7.2 : 8.2;
      ensureSpace(20);
      autoTable(doc, {
        head: b.head.length ? [b.head] : undefined,
        body: b.body,
        foot: b.foot.length ? b.foot : undefined,
        startY: y,
        theme: 'grid',
        showHead: 'everyPage',
        showFoot: 'lastPage',
        styles: { fontSize, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.2, textColor: NAVY, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: SLATE, textColor: [241, 245, 249], fontStyle: 'bold' },
        footStyles: { fillColor: [224, 231, 255], textColor: NAVY, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: M, right: M, top: topMargin },
      });
      y = lastY() + 8;
    }
  }

  // ── Running header + footer on every page ──
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...INDIGO);
      doc.text('AIGPMS', M, 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(title, W - M * 2 - 30)[0], M + 15, 10);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(M, 12.5, W - M, 12.5);
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(M, H - 11, W - M, H - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`AIGPMS Confidential  |  Generated ${generated}`, M, H - 6.5);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 6.5, { align: 'right' });
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${safeFileName(opts.fileName || title)}_${date}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Export everything rendered inside `root`. */
export function exportPagePdf(root: Element, opts: Partial<PdfExportOptions> = {}) {
  const detected = detectPageTitle(root, opts.title);
  renderPdf(extractBlocks(root), {
    title: opts.title || detected.title,
    subtitle: opts.subtitle ?? detected.subtitle,
    fileName: opts.fileName,
    orientation: opts.orientation,
  });
}

/** Export one section (the n-th h6 heading and its content). */
export function exportSectionPdf(root: Element, section: PdfSection, opts: Partial<PdfExportOptions> = {}) {
  const detected = detectPageTitle(root, opts.title);
  const pageTitle = opts.title || detected.title;
  const blocks = sectionBlocks(extractBlocks(root), section.index);
  renderPdf([{ kind: 'heading', text: section.title }, ...blocks], {
    title: `${pageTitle} - ${section.title}`,
    subtitle: detected.subtitle,
    fileName: `${opts.fileName || pageTitle}_${section.title}`,
    orientation: opts.orientation,
  });
}
