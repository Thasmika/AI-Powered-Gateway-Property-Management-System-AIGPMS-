import React, { useRef, useState } from 'react';
import {
  Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, CircularProgress, Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import SegmentIcon from '@mui/icons-material/Segment';
import { exportPagePdf, exportSectionPdf, listSections, type PdfSection } from '../utils/pdfExport';

interface PdfExportButtonProps {
  /** Report title. Defaults to the page heading. */
  title?: string;
  /** File name (without date / extension). Defaults to the title. */
  fileName?: string;
  /** Button text. */
  label?: string;
  /** Page orientation; 'auto' picks landscape for wide tables. */
  orientation?: 'portrait' | 'landscape' | 'auto';
  /** Set false to always export the whole page (no section menu). */
  sections?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Drop-in "Download PDF" button. Place it anywhere on a page.
 * - Pages without sections: downloads the whole page straight away.
 * - Pages with sections (h6 headings): opens a menu — entire page, or any single section.
 */
const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  title, fileName, label = 'Download PDF', orientation = 'auto', sections = true, size = 'medium',
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [found, setFound] = useState<PdfSection[]>([]);
  const [busy, setBusy] = useState(false);

  const getRoot = (): Element =>
    btnRef.current?.closest('[data-pdf-root]') || btnRef.current?.closest('main') || document.body;

  const run = (fn: () => void) => {
    setAnchor(null);
    setBusy(true);
    // let the menu close / spinner paint before the (synchronous) PDF build
    setTimeout(() => {
      try { fn(); }
      catch (e) { console.error('PDF export failed', e); alert('Sorry, the PDF could not be generated.'); }
      finally { setBusy(false); }
    }, 50);
  };

  const exportPage = () => run(() => exportPagePdf(getRoot(), { title, fileName, orientation }));
  const exportSection = (s: PdfSection) => run(() => exportSectionPdf(getRoot(), s, { title, fileName, orientation }));

  const handleClick = () => {
    if (busy) return;
    const s = sections ? listSections(getRoot()) : [];
    if (s.length === 0) { exportPage(); return; }
    setFound(s);
    setAnchor(btnRef.current);
  };

  return (
    <>
      <Button
        ref={btnRef}
        data-pdf-ignore
        size={size}
        variant="outlined"
        onClick={handleClick}
        disabled={busy}
        startIcon={busy ? <CircularProgress size={16} sx={{ color: '#f87171' }} /> : <PictureAsPdfIcon />}
        sx={{
          color: '#f87171',
          borderColor: 'rgba(248,113,113,0.45)',
          whiteSpace: 'nowrap',
          '&:hover': { borderColor: '#f87171', bgcolor: 'rgba(248,113,113,0.08)' },
        }}
      >
        {busy ? 'Preparing…' : label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { bgcolor: '#1e1e2d', color: 'white', border: '1px solid rgba(255,255,255,0.08)', minWidth: 240 } } }}
      >
        <MenuItem onClick={exportPage}>
          <ListItemIcon><DescriptionIcon fontSize="small" sx={{ color: '#f87171' }} /></ListItemIcon>
          <ListItemText primary="Entire page" />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', display: 'block', lineHeight: 2 }}>
          Single section
        </Typography>
        {found.map((s) => (
          <MenuItem key={s.index} onClick={() => exportSection(s)}>
            <ListItemIcon><SegmentIcon fontSize="small" sx={{ color: '#94a3b8' }} /></ListItemIcon>
            <ListItemText primary={s.title} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default PdfExportButton;
