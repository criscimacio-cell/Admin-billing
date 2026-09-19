import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useApprovalCounts } from '../../context/ApprovalCountsContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const STAGES = [
  { key: 'dept_head', label: 'Department Head', needsName: true },
  { key: 'admin', label: 'Admin', needsName: false },
  { key: 'ceo', label: 'CEO', needsName: true },
];

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function StageRow({ stage, request, isNext, onAct }) {
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');
  const status = request[`${stage.key}_status`];
  const at = request[`${stage.key}_at`];
  const storedName = request[`${stage.key}_name`];
  const storedRemark = request[`${stage.key}_remark`];

  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="w-32 text-sm font-medium text-slate-600">{stage.label}</span>
        <StatusBadge status={status} />
        {storedName && <span className="text-xs text-slate-500">by {storedName}</span>}
        {at && <span className="text-xs text-slate-400">{new Date(at).toLocaleString()}</span>}
        {storedRemark && <span className="text-xs italic text-slate-500">"{storedRemark}"</span>}
      </div>

      {isNext && status === 'pending' && request.overall_status === 'pending' && (
        <div className="flex flex-wrap items-center gap-2">
          {stage.needsName && (
            <input placeholder={`${stage.label} name`} value={name} onChange={(e) => setName(e.target.value)}
              className="input-sm w-40" />
          )}
          <input placeholder="Remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)}
            className="input-sm w-40" />
          <button onClick={() => onAct(stage.key, 'approved', name, remark)} className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700">
            Approve
          </button>
          <button onClick={() => onAct(stage.key, 'rejected', name, remark)} className="btn-danger btn-sm">
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function FlagPills({ r }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {r.late_flag && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Late
        </span>
      )}
      {r.cert_pending && (
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
          Cert pending
        </span>
      )}
      {r.conflicts?.length > 0 && (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
          Conflict
        </span>
      )}
    </div>
  );
}

// Section 3.2 — Leave requests queue as a table (one row per request, dense
// scanning across many rows) with an expandable detail row for the fixed
// Dept Head -> Admin -> CEO hierarchy, conflict warnings, and late/cert flags.
export default function LeaveQueue() {
  const toast = useToast();
  const { refresh: refreshApprovalCounts } = useApprovalCounts();
  const [requests, setRequests] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get('/leave-requests/queue').then((res) => setRequests(res.data)).catch(() => setError('Failed to load queue'));
  }
  useEffect(load, []);

  async function act(id, stage, decision, name, remark) {
    try {
      await api.post(`/leave-requests/${id}/approve-stage`, { stage, decision, name, remark });
      toast.success(`${stage.replace('_', ' ')} stage ${decision}.`);
      load();
      refreshApprovalCounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  }

  async function markCertReceived(id) {
    try {
      await api.post(`/leave-requests/${id}/cert-received`);
      toast.success('Certificate marked as received.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Leave Requests</h1>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Type</th>
              <th className="table-cell">Dates</th>
              <th className="table-cell">Flags</th>
              <th className="table-cell">Status</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const isOpen = expanded === r.id;
              const nextStageIndex = STAGES.findIndex((s) => r[`${s.key}_status`] === 'pending');
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
                    <td className="table-cell"><FlagPills r={r} /></td>
                    <td className="table-cell"><StatusBadge status={r.overall_status} /></td>
                    <td className="table-cell text-right">
                      <button className="btn-link">{isOpen ? 'Hide' : 'Review'}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="table-row bg-slate-50/60">
                      <td colSpan={6} className="px-4 pb-5 pt-1">
                        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                          <span>Reason: {r.reason}</span>
                          {r.notify_email && <span>Notify: {r.notify_email}</span>}
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

                        {r.cert_pending && (
                          <button onClick={() => markCertReceived(r.id)} className="btn-secondary btn-sm mb-3">
                            Mark certificate received
                          </button>
                        )}

                        <div className="rounded-lg border border-slate-200 bg-white px-4">
                          {STAGES.map((s, i) => (
                            <StageRow key={s.key} stage={s} request={r} isNext={i === nextStageIndex}
                              onAct={(stage, decision, name, remark) => act(r.id, stage, decision, name, remark)} />
                          ))}
                        </div>
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
