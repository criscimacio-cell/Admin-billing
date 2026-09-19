import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApprovalCounts } from '../context/ApprovalCountsContext.jsx';
import Card from '../components/Card.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STAGES = [
  { key: 'dept_head', label: 'Department Head' },
  { key: 'admin', label: 'Admin' },
  { key: 'ceo', label: 'CEO' },
];

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function StageStatusRow({ stage, request }) {
  const status = request[`${stage.key}_status`];
  const at = request[`${stage.key}_at`];
  const name = request[`${stage.key}_name`];
  const remark = request[`${stage.key}_remark`];
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="w-32 text-sm font-medium text-slate-600">{stage.label}</span>
      <StatusBadge status={status} />
      {name && <span className="text-xs text-slate-500">by {name}</span>}
      {at && <span className="text-xs text-slate-400">{new Date(at).toLocaleString()}</span>}
      {remark && <span className="text-xs italic text-slate-500">"{remark}"</span>}
    </div>
  );
}

// A Dept Head's own leave-approval queue — scoped to their department
// only. They act as themselves (no proxy name field — the backend fills
// their name in automatically), unlike Admin's queue which still supports
// proxying a stage that has no assigned account.
export default function TeamApprovals() {
  const { user } = useAuth();
  const toast = useToast();
  const { refresh: refreshApprovalCounts } = useApprovalCounts();
  const [requests, setRequests] = useState([]);
  const [deptAttendance, setDeptAttendance] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');

  function load() {
    api.get('/leave-requests/dept-queue').then((res) => setRequests(res.data)).catch(() => setError('Failed to load queue'));
    api.get('/attendance/my-department').then((res) => setDeptAttendance(res.data));
  }
  useEffect(load, []);

  async function act(id, decision) {
    try {
      await api.post(`/leave-requests/${id}/approve-stage`, {
        stage: 'dept_head', decision, remark: remarks[id] || '',
      });
      setRemarks((s) => ({ ...s, [id]: '' }));
      toast.success(`Request ${decision}.`);
      load();
      refreshApprovalCounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Team Approvals — {user?.department_head_of}</h1>

      <Card title="Leave Requests">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Type</th>
              <th className="table-cell">Dates</th>
              <th className="table-cell">Status</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const isOpen = expanded === r.id;
              const canAct = r.dept_head_status === 'pending' && r.overall_status === 'pending';
              return (
                <Fragment key={r.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <td className="table-cell">
                      <div className="font-medium text-slate-800">{r.full_name}</div>
                      <div className="text-xs text-slate-400">{r.employee_id}</div>
                    </td>
                    <td className="table-cell">{r.leave_type_name}</td>
                    <td className="table-cell text-slate-600">
                      {fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.is_half_day ? ' (half-day)' : ''}
                    </td>
                    <td className="table-cell"><StatusBadge status={r.overall_status} /></td>
                    <td className="table-cell text-right">
                      <button className="btn-link">{canAct ? 'Review' : 'Details'}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="table-row bg-slate-50/60">
                      <td colSpan={5} className="px-4 pb-5 pt-1">
                        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                          <span>Reason: {r.reason}</span>
                          {r.late_flag && (
                            <span className="text-amber-700">
                              Late flag: {r.late_flag_reason === 'VL_LATE_SUBMISSION' ? 'VL late submission' : 'SL late notification'} (informational)
                            </span>
                          )}
                        </div>
                        {r.conflicts?.length > 0 && (
                          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            Also out on overlapping dates: {r.conflicts.map((c) => c.full_name).join(', ')}
                          </p>
                        )}

                        <div className="rounded-lg border border-slate-200 bg-white px-4">
                          {STAGES.map((s) => <StageStatusRow key={s.key} stage={s} request={r} />)}
                        </div>

                        {canAct && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input placeholder="Remark (optional)" value={remarks[r.id] || ''}
                              onChange={(e) => setRemarks((s) => ({ ...s, [r.id]: e.target.value }))}
                              className="input-sm w-56" />
                            <button onClick={() => act(r.id, 'approved')} className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700">
                              Approve
                            </button>
                            <button onClick={() => act(r.id, 'rejected')} className="btn-danger btn-sm">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="table-cell py-6 text-center text-slate-400">No leave requests from your department yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card title="Department Attendance — This Month" action={<span className="text-xs text-slate-400">Read-only</span>}>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {deptAttendance.map((e) => {
              const a = e.attendance_this_month;
              const chips = [
                ['Present', a.present, 'bg-emerald-50 text-emerald-700'],
                ['Absent', a.absent, 'bg-red-50 text-red-700'],
                ['Late', a.late, 'bg-amber-50 text-amber-700'],
                ['Half-day', a.half_day, 'bg-sky-50 text-sky-700'],
                ['On leave', a.on_leave, 'bg-brand-50 text-brand-700'],
              ].filter(([, count]) => count > 0);
              return (
                <tr key={e.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-slate-800">{e.full_name}</div>
                    <div className="text-xs text-slate-400">{e.employee_id} · {e.position}</div>
                  </td>
                  <td className="table-cell">
                    {chips.length === 0 ? (
                      <span className="text-slate-400">No attendance marked yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map(([label, count, style]) => (
                          <span key={label} className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label} {count}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {deptAttendance.length === 0 && (
              <tr><td colSpan={2} className="table-cell py-6 text-center text-slate-400">No employees in this department yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
