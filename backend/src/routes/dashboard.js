import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdminOrCeo } from '../middleware/auth.js';

const router = Router();

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave'];
const LEAVE_STATUSES = ['pending', 'approved', 'rejected'];

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Dense 7-day x status grid for the attendance trend chart — zero-fills
 * days/statuses with no records so the stacked bar has a consistent shape. */
async function attendanceTrend(extraWhere = '', params = []) {
  const days = last7Days();
  const { rows } = await query(
    `SELECT date::text AS date, status, COUNT(*)::int AS count
     FROM attendance_records
     WHERE date >= $1 AND date <= $2 ${extraWhere}
     GROUP BY date, status`,
    [days[0], days[6], ...params]
  );

  return days.map((date) => {
    const day = { date };
    for (const s of ATTENDANCE_STATUSES) day[s] = 0;
    for (const r of rows) if (r.date === date) day[r.status] = r.count;
    return day;
  });
}

/** Per-employee roster summary: leave balances by type + this month's
 * attendance counts, for the Admin dashboard's employee summary table. */
async function employeeSummary() {
  const [users, balances, attendance] = await Promise.all([
    query(`SELECT id, full_name, employee_id, department FROM users WHERE status = 'active' ORDER BY full_name`),
    query(
      `SELECT lb.user_id, lt.code, lt.name, lb.remaining_credits
       FROM leave_balances lb JOIN leave_types lt ON lt.id = lb.leave_type_id`
    ),
    query(
      `SELECT user_id, status, COUNT(*)::int AS count
       FROM attendance_records
       WHERE date >= date_trunc('month', CURRENT_DATE)::date AND date <= CURRENT_DATE
       GROUP BY user_id, status`
    ),
  ]);

  return users.rows.map((u) => {
    const leave_balances = balances.rows
      .filter((b) => b.user_id === u.id)
      .map((b) => ({ code: b.code, name: b.name, remaining_credits: b.remaining_credits }));

    const attendance_this_month = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 };
    for (const a of attendance.rows) if (a.user_id === u.id) attendance_this_month[a.status] = a.count;

    return {
      user_id: u.id,
      full_name: u.full_name,
      employee_id: u.employee_id,
      department: u.department,
      leave_balances,
      attendance_this_month,
    };
  });
}

// Section 3.3 — Admin dashboard stats, plus aggregates for the KPI row and charts.
router.get('/admin', requireAuth, requireAdminOrCeo, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const [onLeaveToday, pendingCount, todaySnapshot, totalEmployees, leaveStatusRows, trend, roster, pendingReceipts] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS count FROM leave_requests
       WHERE overall_status = 'approved' AND start_date <= $1 AND end_date >= $1`,
      [today]
    ),
    query(`SELECT COUNT(*)::int AS count FROM leave_requests WHERE overall_status = 'pending'`),
    query(
      `SELECT status, COUNT(*)::int AS count FROM attendance_records WHERE date = $1 GROUP BY status`,
      [today]
    ),
    query(`SELECT COUNT(*)::int AS count FROM users WHERE status = 'active'`),
    query(`SELECT overall_status, COUNT(*)::int AS count FROM leave_requests GROUP BY overall_status`),
    attendanceTrend(),
    employeeSummary(),
    query(`SELECT COUNT(*)::int AS count FROM incentives WHERE receipt_status != 'verified'`),
  ]);

  const snapshotByStatus = Object.fromEntries(todaySnapshot.rows.map((r) => [r.status, r.count]));
  const totalActive = totalEmployees.rows[0].count;
  const presentish = (snapshotByStatus.present || 0) + (snapshotByStatus.late || 0) + (snapshotByStatus.half_day || 0);
  const attendanceRateToday = totalActive > 0 ? Math.round((presentish / totalActive) * 100) : 0;

  const leaveStatusByKey = Object.fromEntries(leaveStatusRows.rows.map((r) => [r.overall_status, r.count]));
  const leave_status_breakdown = LEAVE_STATUSES.map((status) => ({ status, count: leaveStatusByKey[status] || 0 }));

  res.json({
    total_employees: totalActive,
    employees_on_leave_today: onLeaveToday.rows[0].count,
    pending_leave_requests: pendingCount.rows[0].count,
    attendance_rate_today: attendanceRateToday,
    todays_attendance_snapshot: todaySnapshot.rows,
    leave_status_breakdown,
    attendance_trend: trend,
    employee_summary: roster,
    incentives_pending_receipts: pendingReceipts.rows[0].count,
  });
});

// Employee dashboard: personal snapshot + a 7-day attendance trend for their own record.
router.get('/me', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [myPending, myLeaveToday, myBalances, trend] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM leave_requests WHERE user_id = $1 AND overall_status = 'pending'`, [req.user.sub]),
    query(
      `SELECT COUNT(*)::int AS count FROM leave_requests
       WHERE user_id = $1 AND overall_status = 'approved' AND start_date <= $2 AND end_date >= $2`,
      [req.user.sub, today]
    ),
    query(
      `SELECT lt.name, lb.remaining_credits FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id WHERE lb.user_id = $1`,
      [req.user.sub]
    ),
    attendanceTrend('AND user_id = $3', [req.user.sub]),
  ]);

  res.json({
    my_pending_requests: myPending.rows[0].count,
    on_leave_today: myLeaveToday.rows[0].count > 0,
    balances: myBalances.rows,
    attendance_trend: trend,
  });
});

export default router;
