import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';
import StatTile from '../../components/StatTile.jsx';
import AttendanceTrendChart from '../../components/charts/AttendanceTrendChart.jsx';
import LeaveStatusChart from '../../components/charts/LeaveStatusChart.jsx';
import { IconUsers, IconClipboard, IconCalendarCheck, IconActivity } from '../../components/icons.jsx';

// Section 3.3 — Admin dashboard stats: employees on leave today, pending
// leave requests count, today's attendance snapshot — plus a KPI row and
// trend/breakdown charts built from the same aggregates.
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
      <h1 className="page-title">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total employees" value={stats.total_employees} icon={IconUsers} accent="slate" />
        <StatTile label="On leave today" value={stats.employees_on_leave_today} icon={IconCalendarCheck} accent="brand" />
        <StatTile label="Pending leave requests" value={stats.pending_leave_requests} icon={IconClipboard} accent="amber" />
        <StatTile
          label="Attendance rate today"
          value={`${stats.attendance_rate_today}%`}
          icon={IconActivity}
          accent={stats.attendance_rate_today >= 80 ? 'emerald' : 'amber'}
          hint="Present + late + half-day / active employees"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Attendance — last 7 days" className="xl:col-span-2">
          <AttendanceTrendChart data={stats.attendance_trend} />
        </Card>
        <Card title="Leave requests by status">
          <LeaveStatusChart data={stats.leave_status_breakdown} />
        </Card>
      </div>
    </div>
  );
}
