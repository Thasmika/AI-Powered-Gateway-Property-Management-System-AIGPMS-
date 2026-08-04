import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ChatIcon from '@mui/icons-material/Chat';

interface HeroCarouselProps {
  user: any;
  role: string;
}

const DUMMY_PHOTOS = [
  '/assets/dummy/penthouse.png',
  '/assets/dummy/villa.png',
  '/assets/dummy/tower.png',
  '/assets/dummy/apartment.png',
];

const HeroCarousel: React.FC<HeroCarouselProps> = ({ user, role }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DUMMY_PHOTOS.length);
    }, 6000); // Change photo every 6 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        height: { xs: '300px', md: '400px' }, 
        borderRadius: 4, 
        overflow: 'hidden',
        mb: 4,
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
      }}
    >
      {/* Background Images with crossfade */}
      {DUMMY_PHOTOS.map((photo, index) => (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: 0
          }}
        />
      ))}

      {/* Dark Gradient Overlay for text readability */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.3) 70%, transparent 100%)',
          zIndex: 1
        }}
      />

      {/* Content */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { xs: 4, md: 8 }
        }}
      >
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800, 
            color: 'white', 
            mb: 1,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}
        >
          Welcome back, {user?.full_name}!
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)', 
            maxWidth: '600px',
            mb: 4,
            fontWeight: 400
          }}
        >
          You are logged into the AIGPMS Enterprise Gateway as <span style={{ color: '#818cf8', fontWeight: 600 }}>{role}</span>. Manage your properties, leases, and financials with ease.
        </Typography>

        <Box>
          <Button
            variant="contained"
            component={Link}
            to="/ai-assistant"
            startIcon={<ChatIcon />}
            sx={{
              bgcolor: '#6366f1',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
              '&:hover': {
                bgcolor: '#4f46e5',
                transform: 'translateY(-2px)',
                boxShadow: '0 15px 25px -5px rgba(99, 102, 241, 0.5)',
              },
              transition: 'all 0.2s'
            }}
          >
            Ask AI Assistant
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default HeroCarousel;
