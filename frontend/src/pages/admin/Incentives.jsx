import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import FieldError from '../../components/FieldError.jsx';
import { incentiveCreateSchema, incentiveBulkCreateSchema } from '../../validation/schemas.js';
import { validateForm, inputClass } from '../../validation/validate.js';

const BLANK_FORM = { user_id: '', description: '', amount: '', given_date: '', notes: '' };
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
];

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// CEO-granted incentives (burger meal, coffee, etc.) on irregular dates —
// Admin logs the grant, the employee sends back a receipt, Admin verifies
// it for BIR substantiation. One row per employee per grant.
export default function Incentives() {
  const toast = useToast();
  const [roster, setRoster] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});

  useEffect(() => {
    api.get('/users/roster').then((res) => setRoster(res.data));
  }, []);

  function load() {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (employeeFilter) params.user_id = employeeFilter;
    api.get('/incentives', { params }).then((res) => setIncentives(res.data));
  }
  useEffect(load, [statusFilter, employeeFilter]);

  async function handleCreate(e) {
    e.preventDefault();
    const isBulk = form.user_id === 'ALL';
    const { valid, errors } = validateForm(isBulk ? incentiveBulkCreateSchema : incentiveCreateSchema, form);
    setFormErrors(errors);
    if (!valid) return;
    try {
      if (isBulk) {
        const { description, amount, given_date, notes } = form;
        const res = await api.post('/incentives/bulk', { description, amount, given_date, notes });
        toast.success(`Incentive logged for ${res.data.count} employees.`);
      } else {
        await api.post('/incentives', form);
        toast.success('Incentive logged.');
      }
      setForm(BLANK_FORM);
      setFormErrors({});
      load();
    } catch (err) {
      setFormErrors(err.response?.data?.fields || {});
      toast.error(err.response?.data?.error || 'Failed to log incentive');
    }
  }

  async function verify(id) {
    try {
      await api.post(`/incentives/${id}/verify`);
      toast.success('Receipt verified.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify receipt');
    }
  }

  async function reject(id) {
    const notes = rejectNotes[id];
    if (!notes) return;
    try {
      await api.post(`/incentives/${id}/reject`, { notes });
      setRejectNotes((s) => ({ ...s, [id]: '' }));
      toast.success('Receipt sent back to the employee.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject receipt');
    }
  }

  async function viewReceipt(id) {
    try {
      const res = await api.get(`/incentives/${id}/receipt-file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open receipt file');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Incentives</h1>

      <Card title="Log Incentive">
        <form onSubmit={handleCreate} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-5" noValidate>
          <div>
            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className={inputClass(formErrors, 'user_id')}>
              <option value="">Select employee…</option>
              <option value="ALL">All Employees</option>
              {roster.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>)}
            </select>
            <FieldError message={formErrors.user_id} />
            {form.user_id === 'ALL' && (
              <p className="help-text">Logs one incentive for each of the {roster.length} active employees.</p>
            )}
          </div>
          <div>
            <input list="incentive-descriptions" placeholder="Description (e.g. Burger Meal)"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass(formErrors, 'description')} />
            <FieldError message={formErrors.description} />
          </div>
          <datalist id="incentive-descriptions">
            <option value="Burger Meal" />
            <option value="Coffee" />
          </datalist>
          <div>
            <input type="number" step="0.01" min="0" placeholder="Amount (₱)"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass(formErrors, 'amount')} />
            <FieldError message={formErrors.amount} />
          </div>
          <div>
            <input type="date" value={form.given_date}
              onChange={(e) => setForm({ ...form, given_date: e.target.value })} className={inputClass(formErrors, 'given_date')} />
            <FieldError message={formErrors.given_date} />
          </div>
          <button type="submit" className="btn-primary">Log Incentive</button>
          <input placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input sm:col-span-2 lg:col-span-5" />
        </form>
      </Card>

      <Card
        title="All Incentives"
        action={
          <div className="flex gap-2">
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="input-sm w-44">
              <option value="">All employees</option>
              {roster.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-sm w-36">
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Incentive</th>
              <th className="table-cell">Amount</th>
              <th className="table-cell">Date Given</th>
              <th className="table-cell">Receipt</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {incentives.map((inc) => {
              const isOpen = expanded === inc.id;
              return (
                <Fragment key={inc.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setExpanded(isOpen ? null : inc.id)}>
                    <td className="table-cell">
                      <div className="font-medium text-slate-800">{inc.full_name}</div>
                      <div className="text-xs text-slate-400">{inc.employee_id}</div>
                    </td>
                    <td className="table-cell">{inc.description}</td>
                    <td className="table-cell">₱{Number(inc.amount).toFixed(2)}</td>
                    <td className="table-cell text-slate-600">{fmtDate(inc.given_date)}</td>
                    <td className="table-cell"><StatusBadge status={inc.receipt_status} /></td>
                    <td className="table-cell text-right">
                      <button className="btn-link">{isOpen ? 'Hide' : 'Details'}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="table-row bg-slate-50/60">
                      <td colSpan={6} className="px-4 pb-5 pt-1">
                        {inc.notes && <p className="mb-2 text-sm text-slate-600">Notes: {inc.notes}</p>}

                        {inc.receipt_status === 'pending' && (
                          <p className="text-sm text-slate-400">Waiting on the employee to submit a receipt.</p>
                        )}

                        {inc.receipt_status !== 'pending' && (
                          <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="mb-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                              <span><span className="text-slate-400">OR / Receipt #:</span> {inc.receipt_or_number || '—'}</span>
                              <span><span className="text-slate-400">Vendor:</span> {inc.receipt_vendor_name || '—'}</span>
                              <span><span className="text-slate-400">Receipt amount:</span> {inc.receipt_amount ? `₱${Number(inc.receipt_amount).toFixed(2)}` : '—'}</span>
                              <span><span className="text-slate-400">Submitted:</span> {inc.receipt_submitted_at ? new Date(inc.receipt_submitted_at).toLocaleString() : '—'}</span>
                            </div>
                            {inc.receipt_file_name && (
                              <button onClick={() => viewReceipt(inc.id)} className="btn-link">
                                View receipt file ({inc.receipt_file_name})
                              </button>
                            )}

                            {inc.receipt_verification_notes && (
                              <p className="mt-2 text-xs italic text-slate-500">Note: {inc.receipt_verification_notes}</p>
                            )}

                            {inc.receipt_status === 'submitted' && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button onClick={() => verify(inc.id)} className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700">
                                  Verify
                                </button>
                                <input placeholder="Rejection reason" value={rejectNotes[inc.id] || ''}
                                  onChange={(e) => setRejectNotes((s) => ({ ...s, [inc.id]: e.target.value }))}
                                  className="input-sm w-48" />
                                <button onClick={() => reject(inc.id)} className="btn-danger btn-sm">Reject</button>
                              </div>
                            )}
                            {inc.receipt_status === 'verified' && (
                              <p className="mt-3 text-xs text-emerald-700">
                                Verified {inc.receipt_verified_at ? new Date(inc.receipt_verified_at).toLocaleString() : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {incentives.length === 0 && (
              <tr><td colSpan={6} className="table-cell py-6 text-center text-slate-400">No incentives logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
