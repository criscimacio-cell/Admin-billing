import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// Section 3.2 — "Leave history & running balance per employee, per leave type."
router.get('/user/:userId', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.sub !== req.params.userId) {
    return res.status(403).json({ error: 'Cannot view another employee\'s leave balance' });
  }
  const { rows } = await query(
    `SELECT lb.leave_type_id, lt.name, lt.code, lb.remaining_credits
     FROM leave_balances lb
     JOIN leave_types lt ON lt.id = lb.leave_type_id
     WHERE lb.user_id = $1
     ORDER BY lt.name`,
    [req.params.userId]
  );
  res.json(rows);
});

// Admin sets/adjusts a balance directly (e.g. onboarding an employee onto a new leave type).
router.put('/user/:userId/type/:leaveTypeId', requireRole('admin'), async (req, res) => {
  const { remaining_credits } = req.body;
  if (remaining_credits === undefined) return res.status(400).json({ error: 'remaining_credits is required' });

  const { rows } = await query(
    `INSERT INTO leave_balances (user_id, leave_type_id, remaining_credits)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, leave_type_id) DO UPDATE SET remaining_credits = $3
     RETURNING *`,
    [req.params.userId, req.params.leaveTypeId, remaining_credits]
  );
  await logAction(req.user.sub, 'leave_balance.set', 'leave_balance', req.params.userId, {
    leave_type_id: req.params.leaveTypeId,
    remaining_credits,
  });
  res.json(rows[0]);
});

export default router;
