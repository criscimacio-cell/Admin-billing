import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import FieldError from '../../components/FieldError.jsx';
import { incentiveReceiptSchema } from '../../validation/schemas.js';
import { validateForm, inputClass } from '../../validation/validate.js';

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
  const [receiptErrors, setReceiptErrors] = useState({});

  function load() {
    api.get('/incentives/mine').then((res) => setIncentives(res.data));
  }
  useEffect(load, []);

  function startSubmit(id) {
    setSubmittingId(id);
    setReceiptForm(BLANK_RECEIPT);
    setReceiptErrors({});
    setFile(null);
  }

  async function handleSubmitReceipt(e, id) {
    e.preventDefault();
    const { valid, errors } = validateForm(incentiveReceiptSchema, receiptForm);
    setReceiptErrors(errors);
    if (!valid) return;
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
      setReceiptErrors(err.response?.data?.fields || {});
      toast.error(err.response?.data?.error || 'Failed to submit receipt');
    }
  }

  // Shared by both the table (sm+) and card (mobile) layouts below.
  function ReceiptForm({ id, gridClassName }) {
    return (
      <>
        <form onSubmit={(e) => handleSubmitReceipt(e, id)} className={gridClassName} noValidate>
          <input placeholder="OR / Receipt number" value={receiptForm.or_number}
            onChange={(e) => setReceiptForm({ ...receiptForm, or_number: e.target.value })} className="input" />
          <input placeholder="Vendor name" value={receiptForm.vendor_name}
            onChange={(e) => setReceiptForm({ ...receiptForm, vendor_name: e.target.value })} className="input" />
          <div>
            <input type="number" step="0.01" min="0" placeholder="Receipt amount (₱)" value={receiptForm.amount}
              onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} className={inputClass(receiptErrors, 'amount')} />
            <FieldError message={receiptErrors.amount} />
          </div>
          <input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand-700" />
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn-primary btn-sm">Submit</button>
            <button type="button" onClick={() => setSubmittingId(null)} className="btn-link-muted">Cancel</button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-400">Accepted: JPG, PNG, WEBP, or PDF — max 5MB.</p>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Incentives</h1>

      <Card title="Incentives Received">
        {/* Table layout — sm and up. Uploading a receipt on a phone is the
            most common real-world use of this page, so below sm we switch
            to a stacked card layout instead of squeezing/scrolling a table. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-sm">
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
                          <ReceiptForm id={inc.id} gridClassName="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4" />
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
        </div>

        {/* Card layout — below sm. */}
        <div className="space-y-3 sm:hidden">
          {incentives.map((inc) => {
            const isSubmitting = submittingId === inc.id;
            return (
              <div key={inc.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{inc.description}</div>
                    <div className="text-xs text-slate-500">{fmtDate(inc.given_date)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-slate-700">₱{Number(inc.amount).toFixed(2)}</div>
                    <StatusBadge status={inc.receipt_status} />
                  </div>
                </div>

                {inc.receipt_status === 'pending' && inc.receipt_verification_notes && (
                  <p className="mt-2 text-xs text-red-600">Sent back by Admin: {inc.receipt_verification_notes}</p>
                )}

                {inc.receipt_status !== 'verified' && !isSubmitting && (
                  <button onClick={() => startSubmit(inc.id)} className="btn-link mt-2">
                    {inc.receipt_status === 'pending' ? 'Submit Receipt' : 'Resubmit'}
                  </button>
                )}

                {isSubmitting && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ReceiptForm id={inc.id} gridClassName="grid grid-cols-1 items-start gap-3" />
                  </div>
                )}
              </div>
            );
          })}
          {incentives.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">No incentives recorded yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
