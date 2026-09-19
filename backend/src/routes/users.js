import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userSchemas } from '../validation/schemas.js';
import { logAction } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

const PUBLIC_COLUMNS = `id, full_name, employee_id, department, position, email, role, status, department_head_of, is_ceo, created_at`;

// Section 2 — "Manage employee accounts & set credentials": Admin only.
router.get('/', requireRole('admin'), async (req, res) => {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY full_name`);
  res.json(rows);
});

// Distinct department names in use — for the Dept Head assignment picker.
router.get('/departments', requireRole('admin'), async (_req, res) => {
  const { rows } = await query(`SELECT DISTINCT department FROM users WHERE status = 'active' ORDER BY department`);
  res.json(rows.map((r) => r.department));
});

// Lightweight roster for pickers (attendance grid, calendars) — no credentials exposed.
router.get('/roster', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, full_name, employee_id, department, position FROM users WHERE status = 'active' ORDER BY full_name`
  );
  res.json(rows);
});

router.get('/me', async (req, res) => {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// Section 2 — "Admin manually creates each employee account and manually
// sets their initial password (no self-registration, no auto-generated
// temp passwords)."
router.post('/', requireRole('admin'), validate(userSchemas.create), async (req, res) => {
  const { full_name, employee_id, department, position, email, password, role } = req.body;

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (full_name, employee_id, department, position, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${PUBLIC_COLUMNS}`,
      [full_name, employee_id, department, position, email.toLowerCase(), password_hash, role === 'admin' ? 'admin' : 'employee']
    );
    await logAction(req.user.sub, 'user.create', 'user', rows[0].id, { full_name, employee_id });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Employee ID or email already in use' });
    throw err;
  }
});

// Edit profile fields and/or set credentials (Admin only).
router.patch('/:id', requireRole('admin'), validate(userSchemas.update), async (req, res) => {
  const { full_name, department, position, email, role, status, password, department_head_of, is_ceo } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  const set = (col, val) => {
    fields.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (full_name !== undefined) set('full_name', full_name);
  if (department !== undefined) set('department', department);
  if (position !== undefined) set('position', position);
  if (email !== undefined) set('email', email.toLowerCase());
  if (role !== undefined) set('role', role);
  if (status !== undefined) set('status', status);
  if (password) set('password_hash', await bcrypt.hash(password, 10));
  // Approval capabilities layered on top of the base role — see schema.sql.
  // department_head_of === null clears headship (partial unique index only
  // allows one head per department, so this must be an explicit clear).
  if (department_head_of !== undefined) set('department_head_of', department_head_of);
  if (is_ceo !== undefined) set('is_ceo', !!is_ceo);

  fields.push(`updated_at = now()`);
  values.push(req.params.id);

  let rows;
  try {
    ({ rows } = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${PUBLIC_COLUMNS}`,
      values
    ));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That department already has a Dept Head assigned' });
    throw err;
  }
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  await logAction(req.user.sub, password ? 'user.set_credentials' : 'user.update', 'user', req.params.id, {
    fields: Object.keys(req.body),
  });
  res.json(rows[0]);
});

export default router;
