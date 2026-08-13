import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global fetch interceptor to handle 401 Unauthorized errors across all native fetch calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    localStorage.removeItem('aigpms_token');
    localStorage.removeItem('aigpms_role');
    localStorage.removeItem('aigpms_user');
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
