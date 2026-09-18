import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const BLANK_FORM = {
  full_name: '', employee_id: '', department: '', position: '', email: '', password: '', role: 'employee',
};

// Section 2 — Admin manually creates each employee account and sets their
// initial password (no self-registration, no auto-generated temp passwords).
export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api.get('/users').then((res) => setEmployees(res.data));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/users', form);
      setForm(BLANK_FORM);
      setMessage('Employee account created.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create employee');
    }
  }

  async function handleSetCredentials(id) {
    if (!editPassword) return;
    await api.patch(`/users/${id}`, { password: editPassword });
    setEditingId(null);
    setEditPassword('');
    setMessage('Password updated.');
  }

  async function toggleStatus(emp) {
    await api.patch(`/users/${emp.id}`, { status: emp.status === 'active' ? 'disabled' : 'active' });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Employee Accounts</h1>

      <Card title="Create Employee Account">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Full name" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Employee ID" value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Department / Team" value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Position" value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Initial password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            Create Account
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
      </Card>

      <Card title="All Employees">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Employee ID</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Position</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Credentials</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{emp.full_name}</td>
                  <td className="py-2 pr-4">{emp.employee_id}</td>
                  <td className="py-2 pr-4">{emp.department}</td>
                  <td className="py-2 pr-4">{emp.position}</td>
                  <td className="py-2 pr-4 capitalize">{emp.role}</td>
                  <td className="py-2 pr-4"><StatusBadge status={emp.status === 'active' ? 'present' : 'absent'} /></td>
                  <td className="py-2 pr-4">
                    {editingId === emp.id ? (
                      <div className="flex items-center gap-2">
                        <input type="password" placeholder="New password" value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs" />
                        <button onClick={() => handleSetCredentials(emp.id)} className="text-xs font-medium text-brand-700">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingId(emp.id)} className="text-xs font-medium text-brand-700">Set password</button>
                        <button onClick={() => toggleStatus(emp)} className="text-xs font-medium text-slate-500">
                          {emp.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
