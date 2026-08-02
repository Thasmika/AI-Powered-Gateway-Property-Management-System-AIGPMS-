import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ReceiptVoucherEntry: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    tenant_id: '',
    property_id: '',
    lease_id: '',
    lease_version_id: '',
    total_amount: 0,
    currency: 'AED',
    remarks: '',
  });

  const [lines, setLines] = useState([{
    instrument_type: 'PDC',
    amount: 0,
    cheque_number: '',
    bank_name: '',
    instrument_date: ''
  }]);

  const [autoGen, setAutoGen] = useState({
    numCheques: 1,
    startDate: new Date().toISOString().split('T')[0],
    intervalMonths: 1
  });

  const [error, setError] = useState('');

  const handleAutoGen = () => {
    if (!formData.total_amount || formData.total_amount <= 0) {
      setError("Please enter a valid total amount before auto-generating.");
      return;
    }
    const amountPerCheque = (formData.total_amount / autoGen.numCheques).toFixed(2);
    const newLines = [];
    let currentDate = new Date(autoGen.startDate);
    
    for (let i = 0; i < autoGen.numCheques; i++) {
      newLines.push({
        instrument_type: 'PDC',
        amount: Number(amountPerCheque),
        cheque_number: '',
        bank_name: '',
        instrument_date: currentDate.toISOString().split('T')[0]
      });
      // add interval
      currentDate.setMonth(currentDate.getMonth() + Number(autoGen.intervalMonths));
    }
    setLines(newLines);
    setError('');
  };

  const addLine = () => {
    setLines([...lines, {
      instrument_type: 'PDC',
      amount: 0,
      cheque_number: '',
      bank_name: '',
      instrument_date: ''
    }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const calculatedTotal = lines.reduce((sum, line) => sum + Number(line.amount), 0);
    if (calculatedTotal !== Number(formData.total_amount)) {
      setError(`Receipt total (${formData.total_amount}) does not match sum of lines (${calculatedTotal})`);
      return;
    }

    try {
      const payload = {
        ...formData,
        payment_lines: lines.map(line => ({
          ...line,
          amount: Number(line.amount)
        }))
      };
      const response = await api.post('/rental-receipts/', payload);
      navigate(`/pdc/receipts/${response.data.receipt_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create receipt');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Rental Receipt</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Receipt Header</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Receipt Date</label>
              <input type="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.receipt_date} onChange={e => setFormData({...formData, receipt_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Amount</label>
              <input type="number" step="0.01" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})} />
            </div>
            {/* Note: In a real app, these would be dropdowns populated from the backend */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
              <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.tenant_id} onChange={e => setFormData({...formData, tenant_id: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Property ID</label>
              <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.property_id} onChange={e => setFormData({...formData, property_id: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lease ID</label>
              <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.lease_id} onChange={e => setFormData({...formData, lease_id: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lease Version ID</label>
              <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.lease_version_id} onChange={e => setFormData({...formData, lease_version_id: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-semibold">Auto-Generate PDCs</h2>
          </div>
          <div className="flex gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Cheques</label>
              <input type="number" min="1" value={autoGen.numCheques} onChange={e => setAutoGen({...autoGen, numCheques: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" value={autoGen.startDate} onChange={e => setAutoGen({...autoGen, startDate: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interval (Months)</label>
              <select value={autoGen.intervalMonths} onChange={e => setAutoGen({...autoGen, intervalMonths: Number(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300">
                <option value={1}>Monthly (1 month)</option>
                <option value={3}>Quarterly (3 months)</option>
                <option value={6}>Semi-Annually (6 months)</option>
                <option value={12}>Annually (12 months)</option>
              </select>
            </div>
            <button type="button" onClick={handleAutoGen} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Generate Lines
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 mt-6">
            <h2 className="text-xl font-semibold">Payment Lines</h2>
            <button type="button" onClick={addLine} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Add Line manually</button>
          </div>
          
          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-4 items-end border p-4 rounded bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Type</label>
                  <select value={line.instrument_type} onChange={e => updateLine(idx, 'instrument_type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
                    <option value="PDC">PDC</option>
                    <option value="Current-Dated Cheque">Current-Dated Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Amount</label>
                  <input type="number" step="0.01" required value={line.amount} onChange={e => updateLine(idx, 'amount', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Cheque No</label>
                  <input type="text" value={line.cheque_number} onChange={e => updateLine(idx, 'cheque_number', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Bank</label>
                  <input type="text" value={line.bank_name} onChange={e => updateLine(idx, 'bank_name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date</label>
                  <input type="date" value={line.instrument_date} onChange={e => updateLine(idx, 'instrument_date', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300" />
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-red-500 mb-2">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/pdc/receipts')} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Receipt</button>
        </div>
      </form>
    </div>
  );
};

export default ReceiptVoucherEntry;
