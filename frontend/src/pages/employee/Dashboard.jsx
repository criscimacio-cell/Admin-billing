import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../../components/Card.jsx';
import StatTile from '../../components/StatTile.jsx';
import AttendanceTrendChart from '../../components/charts/AttendanceTrendChart.jsx';
import { IconClipboard, IconCalendarCheck, IconWallet } from '../../components/icons.jsx';

export default function Dashboard() {
  const { user, isCeo } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isCeo) api.get('/dashboard/me').then((res) => setStats(res.data));
  }, [isCeo]);

  if (isCeo) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Welcome, {user?.full_name}</h1>
      </div>
    );
  }

  if (!stats) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Welcome, {user?.full_name}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="My pending requests" value={stats.my_pending_requests} icon={IconClipboard} accent="amber" />
        <StatTile label="On leave today" value={stats.on_leave_today ? 'Yes' : 'No'} icon={IconCalendarCheck} accent="brand" />
        <StatTile
          label="Leave balances"
          value={stats.balances.length ? stats.balances.map((b) => b.remaining_credits).reduce((a, b) => a + Number(b), 0) : 0}
          icon={IconWallet}
          accent="emerald"
          hint={stats.balances.map((b) => `${b.name}: ${b.remaining_credits}`).join(' · ') || 'No balances set up yet'}
        />
      </div>

      <Card title="My attendance — last 7 days">
        <AttendanceTrendChart data={stats.attendance_trend} />
      </Card>
    </div>
  );
}
