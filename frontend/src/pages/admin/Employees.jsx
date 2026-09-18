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
      <h1 className="page-title">Employee Accounts</h1>

      <Card title="Create Employee Account">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Full name" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input" />
          <input required placeholder="Employee ID" value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="input" />
          <input required placeholder="Department / Team" value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="input" />
          <input required placeholder="Position" value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            className="input" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input" />
          <input required type="password" placeholder="Initial password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary">
            Create Account
          </button>
        </form>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        {message && <p className="mt-2 text-sm font-medium text-emerald-600">{message}</p>}
      </Card>

      <Card title="All Employees">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="table-cell">Name</th>
                <th className="table-cell">Employee ID</th>
                <th className="table-cell">Department</th>
                <th className="table-cell">Position</th>
                <th className="table-cell">Role</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Credentials</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="table-row">
                  <td className="table-cell">{emp.full_name}</td>
                  <td className="table-cell">{emp.employee_id}</td>
                  <td className="table-cell">{emp.department}</td>
                  <td className="table-cell">{emp.position}</td>
                  <td className="table-cell capitalize">{emp.role}</td>
                  <td className="table-cell"><StatusBadge status={emp.status === 'active' ? 'present' : 'absent'} /></td>
                  <td className="table-cell">
                    {editingId === emp.id ? (
                      <div className="flex items-center gap-2">
                        <input type="password" placeholder="New password" value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="input-sm w-32" />
                        <button onClick={() => handleSetCredentials(emp.id)} className="btn-link">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-link-muted">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingId(emp.id)} className="btn-link">Set password</button>
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
