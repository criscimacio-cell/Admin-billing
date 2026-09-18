import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Section 5 — Employee: "My leave history/balance."
export default function MyLeave() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    api.get('/leave-requests/mine').then((res) => setRequests(res.data));
    api.get(`/leave-balances/user/${user.id}`).then((res) => setBalances(res.data));
  }, [user.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Leave</h1>

      <Card title="Leave Balances">
        <div className="flex flex-wrap gap-4">
          {balances.map((b) => (
            <div key={b.leave_type_id} className="rounded-md bg-slate-50 px-4 py-2 text-center">
              <div className="text-lg font-bold text-brand-700">{b.remaining_credits}</div>
              <div className="text-xs text-slate-500">{b.name}</div>
            </div>
          ))}
          {balances.length === 0 && <p className="text-sm text-slate-500">No balances set up yet.</p>}
        </div>
      </Card>

      <Card title="My Leave Requests">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Leave Type</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{r.leave_type_name}</td>
                <td className="py-2 pr-4">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.is_half_day ? ' (half-day)' : ''}</td>
                <td className="py-2 pr-4 text-slate-600">{r.reason}</td>
                <td className="py-2 pr-4"><StatusBadge status={r.overall_status} /></td>
                <td className="py-2 pr-4 text-xs text-slate-500">
                  {r.late_flag && <div>Flagged late ({r.late_flag_reason === 'VL_LATE_SUBMISSION' ? 'VL' : 'SL'}) — informational only</div>}
                  {r.cert_pending && <div>Medical certificate pending with Admin</div>}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-slate-400">No leave requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
