import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface UserInfo {
  user_id: string;
  email: string;
  full_name: string;
  status: string;
  role: {
    role_id: string;
    role_name: string;
    description: string;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  role: string | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, roleName: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aigpms_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get<UserInfo>('/auth/me');
      setUser(response.data);
      setRole(response.data.role.role_name);
      setIsAuthenticated(true);
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('aigpms_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (newToken: string, roleName: string, fullName: string) => {
    localStorage.setItem('aigpms_token', newToken);
    localStorage.setItem('aigpms_role', roleName);
    localStorage.setItem('aigpms_name', fullName);
    setToken(newToken);
    setIsLoading(true);
    await fetchCurrentUser();
  };

  const logout = () => {
    localStorage.removeItem('aigpms_token');
    localStorage.removeItem('aigpms_role');
    localStorage.removeItem('aigpms_name');
    setUser(null);
    setRole(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
