import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Section 5 — Employee: "Company-wide attendance view (read-only)."
export default function CompanyAttendance() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/attendance/company', { params: { from: date, to: date } }).then((res) => setRows(res.data));
  }, [date]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Company-Wide Attendance</h1>
      <Card
        title="Attendance by Date"
        action={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Department</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{r.full_name} ({r.employee_id})</td>
                <td className="py-2 pr-4">{r.department}</td>
                <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="py-3 text-slate-400">No attendance marked for this date.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
