import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const getFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  let cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  if (!cleanPath.startsWith('/uploads')) {
    cleanPath = `/uploads${cleanPath}`;
  }
  return `${base}${cleanPath}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Authorization token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aigpms_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('aigpms_token');
      localStorage.removeItem('aigpms_role');
      localStorage.removeItem('aigpms_user');
      // If we are not already on the login page, redirect
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
