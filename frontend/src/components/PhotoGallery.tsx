import React from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
interface PhotoGalleryProps {
  open: boolean;
  onClose: () => void;
  photos: string[];
  unitNumber?: string;
}

const Transition = React.forwardRef(function Transition(
  props: any,
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ open, onClose, photos, unitNumber }) => {
  const validPhotos = photos.filter(p => !!p);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          bgcolor: '#121212', // Dark background for gallery
          color: '#ffffff'
        }
      }}
    >
      <AppBar sx={{ position: 'relative', bgcolor: 'rgba(0,0,0,0.8)', boxShadow: 'none' }}>
        <Toolbar>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Photo Gallery {unitNumber ? `- Unit ${unitNumber}` : ''}
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ p: 4, display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
        {validPhotos.length === 0 ? (
          <Typography variant="h6" color="text.secondary">
            No photos available for this unit.
          </Typography>
        ) : (
          <Grid container spacing={4} justifyContent="center" alignItems="center">
            {validPhotos.map((photoUrl, index) => (
              <Grid item xs={12} sm={validPhotos.length === 1 ? 12 : 6} key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="img"
                  src={photoUrl}
                  alt={`Unit Photo ${index + 1}`}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: validPhotos.length > 2 ? '40vh' : '80vh',
                    borderRadius: 2,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    objectFit: 'contain'
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Dialog>
  );
};

export default PhotoGallery;
