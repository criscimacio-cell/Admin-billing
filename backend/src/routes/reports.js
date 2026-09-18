import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toCsv } from '../utils/csv.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// Section 3.3 — Monthly attendance summary export (CSV/Excel).
router.get('/attendance.csv', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params are required' });

  const { rows } = await query(
    `SELECT u.employee_id, u.full_name, u.department,
            COUNT(*) FILTER (WHERE ar.status = 'present') AS present,
            COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent,
            COUNT(*) FILTER (WHERE ar.status = 'late') AS late,
            COUNT(*) FILTER (WHERE ar.status = 'half_day') AS half_day,
            COUNT(*) FILTER (WHERE ar.status = 'on_leave') AS on_leave
     FROM users u
     LEFT JOIN attendance_records ar ON ar.user_id = u.id AND ar.date BETWEEN $1 AND $2
     WHERE u.role = 'employee' OR u.role = 'admin'
     GROUP BY u.id, u.employee_id, u.full_name, u.department
     ORDER BY u.full_name`,
    [from, to]
  );

  const csv = toCsv(rows, [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'department', label: 'Department' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'late', label: 'Late' },
    { key: 'half_day', label: 'Half-day' },
    { key: 'on_leave', label: 'On Leave' },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${from}_to_${to}.csv"`);
  res.send(csv);
});

// Section 3.3 — Leave summary export (CSV/Excel).
router.get('/leave.csv', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params are required' });

  const { rows } = await query(
    `SELECT u.employee_id, u.full_name, u.department, lt.name AS leave_type,
            to_char(lr.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(lr.end_date, 'YYYY-MM-DD') AS end_date,
            lr.is_half_day, lr.overall_status,
            lr.late_flag, lr.late_flag_reason, lr.cert_pending
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.start_date <= $2 AND lr.end_date >= $1
     ORDER BY lr.start_date`,
    [from, to]
  );

  const csv = toCsv(rows, [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'department', label: 'Department' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'is_half_day', label: 'Half-day' },
    { key: 'overall_status', label: 'Status' },
    { key: 'late_flag', label: 'Late Flag' },
    { key: 'late_flag_reason', label: 'Late Flag Reason' },
    { key: 'cert_pending', label: 'Cert Pending' },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leave_${from}_to_${to}.csv"`);
  res.send(csv);
});

export default router;
