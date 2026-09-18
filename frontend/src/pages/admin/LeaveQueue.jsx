import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
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
    <div className="flex flex-col gap-2 border-b border-slate-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="w-32 text-sm font-medium text-slate-600">{stage.label}</span>
        <StatusBadge status={status} />
        {storedName && <span className="text-xs text-slate-500">by {storedName}</span>}
        {at && <span className="btn-link-muted">{new Date(at).toLocaleString()}</span>}
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
          <button
            onClick={() => onAct(stage.key, 'approved', name, remark)}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Approve
          </button>
          <button
            onClick={() => onAct(stage.key, 'rejected', name, remark)}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// Section 3.2 — Leave requests queue: fixed Dept Head -> Admin -> CEO
// hierarchy (Admin records every step since no separate logins exist for
// the other two), conflict warnings, and late/cert flags for visibility.
export default function LeaveQueue() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api.get('/leave-requests/queue').then((res) => setRequests(res.data)).catch(() => setError('Failed to load queue'));
  }
  useEffect(load, []);

  async function act(id, stage, decision, name, remark) {
    try {
      await api.post(`/leave-requests/${id}/approve-stage`, { stage, decision, name, remark });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  }

  async function markCertReceived(id) {
    await api.post(`/leave-requests/${id}/cert-received`);
    load();
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Leave Requests</h1>

      {requests.length === 0 && <p className="text-slate-500">No leave requests yet.</p>}

      {requests.map((r) => {
        const nextStageIndex = STAGES.findIndex((s) => r[`${s.key}_status`] === 'pending');
        return (
          <Card
            key={r.id}
            title={`${r.full_name} (${r.employee_id}) — ${r.leave_type_name}`}
            action={<StatusBadge status={r.overall_status} />}
          >
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.is_half_day ? ' (half-day)' : ''}</span>
              <span>Reason: {r.reason}</span>
              {r.notify_email && <span>Notify: {r.notify_email}</span>}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {r.late_flag && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Late flag: {r.late_flag_reason === 'VL_LATE_SUBMISSION' ? 'VL late submission' : 'SL late notification'} (informational)
                </span>
              )}
              {r.cert_ack_confirmed && r.cert_pending && (
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                  Medical certificate pending
                </span>
              )}
              {r.conflicts?.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  Conflict: also out — {r.conflicts.map((c) => c.full_name).join(', ')}
                </span>
              )}
            </div>

            {r.cert_pending && (
              <button onClick={() => markCertReceived(r.id)}
                className="mb-3 rounded-md border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                Mark certificate received
              </button>
            )}

            <div>
              {STAGES.map((s, i) => (
                <StageRow key={s.key} stage={s} request={r} isNext={i === nextStageIndex}
                  onAct={(stage, decision, name, remark) => act(r.id, stage, decision, name, remark)} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
