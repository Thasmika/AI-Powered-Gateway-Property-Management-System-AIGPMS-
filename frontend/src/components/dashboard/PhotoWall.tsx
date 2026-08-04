import React from 'react';
import { Box, Typography, Card } from '@mui/material';

const DUMMY_PHOTOS = [
  { src: '/assets/dummy/penthouse.png', title: 'Luxury Penthouse', location: 'Downtown Dubai', size: 'large' },
  { src: '/assets/dummy/villa.png', title: 'Modern Villa', location: 'Palm Jumeirah', size: 'small' },
  { src: '/assets/dummy/tower.png', title: 'Commercial Tower', location: 'Business Bay', size: 'small' },
  { src: '/assets/dummy/apartment.png', title: 'Apartment Complex', location: 'Dubai Marina', size: 'wide' },
];

const PhotoWall: React.FC = () => {
  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 3 }}>
        Featured Properties
      </Typography>
      
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gridAutoRows: '200px',
          gap: 3 
        }}
      >
        {DUMMY_PHOTOS.map((photo, index) => {
          let colSpan = 1;
          let rowSpan = 1;

          if (photo.size === 'large') {
            colSpan = 2;
            rowSpan = 2;
          } else if (photo.size === 'wide') {
            colSpan = 2;
            rowSpan = 1;
          }

          return (
            <Card
              key={index}
              sx={{
                gridColumn: { xs: 'span 1', md: `span ${colSpan}` },
                gridRow: { xs: 'span 1', md: `span ${rowSpan}` },
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                bgcolor: 'rgba(255,255,255,0.05)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                '&:hover .photo-img': {
                  transform: 'scale(1.05)'
                },
                '&:hover .photo-overlay': {
                  opacity: 1
                }
              }}
            >
              <Box
                className="photo-img"
                sx={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundImage: `url(${photo.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transition: 'transform 0.5s ease'
                }}
              />
              <Box
                className="photo-overlay"
                sx={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  p: 3
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  {photo.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {photo.location}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default PhotoWall;
