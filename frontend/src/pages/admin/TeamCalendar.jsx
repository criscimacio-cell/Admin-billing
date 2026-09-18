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
      <h1 className="page-title">Team Leave Calendar</h1>
      <Card title="Approved Leave — Who's Out and When">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Department</th>
              <th className="table-cell">Leave Type</th>
              <th className="table-cell">Dates</th>
              <th className="table-cell">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell">{r.full_name}</td>
                <td className="table-cell">{r.department}</td>
                <td className="table-cell">{r.leave_type_name}</td>
                <td className="table-cell">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.is_half_day ? ' (half-day)' : ''}</td>
                <td className="table-cell text-slate-600">{r.reason}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="table-cell py-6 text-center text-slate-400">No approved leave on the calendar yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
