import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

// Section 3.4 — Audit Trail. Viewable by Admin only.
export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/audit-log?limit=300').then((res) => setLogs(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Audit Log</h1>
      <Card title="Recent Activity">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Timestamp</th>
              <th className="table-cell">Actor</th>
              <th className="table-cell">Action</th>
              <th className="table-cell">Target</th>
              <th className="table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4 whitespace-nowrap text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="table-cell">{l.actor_name || '—'}</td>
                <td className="py-2 pr-4 font-mono text-xs">{l.action}</td>
                <td className="table-cell text-xs text-slate-500">{l.target_type} · {l.target_id}</td>
                <td className="table-cell text-xs text-slate-500">
                  <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(l.details)}</pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="table-cell py-6 text-center text-slate-400">No audit events yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
