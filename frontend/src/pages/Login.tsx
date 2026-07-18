import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ApartmentIcon from '@mui/icons-material/Apartment';
import dubaiSkyline from '../assets/dubai_skyline.png';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the redirect path if passed, or default to home/dashboard
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, role_name, full_name } = response.data;
      await login(access_token, role_name, full_name);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Login failed. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShortcutClick = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <Box
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${dubaiSkyline})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-cyan-950/20 blur-[100px] pointer-events-none"></div>

      {/* Grid container with Tailwind */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full z-10 items-center">
        {/* Left Side: Brand Vision */}
        <div className="hidden md:block">
          <Box className="flex items-center gap-2 mb-4">
            <ApartmentIcon sx={{ fontSize: 40, color: '#6366f1' }} />
            <Typography variant="h4" className="font-extrabold tracking-tight text-white">
              AIGPMS
            </Typography>
          </Box>
          <Typography variant="h5" className="text-indigo-400 font-bold mb-3">
            Intelligent Gateway Property System
          </Typography>
          <Typography className="text-slate-400 mb-6 text-sm leading-relaxed">
            Enterprise-level property management, legal structure monitoring, and AI-driven predictive insights integrated into a single unified platform.
          </Typography>
          
          <Box className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <Typography variant="body2" className="text-slate-300">Centralized Ownership Agreements</Typography>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
              <Typography variant="body2" className="text-slate-300">Immutable Version-Controlled Leases</Typography>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <Typography variant="body2" className="text-slate-300">RAG Chatbot Assistant & Smart Alerts</Typography>
            </div>
          </Box>
        </div>

        {/* Right Side: Login Card */}
        <div>
          <Card className="glass-panel w-full p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative">
            <div className="md:hidden flex items-center gap-2 justify-center mb-2">
              <ApartmentIcon sx={{ fontSize: 32, color: '#6366f1' }} />
              <Typography variant="h5" className="font-extrabold text-white">
                AIGPMS
              </Typography>
            </div>

            <Box className="flex flex-col gap-1 text-center md:text-left">
              <Typography variant="h5" className="font-bold text-white">
                Welcome Back
              </Typography>
              <Typography variant="body2" className="text-slate-400">
                Sign in to your enterprise gateway portal
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" className="bg-red-950/30 text-red-200 border border-red-900/50">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextField
                label="Email Address"
                type="email"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                  },
                  input: { color: '#f8fafc' },
                  label: { color: '#94a3b8' }
                }}
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                  },
                  input: { color: '#f8fafc' },
                  label: { color: '#94a3b8' }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
                fullWidth
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <>
                    <LockOutlinedIcon sx={{ fontSize: 18 }} />
                    Sign In Securely
                  </>
                )}
              </Button>
            </form>

            {/* Role Shortcuts (Demo Panel) */}
            <Box className="mt-4 pt-4 border-t border-white/5">
              <Typography variant="caption" className="text-indigo-400 uppercase font-semibold block mb-2 tracking-wider">
                Select a Role Profile (Quick Demo Link)
              </Typography>
              <Box className="flex flex-wrap gap-2">
                <Chip
                  label="Managing Director"
                  onClick={() => handleShortcutClick('md@aigpms.com', 'MDPass123!')}
                  size="small"
                  className="bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-900/50 cursor-pointer animate-pulse"
                />
                <Chip
                  label="Accountant"
                  onClick={() => handleShortcutClick('accountant@aigpms.com', 'AccountantPass123!')}
                  size="small"
                  className="bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-900/50 cursor-pointer"
                />
                <Chip
                  label="Camp Supervisor"
                  onClick={() => handleShortcutClick('supervisor@aigpms.com', 'SupervisorPass123!')}
                  size="small"
                  className="bg-slate-900/50 text-slate-300 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer"
                />
                <Chip
                  label="Maintenance Staff"
                  onClick={() => handleShortcutClick('maintenance@aigpms.com', 'MaintenancePass123!')}
                  size="small"
                  className="bg-slate-900/50 text-slate-300 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer"
                />
              </Box>
            </Box>
          </Card>
        </div>
      </div>
    </Box>
  );
};

export default Login;
