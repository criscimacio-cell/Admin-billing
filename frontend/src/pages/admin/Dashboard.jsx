import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

// Section 3.3 — Admin dashboard stats: employees on leave today,
// pending leave requests count, today's attendance snapshot.
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/admin')
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load dashboard stats'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Employees on Leave Today">
          <p className="text-3xl font-bold text-brand-700">{stats.employees_on_leave_today}</p>
        </Card>
        <Card title="Pending Leave Requests">
          <p className="text-3xl font-bold text-amber-600">{stats.pending_leave_requests}</p>
        </Card>
        <Card title="Today's Attendance Snapshot">
          {stats.todays_attendance_snapshot.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance marked yet today.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {stats.todays_attendance_snapshot.map((row) => (
                <li key={row.status} className="flex justify-between capitalize">
                  <span>{row.status.replace('_', ' ')}</span>
                  <span className="font-semibold">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
