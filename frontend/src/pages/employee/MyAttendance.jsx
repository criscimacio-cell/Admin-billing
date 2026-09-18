import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

// Section 5 — Employee: "My attendance history (with flag option)."
export default function MyAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [flagging, setFlagging] = useState(null);
  const [comment, setComment] = useState('');

  function load() {
    api.get(`/attendance/user/${user.id}`).then((res) => setData(res.data));
  }
  useEffect(load, [user.id]);

  async function submitFlag(id) {
    if (!comment.trim()) return;
    await api.post(`/attendance/${id}/flag`, { comment });
    setFlagging(null);
    setComment('');
    load();
  }

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Attendance History</h1>

      <Card title="Monthly Summary">
        <div className="grid grid-cols-5 gap-3 text-center text-sm">
          {['present', 'absent', 'late', 'half_day', 'on_leave'].map((s) => (
            <div key={s} className="rounded-md bg-slate-50 py-2">
              <div className="text-lg font-bold text-brand-700">{data.summary[s] || 0}</div>
              <div className="capitalize text-slate-500">{s.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Records">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Flag</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{new Date(r.date).toISOString().slice(0, 10)}</td>
                <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-2 pr-4 text-xs text-slate-500">
                  {r.flagged ? (r.flag_resolved ? 'Resolved by Admin' : 'Pending review') : '—'}
                </td>
                <td className="py-2 pr-4">
                  {!r.flagged && flagging !== r.id && (
                    <button onClick={() => setFlagging(r.id)} className="text-xs font-medium text-brand-700">
                      Flag as incorrect
                    </button>
                  )}
                  {flagging === r.id && (
                    <div className="flex items-center gap-2">
                      <input value={comment} onChange={(e) => setComment(e.target.value)}
                        placeholder="What's wrong?" className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <button onClick={() => submitFlag(r.id)} className="text-xs font-medium text-brand-700">Submit</button>
                      <button onClick={() => setFlagging(null)} className="text-xs text-slate-400">Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data.records.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-slate-400">No attendance records yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
