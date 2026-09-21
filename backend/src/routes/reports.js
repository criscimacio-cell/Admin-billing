import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toCsv } from '../utils/csv.js';
import { sendTablePdf } from '../utils/pdf.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const ATTENDANCE_COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', weight: 1 },
  { key: 'full_name', label: 'Full Name', weight: 1.6 },
  { key: 'department', label: 'Department', weight: 1.2 },
  { key: 'present', label: 'Present', weight: 0.7 },
  { key: 'absent', label: 'Absent', weight: 0.7 },
  { key: 'late', label: 'Late', weight: 0.7 },
  { key: 'half_day', label: 'Half-day', weight: 0.7 },
  { key: 'on_leave', label: 'On Leave', weight: 0.7 },
];

async function loadAttendanceReport(from, to) {
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
  return rows;
}

const LEAVE_COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', weight: 1 },
  { key: 'full_name', label: 'Full Name', weight: 1.4 },
  { key: 'department', label: 'Department', weight: 1 },
  { key: 'leave_type', label: 'Leave Type', weight: 1.1 },
  { key: 'start_date', label: 'Start Date', weight: 0.9 },
  { key: 'end_date', label: 'End Date', weight: 0.9 },
  { key: 'is_half_day', label: 'Half-day', weight: 0.7 },
  { key: 'overall_status', label: 'Status', weight: 0.9 },
  { key: 'late_flag', label: 'Late Flag', weight: 0.7 },
  { key: 'late_flag_reason', label: 'Late Flag Reason', weight: 1.4 },
  { key: 'cert_pending', label: 'Cert Pending', weight: 0.9 },
];

async function loadLeaveReport(from, to) {
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
  return rows;
}

const INCENTIVES_COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', weight: 0.9 },
  { key: 'full_name', label: 'Full Name', weight: 1.3 },
  { key: 'department', label: 'Department', weight: 1 },
  { key: 'description', label: 'Incentive', weight: 1.3 },
  { key: 'amount', label: 'Amount Granted', weight: 0.9 },
  { key: 'given_date', label: 'Date Given', weight: 0.9 },
  { key: 'receipt_status', label: 'Receipt Status', weight: 1 },
  { key: 'receipt_or_number', label: 'OR / Receipt #', weight: 1 },
  { key: 'receipt_vendor_name', label: 'Vendor', weight: 1 },
  { key: 'receipt_amount', label: 'Receipt Amount', weight: 0.9 },
];

async function loadIncentivesReport(from, to) {
  const { rows } = await query(
    `SELECT u.employee_id, u.full_name, u.department,
            i.description, i.amount, to_char(i.given_date, 'YYYY-MM-DD') AS given_date,
            i.receipt_status, i.receipt_or_number, i.receipt_vendor_name, i.receipt_amount,
            to_char(i.receipt_submitted_at, 'YYYY-MM-DD') AS receipt_submitted_at,
            to_char(i.receipt_verified_at, 'YYYY-MM-DD') AS receipt_verified_at
     FROM incentives i
     JOIN users u ON u.id = i.user_id
     WHERE i.given_date BETWEEN $1 AND $2
     ORDER BY i.given_date`,
    [from, to]
  );
  return rows;
}

function requireRange(req, res) {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required' });
    return null;
  }
  return { from, to };
}

// Section 3.3 — Monthly attendance summary export (CSV/Excel).
router.get('/attendance.csv', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadAttendanceReport(range.from, range.to);
  const csv = toCsv(rows, ATTENDANCE_COLUMNS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${range.from}_to_${range.to}.csv"`);
  res.send(csv);
});

router.get('/attendance.pdf', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadAttendanceReport(range.from, range.to);
  sendTablePdf(res, `attendance_${range.from}_to_${range.to}.pdf`, {
    title: 'Attendance Summary',
    subtitle: `${range.from} to ${range.to}`,
    columns: ATTENDANCE_COLUMNS,
    rows,
  });
});

// Section 3.3 — Leave summary export (CSV/Excel).
router.get('/leave.csv', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadLeaveReport(range.from, range.to);
  const csv = toCsv(rows, LEAVE_COLUMNS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leave_${range.from}_to_${range.to}.csv"`);
  res.send(csv);
});

router.get('/leave.pdf', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadLeaveReport(range.from, range.to);
  sendTablePdf(res, `leave_${range.from}_to_${range.to}.pdf`, {
    title: 'Leave Summary',
    subtitle: `${range.from} to ${range.to}`,
    columns: LEAVE_COLUMNS,
    rows,
  });
});

// Incentive receipts export — for BIR substantiation of CEO-granted
// incentives (burger meal, coffee, etc.) over a filing period.
router.get('/incentives.csv', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadIncentivesReport(range.from, range.to);
  const csv = toCsv(rows, [
    ...INCENTIVES_COLUMNS,
    { key: 'receipt_submitted_at', label: 'Submitted' },
    { key: 'receipt_verified_at', label: 'Verified' },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="incentives_${range.from}_to_${range.to}.csv"`);
  res.send(csv);
});

router.get('/incentives.pdf', async (req, res) => {
  const range = requireRange(req, res);
  if (!range) return;
  const rows = await loadIncentivesReport(range.from, range.to);
  sendTablePdf(res, `incentives_${range.from}_to_${range.to}.pdf`, {
    title: 'Incentives & Receipts',
    subtitle: `${range.from} to ${range.to}`,
    columns: INCENTIVES_COLUMNS,
    rows,
  });
});

export default router;
