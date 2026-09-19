import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import FieldError from '../../components/FieldError.jsx';
import { employeeCreateSchema, setPasswordSchema } from '../../validation/schemas.js';
import { validateForm, inputClass } from '../../validation/validate.js';

const BLANK_FORM = {
  full_name: '', employee_id: '', department: '', position: '', email: '', password: '', role: 'employee',
};

// Section 2 — Admin manually creates each employee account and sets their
// initial password (no self-registration, no auto-generated temp passwords).
export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [roleEditingId, setRoleEditingId] = useState(null);
  const [roleDraft, setRoleDraft] = useState({ department_head_of: '', is_ceo: false });

  function load() {
    api.get('/users').then((res) => setEmployees(res.data));
    api.get('/users/departments').then((res) => setDepartments(res.data));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    const { valid, errors } = validateForm(employeeCreateSchema, form);
    setFormErrors(errors);
    if (!valid) return;
    try {
      await api.post('/users', form);
      setForm(BLANK_FORM);
      toast.success(`${form.full_name}'s account was created.`);
      load();
    } catch (err) {
      setFormErrors(err.response?.data?.fields || {});
      toast.error(err.response?.data?.error || 'Failed to create employee');
    }
  }

  async function handleSetCredentials(id) {
    const { valid, errors } = validateForm(setPasswordSchema, { password: editPassword });
    setPasswordError(errors.password || '');
    if (!valid) return;
    try {
      await api.patch(`/users/${id}`, { password: editPassword });
      setEditingId(null);
      setEditPassword('');
      setPasswordError('');
      toast.success('Password updated.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    }
  }

  async function toggleStatus(emp) {
    const nextStatus = emp.status === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/users/${emp.id}`, { status: nextStatus });
      toast.success(`${emp.full_name} is now ${nextStatus}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  }

  function startRoleEdit(emp) {
    setRoleEditingId(emp.id);
    setRoleDraft({ department_head_of: emp.department_head_of || '', is_ceo: emp.is_ceo });
  }

  async function saveRole(id) {
    try {
      await api.patch(`/users/${id}`, roleDraft);
      setRoleEditingId(null);
      toast.success('Approval capability updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update approval role');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Employee Accounts</h1>

      <Card title="Create Employee Account">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <div>
            <input placeholder="Full name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className={inputClass(formErrors, 'full_name')} />
            <FieldError message={formErrors.full_name} />
          </div>
          <div>
            <input placeholder="Employee ID" value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className={inputClass(formErrors, 'employee_id')} />
            <FieldError message={formErrors.employee_id} />
          </div>
          <div>
            <input placeholder="Department / Team" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className={inputClass(formErrors, 'department')} />
            <FieldError message={formErrors.department} />
          </div>
          <div>
            <input placeholder="Position" value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className={inputClass(formErrors, 'position')} />
            <FieldError message={formErrors.position} />
          </div>
          <div>
            <input type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass(formErrors, 'email')} />
            <FieldError message={formErrors.email} />
          </div>
          <div>
            <input type="password" placeholder="Initial password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass(formErrors, 'password')} />
            <FieldError message={formErrors.password} />
          </div>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary self-start">
            Create Account
          </button>
        </form>
      </Card>

      <Card
        title="All Employees"
        action={<span className="text-xs text-slate-400">Everyone is fundamentally an employee — Dept Head / CEO are approval capabilities on top</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="table-cell">Name</th>
                <th className="table-cell">Employee ID</th>
                <th className="table-cell">Department</th>
                <th className="table-cell">Position</th>
                <th className="table-cell">Role</th>
                <th className="table-cell">Approval Capability</th>
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
                  <td className="table-cell">
                    {roleEditingId === emp.id ? (
                      <div className="flex flex-col gap-1.5">
                        <select value={roleDraft.department_head_of}
                          onChange={(e) => setRoleDraft((d) => ({ ...d, department_head_of: e.target.value }))}
                          className="input-sm">
                          <option value="">Not a Dept Head</option>
                          {departments.map((d) => <option key={d} value={d}>Head of {d}</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input type="checkbox" checked={roleDraft.is_ceo}
                            onChange={(e) => setRoleDraft((d) => ({ ...d, is_ceo: e.target.checked }))} />
                          Is CEO (final approver)
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => saveRole(emp.id)} className="btn-link">Save</button>
                          <button onClick={() => setRoleEditingId(null)} className="btn-link-muted">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {emp.department_head_of && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                              Head of {emp.department_head_of}
                            </span>
                          )}
                          {emp.is_ceo && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">CEO</span>
                          )}
                          {!emp.department_head_of && !emp.is_ceo && <span className="text-xs text-slate-400">—</span>}
                        </div>
                        <button onClick={() => startRoleEdit(emp)} className="btn-link">Edit</button>
                      </div>
                    )}
                  </td>
                  <td className="table-cell"><StatusBadge status={emp.status === 'active' ? 'present' : 'absent'} /></td>
                  <td className="table-cell">
                    {editingId === emp.id ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <input type="password" placeholder="New password" value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className={inputClass({ password: passwordError }, 'password', 'input-sm w-32')} />
                          <button onClick={() => handleSetCredentials(emp.id)} className="btn-link">Save</button>
                          <button onClick={() => { setEditingId(null); setPasswordError(''); }} className="btn-link-muted">Cancel</button>
                        </div>
                        <FieldError message={passwordError} />
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
