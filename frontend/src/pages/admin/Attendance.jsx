import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave'];
const todayStr = () => new Date().toISOString().slice(0, 10);

// Section 3.1 — Attendance: Admin marks attendance per employee per day,
// a day-view across all employees, per-employee monthly summary, and the
// discrepancy resolution queue.
export default function Attendance() {
  const [tab, setTab] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState([]);
  const [dayRecords, setDayRecords] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [markStatus, setMarkStatus] = useState('present');
  const [queue, setQueue] = useState([]);
  const [summaryUser, setSummaryUser] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/users/roster').then((res) => setRoster(res.data));
  }, []);

  function loadDay() {
    api.get(`/attendance/day/${date}`).then((res) => setDayRecords(res.data));
  }
  useEffect(loadDay, [date]);

  function loadQueue() {
    api.get('/attendance/flags/queue').then((res) => setQueue(res.data));
  }
  useEffect(() => {
    if (tab === 'flags') loadQueue();
  }, [tab]);

  async function handleMark(e) {
    e.preventDefault();
    if (!selectedUser) return;
    await api.post('/attendance', { user_id: selectedUser, date, status: markStatus });
    loadDay();
  }

  async function loadSummary() {
    if (!summaryUser) return;
    const { data } = await api.get(`/attendance/user/${summaryUser}`);
    setSummary(data);
  }

  async function resolveFlag(id, corrected_status) {
    await api.post(`/attendance/${id}/resolve`, { corrected_status });
    loadQueue();
  }

  const markedUserIds = new Set(dayRecords.map((r) => r.user_id));
  const unmarked = roster.filter((r) => !markedUserIds.has(r.id));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Attendance</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          ['day', 'Day View'],
          ['summary', 'Employee Summary'],
          ['flags', `Flag Queue${queue.length ? ` (${queue.length})` : ''}`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-brand-700 text-brand-700' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'day' && (
        <div className="space-y-4">
          <Card title="Mark Attendance">
            <form onSubmit={handleMark} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Employee</label>
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select employee…</option>
                  {roster.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Status</label>
                <select value={markStatus} onChange={(e) => setMarkStatus(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                Save
              </button>
            </form>
            {unmarked.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">{unmarked.length} employee(s) not yet marked for {date}.</p>
            )}
          </Card>

          <Card title={`Day View — ${date}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {dayRecords.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{r.full_name} ({r.employee_id})</td>
                    <td className="py-2 pr-4">{r.department}</td>
                    <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                    <td className="py-2 pr-4 text-slate-500">{r.notes || '—'}</td>
                  </tr>
                ))}
                {dayRecords.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-slate-400">No attendance marked for this date.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'summary' && (
        <Card title="Per-Employee Attendance History">
          <div className="mb-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Employee</label>
              <select value={summaryUser} onChange={(e) => setSummaryUser(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select employee…</option>
                {roster.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>)}
              </select>
            </div>
            <button onClick={loadSummary} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              Load
            </button>
          </div>

          {summary && (
            <>
              <div className="mb-4 grid grid-cols-5 gap-3 text-center text-sm">
                {STATUSES.map((s) => (
                  <div key={s} className="rounded-md bg-slate-50 py-2">
                    <div className="text-lg font-bold text-brand-700">{summary.summary[s] || 0}</div>
                    <div className="capitalize text-slate-500">{s.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.records.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{new Date(r.date).toISOString().slice(0, 10)}</td>
                      <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                      <td className="py-2 pr-4 text-xs text-slate-500">
                        {r.flagged ? (r.flag_resolved ? 'Resolved' : 'Pending review') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}

      {tab === 'flags' && (
        <Card title="Discrepancy Flag Resolution Queue">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Current Status</th>
                <th className="py-2 pr-4">Employee Comment</th>
                <th className="py-2 pr-4">Resolve As</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{r.full_name} ({r.employee_id})</td>
                  <td className="py-2 pr-4">{new Date(r.date).toISOString().slice(0, 10)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                  <td className="py-2 pr-4 text-slate-600">{r.flag_comment}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1">
                      {STATUSES.map((s) => (
                        <button key={s} onClick={() => resolveFlag(r.id, s)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs capitalize hover:bg-brand-50 hover:text-brand-700">
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-slate-400">No flagged records awaiting review.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
