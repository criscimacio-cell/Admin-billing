import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import FieldError from '../../components/FieldError.jsx';
import { leaveTypeCreateSchema, leaveTypeUpdateSchema } from '../../validation/schemas.js';
import { validateForm, inputClass } from '../../validation/validate.js';

// Section 3.2 — Configurable leave types with default annual credits.
export default function LeaveTypesConfig() {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', default_credits_per_year: '' });
  const [formErrors, setFormErrors] = useState({});
  const [edits, setEdits] = useState({});
  const [editErrors, setEditErrors] = useState({});

  function load() {
    api.get('/leave-types').then((res) => setTypes(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    const { valid, errors } = validateForm(leaveTypeCreateSchema, form);
    setFormErrors(errors);
    if (!valid) return;
    try {
      await api.post('/leave-types', {
        ...form,
        default_credits_per_year: Number(form.default_credits_per_year) || 0,
      });
      toast.success(`${form.name} leave type added.`);
      setForm({ name: '', code: '', default_credits_per_year: '' });
      setFormErrors({});
      load();
    } catch (err) {
      setFormErrors(err.response?.data?.fields || {});
      toast.error(err.response?.data?.error || 'Failed to add leave type');
    }
  }

  async function handleUpdate(id) {
    const patch = edits[id];
    if (!patch) return;
    const { valid, errors } = validateForm(leaveTypeUpdateSchema, patch);
    setEditErrors((s) => ({ ...s, [id]: errors }));
    if (!valid) return;
    try {
      await api.patch(`/leave-types/${id}`, patch);
      setEdits((e) => ({ ...e, [id]: undefined }));
      setEditErrors((s) => ({ ...s, [id]: {} }));
      toast.success('Leave type updated.');
      load();
    } catch (err) {
      setEditErrors((s) => ({ ...s, [id]: err.response?.data?.fields || {} }));
      toast.error(err.response?.data?.error || 'Failed to update leave type');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Leave Types &amp; Credits</h1>

      <Card title="Add Leave Type">
        <form onSubmit={handleCreate} className="flex flex-wrap items-start gap-3" noValidate>
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass(formErrors, 'name')} />
            <FieldError message={formErrors.name} />
          </div>
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Code</label>
            <input maxLength={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputClass(formErrors, 'code', 'input w-24')} />
            <FieldError message={formErrors.code} />
          </div>
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Default credits / year</label>
            <input type="number" step="0.5" value={form.default_credits_per_year}
              onChange={(e) => setForm({ ...form, default_credits_per_year: e.target.value })}
              className="input w-32" />
          </div>
          <div>
            <label className="label-sm invisible">Add</label>
            <button type="submit" className="btn-primary">
              Add
            </button>
          </div>
        </form>
      </Card>

      <Card title="Configured Leave Types">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Code</th>
              <th className="table-cell">Name</th>
              <th className="table-cell">Default Credits / Year</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="table-row">
                <td className="py-2 pr-4 font-mono">{t.code}</td>
                <td className="table-cell">
                  <input defaultValue={t.name}
                    onChange={(e) => setEdits((s) => ({ ...s, [t.id]: { ...s[t.id], name: e.target.value } }))}
                    className={inputClass(editErrors[t.id] || {}, 'name', 'input-sm')} />
                  <FieldError message={editErrors[t.id]?.name} />
                </td>
                <td className="table-cell">
                  <input type="number" step="0.5" defaultValue={t.default_credits_per_year}
                    onChange={(e) => setEdits((s) => ({ ...s, [t.id]: { ...s[t.id], default_credits_per_year: Number(e.target.value) } }))}
                    className="input-sm w-28" />
                </td>
                <td className="table-cell">
                  <button onClick={() => handleUpdate(t.id)} className="btn-link">Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
