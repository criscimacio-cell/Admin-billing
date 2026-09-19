import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import FieldError from '../../components/FieldError.jsx';
import { commentSchema } from '../../validation/schemas.js';
import { validateForm, inputClass } from '../../validation/validate.js';

// Section 5 — Employee: "My attendance history (with flag option)."
export default function MyAttendance() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [flagging, setFlagging] = useState(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  function load() {
    api.get(`/attendance/user/${user.id}`).then((res) => setData(res.data));
  }
  useEffect(load, [user.id]);

  async function submitFlag(id) {
    const { valid, errors } = validateForm(commentSchema, { comment });
    setCommentError(errors.comment || '');
    if (!valid) return;
    try {
      await api.post(`/attendance/${id}/flag`, { comment });
      setFlagging(null);
      setComment('');
      setCommentError('');
      toast.success('Attendance flagged for Admin review.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to flag attendance');
    }
  }

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Attendance History</h1>

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
            <tr className="table-head-row">
              <th className="table-cell">Date</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Flag</th>
              <th className="table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell">{new Date(r.date).toISOString().slice(0, 10)}</td>
                <td className="table-cell"><StatusBadge status={r.status} /></td>
                <td className="table-cell text-xs text-slate-500">
                  {r.flagged ? (r.flag_resolved ? 'Resolved by Admin' : 'Pending review') : '—'}
                </td>
                <td className="table-cell">
                  {!r.flagged && flagging !== r.id && (
                    <button onClick={() => setFlagging(r.id)} className="btn-link">
                      Flag as incorrect
                    </button>
                  )}
                  {flagging === r.id && (
                    <div>
                      <div className="flex items-center gap-2">
                        <input value={comment} onChange={(e) => setComment(e.target.value)}
                          placeholder="What's wrong?" className={inputClass({ comment: commentError }, 'comment', 'input-sm w-40')} />
                        <button onClick={() => submitFlag(r.id)} className="btn-link">Submit</button>
                        <button onClick={() => { setFlagging(null); setCommentError(''); }} className="btn-link-muted">Cancel</button>
                      </div>
                      <FieldError message={commentError} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data.records.length === 0 && (
              <tr><td colSpan={4} className="table-cell py-6 text-center text-slate-400">No attendance records yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
