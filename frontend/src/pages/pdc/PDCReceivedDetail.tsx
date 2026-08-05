import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const PDCReceivedDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pdc, setPdc] = useState<any>(null);
  const [action, setAction] = useState<string>(''); // 'deposit', 'clear', 'return', 'replace'
  const [actionData, setActionData] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPdc = async () => {
    try {
      const response = await api.get(`/pdc-received/${id}`);
      setPdc(response.data);
    } catch (error) {
      console.error('Failed to fetch PDC', error);
    }
  };

  useEffect(() => {
    fetchPdc();
  }, [id]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/pdc-received/${id}/${action}`, actionData);
      setAction('');
      setActionData({});
      fetchPdc(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Action failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const fileUrl = uploadRes.data.url;
      
      await api.patch(`/pdc-received/${id}/attachment`, {
        attachment_path: fileUrl
      });
      
      fetchPdc();
      alert('Document uploaded successfully');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!pdc) return <div className="p-6">Loading...</div>;

  const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PDC Details: {pdc.cheque_number}</h1>
        <div className="space-x-2">
          {pdc.status === 'Received' || pdc.status === 'Held' ? (
            <button onClick={() => setAction('deposit')} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">Deposit</button>
          ) : null}
          {pdc.status === 'Deposited' ? (
            <>
              <button onClick={() => setAction('clear')} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition">Clear</button>
              <button onClick={() => setAction('return')} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition">Return</button>
            </>
          ) : null}
          {pdc.status === 'Returned' || pdc.status === 'Held' ? (
            <button onClick={() => setAction('replace')} className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition">Replace</button>
          ) : null}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-gray-500">Status</p><p className="font-semibold">{pdc.status}</p></div>
          <div><p className="text-sm text-gray-500">Bank</p><p className="font-semibold">{pdc.bank_name}</p></div>
          <div><p className="text-sm text-gray-500">Amount</p><p className="font-semibold">{pdc.cheque_amount}</p></div>
          <div><p className="text-sm text-gray-500">Cheque Date</p><p className="font-semibold">{pdc.cheque_date}</p></div>
          <div><p className="text-sm text-gray-500">Tenant ID</p><p className="font-semibold">{pdc.tenant_id}</p></div>
          <div><p className="text-sm text-gray-500">Lease ID</p><p className="font-semibold">{pdc.lease_id}</p></div>
        </div>
      </div>

      {/* Document Attachment Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4">Document Attachment</h2>
        <div className="flex items-center gap-4">
          {pdc.attachment_path ? (
            <div className="flex items-center gap-4">
              <a 
                href={`${backendBaseUrl}${pdc.attachment_path}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                View Uploaded Document
              </a>
              <span className="text-gray-400">|</span>
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">No document uploaded yet.</p>
          )}
          
          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileUpload} 
              accept="image/*,application/pdf"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : (pdc.attachment_path ? 'Upload New Document' : 'Upload Document')}
            </button>
          </div>
        </div>
      </div>

      {/* Action Form Overlay / Section */}
      {action && (
        <div className="bg-gray-50 p-6 rounded-lg shadow border mb-6">
          <h2 className="text-lg font-bold mb-4 capitalize">{action} Cheque</h2>
          <form onSubmit={handleActionSubmit} className="space-y-4">
            
            {action === 'deposit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Deposit Bank Account</label>
                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  onChange={e => setActionData({...actionData, deposit_bank_account: e.target.value})} />
              </div>
            )}

            {action === 'return' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Date</label>
                  <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    onChange={e => setActionData({...actionData, return_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Return Reason</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    onChange={e => setActionData({...actionData, return_reason: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Charges (AED)</label>
                  <input type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    onChange={e => setActionData({...actionData, bank_charges: e.target.value})} />
                </div>
              </>
            )}

            {action === 'replace' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Replacement Reason</label>
                  <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    onChange={e => setActionData({...actionData, replacement_reason: e.target.value})} />
                </div>
                <h3 className="text-md font-semibold mt-4">New Cheque Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Cheque No</label>
                    <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={e => setActionData({...actionData, cheque_number: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={e => setActionData({...actionData, bank_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cheque Date</label>
                    <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={e => setActionData({...actionData, cheque_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input type="number" step="0.01" required className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={e => setActionData({...actionData, cheque_amount: e.target.value})} />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setAction('')} className="px-4 py-2 border rounded hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Submit</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Status History</h2>
        <ul className="space-y-4">
          {pdc.status_history.map((h: any, idx: number) => (
            <li key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
              <div className="flex justify-between">
                <span className="font-semibold">{h.new_status}</span>
                <span className="text-sm text-gray-500">{new Date(h.changed_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-600">{h.change_reason}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PDCReceivedDetail;

