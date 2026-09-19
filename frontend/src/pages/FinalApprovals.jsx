import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
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

// The CEO's own company-wide final-stage queue. They act as themselves
// (no proxy name field) once Dept Head and Admin have both signed off.
export default function FinalApprovals() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');

  function load() {
    api.get('/leave-requests/ceo-queue').then((res) => setRequests(res.data)).catch(() => setError('Failed to load queue'));
  }
  useEffect(load, []);

  async function act(id, decision) {
    try {
      await api.post(`/leave-requests/${id}/approve-stage`, {
        stage: 'ceo', decision, remark: remarks[id] || '',
      });
      setRemarks((s) => ({ ...s, [id]: '' }));
      toast.success(`Request ${decision}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Final Approvals</h1>

      <Card title="Leave Requests — Company-Wide">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Department</th>
              <th className="table-cell">Type</th>
              <th className="table-cell">Dates</th>
              <th className="table-cell">Status</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const isOpen = expanded === r.id;
              const canAct = r.dept_head_status === 'approved' && r.admin_status === 'approved' && r.ceo_status === 'pending' && r.overall_status === 'pending';
              return (
                <Fragment key={r.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <td className="table-cell">
                      <div className="font-medium text-slate-800">{r.full_name}</div>
                      <div className="text-xs text-slate-400">{r.employee_id}</div>
                    </td>
                    <td className="table-cell">{r.department}</td>
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
                      <td colSpan={6} className="px-4 pb-5 pt-1">
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
              <tr><td colSpan={6} className="table-cell py-6 text-center text-slate-400">No leave requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
