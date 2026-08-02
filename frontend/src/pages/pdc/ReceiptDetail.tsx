import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await api.get(`/rental-receipts/${id}`);
        setReceipt(response.data);
      } catch (error) {
        console.error('Failed to fetch receipt', error);
      }
    };
    fetchReceipt();
  }, [id]);

  const handlePost = async () => {
    if (window.confirm("Are you sure you want to Post this receipt? It cannot be edited after posting.")) {
      try {
        const response = await api.post(`/rental-receipts/${id}/post`);
        setReceipt(response.data);
      } catch (error) {
        console.error('Failed to post receipt', error);
      }
    }
  };

  if (!receipt) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Receipt {receipt.receipt_number}</h1>
        <div className="space-x-4">
          <button onClick={() => window.print()} className="bg-gray-100 text-gray-700 px-4 py-2 border rounded shadow hover:bg-gray-200">
            Print PDF
          </button>
          {receipt.receipt_status !== 'Posted' && (
            <button onClick={handlePost} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
              Post Receipt
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold">{receipt.receipt_status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-semibold">{receipt.receipt_date}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-semibold">{receipt.total_amount} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tenant</p>
            <p className="font-semibold">{receipt.tenant_id}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Payment Lines</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cheque No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Linked PDC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipt.payment_lines.map((line: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-gray-900">{line.line_number}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{line.instrument_type}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{line.cheque_number || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{line.bank_name || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{line.instrument_date || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{line.amount}</td>
                  <td className="px-4 py-2 text-sm text-indigo-600">
                    {line.pdc_received_id ? (
                      <Link to={`/pdc/register/${line.pdc_received_id}`}>View PDC</Link>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetail;
