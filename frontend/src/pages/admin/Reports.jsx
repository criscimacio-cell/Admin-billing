import { useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => todayStr().slice(0, 8) + '01';

// Section 3.3 — Monthly attendance summary export and leave summary
// export (CSV/Excel). Downloaded via an authenticated fetch since the
// JWT travels in an Authorization header, not a cookie.
export default function Reports() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [error, setError] = useState('');

  async function download(path, filename) {
    setError('');
    try {
      const res = await api.get(path, { params: { from, to }, responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate report');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Reports &amp; Export</h1>
      <Card title="Date Range">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Attendance Summary">
          <p className="mb-3 text-sm text-slate-500">Present/absent/late/half-day/on-leave counts per employee for the selected range.</p>
          <button
            onClick={() => download('/reports/attendance.csv', `attendance_${from}_to_${to}.csv`)}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Download CSV
          </button>
        </Card>
        <Card title="Leave Summary">
          <p className="mb-3 text-sm text-slate-500">All leave requests overlapping the selected range, with status and flags.</p>
          <button
            onClick={() => download('/reports/leave.csv', `leave_${from}_to_${to}.csv`)}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Download CSV
          </button>
        </Card>
      </div>
    </div>
  );
}
