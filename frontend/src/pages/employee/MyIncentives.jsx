import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

const BLANK_RECEIPT = { or_number: '', vendor_name: '', amount: '' };

// Perks the CEO hands out (burger meal, coffee, etc.) need a receipt sent
// back for BIR substantiation. This page lists what's owed and lets the
// employee upload the receipt against each one.
export default function MyIncentives() {
  const toast = useToast();
  const [incentives, setIncentives] = useState([]);
  const [submittingId, setSubmittingId] = useState(null);
  const [receiptForm, setReceiptForm] = useState(BLANK_RECEIPT);
  const [file, setFile] = useState(null);

  function load() {
    api.get('/incentives/mine').then((res) => setIncentives(res.data));
  }
  useEffect(load, []);

  function startSubmit(id) {
    setSubmittingId(id);
    setReceiptForm(BLANK_RECEIPT);
    setFile(null);
  }

  async function handleSubmitReceipt(e, id) {
    e.preventDefault();
    if (!file) {
      toast.error('Please attach the receipt file.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('or_number', receiptForm.or_number);
    formData.append('vendor_name', receiptForm.vendor_name);
    formData.append('amount', receiptForm.amount);

    try {
      await api.post(`/incentives/${id}/receipt`, formData);
      setSubmittingId(null);
      toast.success('Receipt submitted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit receipt');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Incentives</h1>

      <Card title="Incentives Received">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Incentive</th>
              <th className="table-cell">Amount</th>
              <th className="table-cell">Date Given</th>
              <th className="table-cell">Receipt Status</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {incentives.map((inc) => {
              const isSubmitting = submittingId === inc.id;
              return (
                <Fragment key={inc.id}>
                  <tr className="table-row">
                    <td className="table-cell">{inc.description}</td>
                    <td className="table-cell">₱{Number(inc.amount).toFixed(2)}</td>
                    <td className="table-cell text-slate-600">{fmtDate(inc.given_date)}</td>
                    <td className="table-cell"><StatusBadge status={inc.receipt_status} /></td>
                    <td className="table-cell text-right">
                      {inc.receipt_status !== 'verified' && !isSubmitting && (
                        <button onClick={() => startSubmit(inc.id)} className="btn-link">
                          {inc.receipt_status === 'pending' ? 'Submit Receipt' : 'Resubmit'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {inc.receipt_status === 'pending' && inc.receipt_verification_notes && (
                    <tr className="table-row">
                      <td colSpan={5} className="px-4 pb-3 pt-0 text-xs text-red-600">
                        Sent back by Admin: {inc.receipt_verification_notes}
                      </td>
                    </tr>
                  )}

                  {isSubmitting && (
                    <tr className="table-row bg-slate-50/60">
                      <td colSpan={5} className="px-4 pb-5 pt-1">
                        <form onSubmit={(e) => handleSubmitReceipt(e, inc.id)} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <input placeholder="OR / Receipt number" value={receiptForm.or_number}
                            onChange={(e) => setReceiptForm({ ...receiptForm, or_number: e.target.value })} className="input" />
                          <input placeholder="Vendor name" value={receiptForm.vendor_name}
                            onChange={(e) => setReceiptForm({ ...receiptForm, vendor_name: e.target.value })} className="input" />
                          <input type="number" step="0.01" min="0" placeholder="Receipt amount (₱)" value={receiptForm.amount}
                            onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} className="input" />
                          <input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="input file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand-700" />
                          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
                            <button type="submit" className="btn-primary btn-sm">Submit</button>
                            <button type="button" onClick={() => setSubmittingId(null)} className="btn-link-muted">Cancel</button>
                          </div>
                        </form>
                        <p className="mt-2 text-xs text-slate-400">Accepted: JPG, PNG, WEBP, or PDF — max 5MB.</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {incentives.length === 0 && (
              <tr><td colSpan={5} className="table-cell py-6 text-center text-slate-400">No incentives recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
