import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a]">
        <CircularProgress color="primary" />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Loading your profile...
        </Typography>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the current location they tried to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to unauthorized / dashboard if they don't have privileges
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] p-6">
        <Typography variant="h4" color="error" gutterBottom>
          403 - Access Denied
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ maxWidth: 400, mb: 3 }}>
          You do not have permission to view this page. Please contact your system administrator.
        </Typography>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
