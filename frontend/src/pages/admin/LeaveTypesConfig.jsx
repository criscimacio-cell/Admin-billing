import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

// Section 3.2 — Configurable leave types with default annual credits.
export default function LeaveTypesConfig() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', default_credits_per_year: '' });
  const [edits, setEdits] = useState({});

  function load() {
    api.get('/leave-types').then((res) => setTypes(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/leave-types', {
      ...form,
      default_credits_per_year: Number(form.default_credits_per_year) || 0,
    });
    setForm({ name: '', code: '', default_credits_per_year: '' });
    load();
  }

  async function handleUpdate(id) {
    const patch = edits[id];
    if (!patch) return;
    await api.patch(`/leave-types/${id}`, patch);
    setEdits((e) => ({ ...e, [id]: undefined }));
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Leave Types &amp; Credits</h1>

      <Card title="Add Leave Type">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Code</label>
            <input required maxLength={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Default credits / year</label>
            <input type="number" step="0.5" value={form.default_credits_per_year}
              onChange={(e) => setForm({ ...form, default_credits_per_year: e.target.value })}
              className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            Add
          </button>
        </form>
      </Card>

      <Card title="Configured Leave Types">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Default Credits / Year</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono">{t.code}</td>
                <td className="py-2 pr-4">
                  <input defaultValue={t.name}
                    onChange={(e) => setEdits((s) => ({ ...s, [t.id]: { ...s[t.id], name: e.target.value } }))}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm" />
                </td>
                <td className="py-2 pr-4">
                  <input type="number" step="0.5" defaultValue={t.default_credits_per_year}
                    onChange={(e) => setEdits((s) => ({ ...s, [t.id]: { ...s[t.id], default_credits_per_year: Number(e.target.value) } }))}
                    className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm" />
                </td>
                <td className="py-2 pr-4">
                  <button onClick={() => handleUpdate(t.id)} className="text-xs font-medium text-brand-700">Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
