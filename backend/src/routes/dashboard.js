import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Section 3.3 — Admin dashboard stats.
router.get('/admin', requireAuth, requireRole('admin'), async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const [onLeaveToday, pendingCount, todaySnapshot] = await Promise.all([
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
  ]);

  res.json({
    employees_on_leave_today: onLeaveToday.rows[0].count,
    pending_leave_requests: pendingCount.rows[0].count,
    todays_attendance_snapshot: todaySnapshot.rows,
  });
});

// Employee dashboard: quick personal snapshot.
router.get('/me', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [myPending, myLeaveToday, myBalances] = await Promise.all([
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
  ]);

  res.json({
    my_pending_requests: myPending.rows[0].count,
    on_leave_today: myLeaveToday.rows[0].count > 0,
    balances: myBalances.rows,
  });
});

export default router;
