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
      <h1 className="page-title">Company-Wide Attendance</h1>
      <Card
        title="Attendance by Date"
        action={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="input-sm" />
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row">
              <th className="table-cell">Employee</th>
              <th className="table-cell">Department</th>
              <th className="table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell">{r.full_name} ({r.employee_id})</td>
                <td className="table-cell">{r.department}</td>
                <td className="table-cell"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="table-cell py-6 text-center text-slate-400">No attendance marked for this date.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
