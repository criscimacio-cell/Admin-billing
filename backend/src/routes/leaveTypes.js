import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { leaveTypeSchemas } from '../validation/schemas.js';
import { logAction } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// Section 3.2 — Configurable leave types with default annual credits.
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM leave_types ORDER BY name');
  res.json(rows);
});

router.post('/', requireRole('admin'), validate(leaveTypeSchemas.create), async (req, res) => {
  const { name, code, default_credits_per_year } = req.body;

  let rows;
  try {
    ({ rows } = await query(
      `INSERT INTO leave_types (name, code, default_credits_per_year) VALUES ($1, $2, $3) RETURNING *`,
      [name, code, default_credits_per_year ?? 0]
    ));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A leave type with that name or code already exists' });
    throw err;
  }
  await logAction(req.user.sub, 'leave_type.create', 'leave_type', rows[0].id, req.body);
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireRole('admin'), validate(leaveTypeSchemas.update), async (req, res) => {
  const { name, default_credits_per_year } = req.body;
  let rows;
  try {
    ({ rows } = await query(
      `UPDATE leave_types SET name = COALESCE($2, name),
         default_credits_per_year = COALESCE($3, default_credits_per_year)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, default_credits_per_year]
    ));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A leave type with that name already exists' });
    throw err;
  }
  if (!rows[0]) return res.status(404).json({ error: 'Leave type not found' });
  await logAction(req.user.sub, 'leave_type.update', 'leave_type', req.params.id, req.body);
  res.json(rows[0]);
});

export default router;
