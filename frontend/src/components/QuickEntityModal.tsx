import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export interface QuickEntityModalProps {
  open: boolean;
  type: 'legal_owner' | 'beneficial_owner' | 'bank' | 'tenant' | 'property_type';
  mode: 'add' | 'edit';
  initialData?: any;
  onClose: () => void;
  onSuccess: (type: 'legal_owner' | 'beneficial_owner' | 'bank' | 'tenant' | 'property_type', savedData: any) => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const QuickEntityModal: React.FC<QuickEntityModalProps> = ({ open, type, mode, initialData, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === 'edit' && initialData) {
        setFormData(initialData);
      } else {
        // Init default data based on type
        if (type === 'legal_owner' || type === 'beneficial_owner') {
          setFormData({ owner_type: 'Individual', full_name: '', email: '', phone: '' });
        } else if (type === 'bank') {
          setFormData({ bank_name: '', country: 'UAE' });
        } else if (type === 'tenant') {
          setFormData({ tenant_type: 'Individual', full_name: '', email: '', phone: '' });
        } else if (type === 'property_type') {
          setFormData({ type_name: '' });
        }
      }
    }
  }, [open, mode, initialData, type]);

  const getEndpoint = () => {
    switch (type) {
      case 'legal_owner': return '/ownership/legal-owners';
      case 'beneficial_owner': return '/ownership/beneficial-owners';
      case 'bank': return '/master/banks';
      case 'tenant': return '/tenants';
      case 'property_type': return '/master/property-types';
    }
  };

  const getIdField = () => {
    switch (type) {
      case 'legal_owner': return 'legal_owner_id';
      case 'beneficial_owner': return 'beneficial_owner_id';
      case 'bank': return 'bank_id';
      case 'tenant': return 'tenant_id';
      case 'property_type': return 'property_type_id';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = getEndpoint();
      const idField = getIdField();
      
      const isEdit = mode === 'edit';
      const url = isEdit ? `${API}${endpoint}/${formData[idField]}` : `${API}${endpoint}`;
      
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to save ${type.replace('_', ' ')}`);
      }
      
      const savedData = await res.json();
      onSuccess(type, savedData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const title = `${mode === 'add' ? 'Add' : 'Edit'} ${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: '#1e1e2d', color: 'white', minWidth: 400 } }} style={{ zIndex: 1400 }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        
        {(type === 'legal_owner' || type === 'beneficial_owner') && (
          <>
            <TextField 
              select 
              label="Owner Type *" 
              value={formData.owner_type || 'Individual'} 
              onChange={e => setFormData({...formData, owner_type: e.target.value})}
              fullWidth
              sx={{ mt: 1 }}
            >
              {['Individual', 'Company'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField 
              label="Full Name *" 
              value={formData.full_name || ''} 
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              fullWidth
            />
            <TextField 
              label="Email" 
              type="email"
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              fullWidth
            />
            <TextField 
              label="Phone" 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
              fullWidth
            />
          </>
        )}

        {type === 'bank' && (
          <>
            <TextField 
              label="Bank Name *" 
              value={formData.bank_name || ''} 
              onChange={e => setFormData({...formData, bank_name: e.target.value})}
              fullWidth
              sx={{ mt: 1 }}
            />
            <TextField 
              label="Country" 
              value={formData.country || 'UAE'} 
              onChange={e => setFormData({...formData, country: e.target.value})}
              fullWidth
            />
          </>
        )}

        {type === 'tenant' && (
          <>
            <TextField 
              select 
              label="Tenant Type *" 
              value={formData.tenant_type || 'Individual'} 
              onChange={e => setFormData({...formData, tenant_type: e.target.value})}
              fullWidth
              sx={{ mt: 1 }}
            >
              {['Individual', 'Company'].map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField 
              label="Full Name *" 
              value={formData.full_name || ''} 
              onChange={e => setFormData({...formData, full_name: e.target.value})}
              fullWidth
            />
            <TextField 
              label="Email" 
              type="email"
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              fullWidth
            />
            <TextField 
              label="Phone" 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
              fullWidth
            />
          </>
        )}

        {type === 'property_type' && (
          <>
            <TextField 
              label="Property Type Name *" 
              value={formData.type_name || ''} 
              onChange={e => setFormData({...formData, type_name: e.target.value})}
              fullWidth
              sx={{ mt: 1 }}
            />
          </>
        )}

      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          disabled={loading || (
            (type === 'bank' && !formData.bank_name) ||
            (type === 'property_type' && !formData.type_name) ||
            (type !== 'bank' && type !== 'property_type' && !formData.full_name)
          )}
          sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickEntityModal;
