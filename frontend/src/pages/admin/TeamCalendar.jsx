import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// Section 3.2 — Team leave calendar: shared, visible to everyone; reason
// is visible to Admin (and to the requester for their own leave).
export default function TeamCalendar() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/leave-requests/calendar').then((res) => setRows(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Team Leave Calendar</h1>
      <Card title="Approved Leave — Who's Out and When">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Department</th>
              <th className="py-2 pr-4">Leave Type</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{r.full_name}</td>
                <td className="py-2 pr-4">{r.department}</td>
                <td className="py-2 pr-4">{r.leave_type_name}</td>
                <td className="py-2 pr-4">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.is_half_day ? ' (half-day)' : ''}</td>
                <td className="py-2 pr-4 text-slate-600">{r.reason}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-slate-400">No approved leave on the calendar yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
