import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../../components/Card.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/me').then((res) => setStats(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Welcome, {user?.full_name}</h1>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="My Pending Requests">
            <p className="text-3xl font-bold text-amber-600">{stats.my_pending_requests}</p>
          </Card>
          <Card title="On Leave Today">
            <p className="text-3xl font-bold text-brand-700">{stats.on_leave_today ? 'Yes' : 'No'}</p>
          </Card>
          <Card title="Leave Balances">
            {stats.balances.length === 0 ? (
              <p className="text-sm text-slate-500">No balances set up yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.balances.map((b) => (
                  <li key={b.name} className="flex justify-between">
                    <span>{b.name}</span>
                    <span className="font-semibold">{b.remaining_credits}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
