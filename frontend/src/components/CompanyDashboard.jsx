import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Card from './Card.jsx';
import StatTile from './StatTile.jsx';
import AttendanceTrendChart from './charts/AttendanceTrendChart.jsx';
import LeaveStatusChart from './charts/LeaveStatusChart.jsx';
import { IconUsers, IconClipboard, IconCalendarCheck, IconActivity, IconReceipt } from './icons.jsx';

// Company-wide dashboard stats: employees on leave today, pending leave
// requests count, today's attendance snapshot — plus a KPI row and
// trend/breakdown charts built from the same aggregates. Shared between
// the Admin Dashboard and the CEO's personal dashboard (GET /dashboard/admin
// is available to both — see requireAdminOrCeo on the backend).
export default function CompanyDashboard({ title = 'Admin Dashboard' }) {
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
      <h1 className="page-title">{title}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <StatTile
          label="Incentive receipts pending"
          value={stats.incentives_pending_receipts}
          icon={IconReceipt}
          accent={stats.incentives_pending_receipts > 0 ? 'amber' : 'emerald'}
          hint="Not yet verified for BIR"
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

      <Card title="Employee Summary" action={<span className="text-xs text-slate-400">Attendance counts are for this calendar month</span>}>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Leave Remaining</th>
              <th className="table-cell">Attendance This Month</th>
            </tr>
          </thead>
          <tbody>
            {stats.employee_summary.map((e) => {
              const a = e.attendance_this_month;
              const chips = [
                ['Present', a.present, 'bg-emerald-50 text-emerald-700'],
                ['Absent', a.absent, 'bg-red-50 text-red-700'],
                ['Late', a.late, 'bg-amber-50 text-amber-700'],
                ['Half-day', a.half_day, 'bg-sky-50 text-sky-700'],
                ['On leave', a.on_leave, 'bg-brand-50 text-brand-700'],
              ].filter(([, count]) => count > 0);

              return (
                <tr key={e.user_id} className="table-row">
                  <td className="table-cell">
                    <div className="font-medium text-slate-800">{e.full_name}</div>
                    <div className="text-xs text-slate-400">{e.employee_id} · {e.department}</div>
                  </td>
                  <td className="table-cell">
                    {e.leave_balances.length === 0 ? (
                      <span className="text-slate-400">Not set up</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {e.leave_balances.map((b) => (
                          <span key={b.code} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {b.code} <span className="font-semibold text-slate-800">{b.remaining_credits}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    {chips.length === 0 ? (
                      <span className="text-slate-400">No attendance marked yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map(([label, count, style]) => (
                          <span key={label} className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
                            {label} {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {stats.employee_summary.length === 0 && (
              <tr><td colSpan={3} className="table-cell py-6 text-center text-slate-400">No employees yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
