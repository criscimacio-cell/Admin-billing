import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';

// Section 3.2 — Configurable leave types with default annual credits.
export default function LeaveTypesConfig() {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', default_credits_per_year: '' });
  const [edits, setEdits] = useState({});

  function load() {
    api.get('/leave-types').then((res) => setTypes(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/leave-types', {
        ...form,
        default_credits_per_year: Number(form.default_credits_per_year) || 0,
      });
      toast.success(`${form.name} leave type added.`);
      setForm({ name: '', code: '', default_credits_per_year: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add leave type');
    }
  }

  async function handleUpdate(id) {
    const patch = edits[id];
    if (!patch) return;
    try {
      await api.patch(`/leave-types/${id}`, patch);
      setEdits((e) => ({ ...e, [id]: undefined }));
      toast.success('Leave type updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update leave type');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Leave Types &amp; Credits</h1>

      <Card title="Add Leave Type">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input" />
          </div>
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Code</label>
            <input required maxLength={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="input w-24" />
          </div>
          <div>
            <label className="label-sm normal-case tracking-normal text-slate-500">Default credits / year</label>
            <input type="number" step="0.5" value={form.default_credits_per_year}
              onChange={(e) => setForm({ ...form, default_credits_per_year: e.target.value })}
              className="input w-32" />
          </div>
          <button type="submit" className="btn-primary">
            Add
          </button>
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
                    className="input-sm" />
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
