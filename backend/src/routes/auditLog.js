import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Section 3.4 — Audit Trail. Viewable by Admin only.
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const { rows } = await query(
    `SELECT al.*, u.full_name AS actor_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.actor_id
     ORDER BY al.timestamp DESC
     LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

export default router;
