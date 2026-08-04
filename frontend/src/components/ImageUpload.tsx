import React, { useState, useRef } from 'react';
import { Box, Button, CircularProgress, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../context/AuthContext';

interface ImageUploadProps {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  maxSizeMB?: number;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
// Convert e.g. "http://localhost:8000/api/v1" to "http://localhost:8000" for serving uploads directly
const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8000';

const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, maxSizeMB = 5 }) => {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      // data.url typically comes back as "/uploads/filename.ext"
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  const imageUrl = value ? (value.startsWith('http') ? value : `${BASE_URL}${value}`) : null;

  return (
    <Box sx={{ border: '1px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="subtitle2" gutterBottom color="textSecondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      
      {imageUrl ? (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Box
            component="img"
            src={imageUrl}
            alt={label}
            sx={{ maxWidth: '100%', maxHeight: 150, borderRadius: 1, objectFit: 'cover' }}
          />
          <IconButton
            size="small"
            color="error"
            onClick={handleRemove}
            sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'error.light', color: 'white' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <Box>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            component="span"
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : 'Select'}
          </Button>
          {error && (
            <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ImageUpload;
