import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// Section 3.1 — Admin marks attendance per employee per day.
router.post('/', requireRole('admin'), async (req, res) => {
  const { user_id, date, status, notes } = req.body;
  if (!user_id || !date || !status) {
    return res.status(400).json({ error: 'user_id, date and status are required' });
  }

  const { rows } = await query(
    `INSERT INTO attendance_records (user_id, date, status, marked_by, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, date)
     DO UPDATE SET status = $3, marked_by = $4, notes = $5, updated_at = now()
     RETURNING *`,
    [user_id, date, status, req.user.sub, notes || null]
  );

  await logAction(req.user.sub, 'attendance.mark', 'attendance_record', rows[0].id, { user_id, date, status });
  res.status(201).json(rows[0]);
});

// Day view across all employees (Section 3.1).
router.get('/day/:date', async (req, res) => {
  const { rows } = await query(
    `SELECT ar.*, u.full_name, u.employee_id, u.department
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     WHERE ar.date = $1
     ORDER BY u.full_name`,
    [req.params.date]
  );
  res.json(rows);
});

// Per-employee grid/calendar view + monthly summary (Section 3.1).
// Employees may only view their own history; Admin can view anyone's.
router.get('/user/:userId', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.sub !== req.params.userId) {
    return res.status(403).json({ error: 'Cannot view another employee\'s attendance history' });
  }
  const { from, to } = req.query;
  const params = [req.params.userId];
  let dateFilter = '';
  if (from && to) {
    dateFilter = 'AND date BETWEEN $2 AND $3';
    params.push(from, to);
  }
  const { rows } = await query(
    `SELECT * FROM attendance_records WHERE user_id = $1 ${dateFilter} ORDER BY date`,
    params
  );

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 }
  );

  res.json({ records: rows, summary });
});

// Company-wide read-only view (Section 5 — Employee screens).
router.get('/company', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let dateFilter = '';
  if (from && to) {
    dateFilter = 'WHERE ar.date BETWEEN $1 AND $2';
    params.push(from, to);
  }
  const { rows } = await query(
    `SELECT ar.*, u.full_name, u.employee_id, u.department
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     ${dateFilter}
     ORDER BY ar.date DESC, u.full_name`,
    params
  );
  res.json(rows);
});

// Discrepancy flag — employee flags their own record (Section 3.1).
router.post('/:id/flag', async (req, res) => {
  const { comment } = req.body;
  const { rows } = await query('SELECT * FROM attendance_records WHERE id = $1', [req.params.id]);
  const record = rows[0];
  if (!record) return res.status(404).json({ error: 'Attendance record not found' });
  if (req.user.role !== 'admin' && req.user.sub !== record.user_id) {
    return res.status(403).json({ error: 'Cannot flag another employee\'s record' });
  }

  const { rows: updated } = await query(
    `UPDATE attendance_records
     SET flagged = true, flag_comment = $2, flag_resolved = false, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, comment || null]
  );
  await logAction(req.user.sub, 'attendance.flag', 'attendance_record', req.params.id, { comment });
  res.json(updated[0]);
});

// Admin's resolution queue for flagged records.
router.get('/flags/queue', requireRole('admin'), async (_req, res) => {
  const { rows } = await query(
    `SELECT ar.*, u.full_name, u.employee_id
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     WHERE ar.flagged = true AND ar.flag_resolved = false
     ORDER BY ar.date DESC`
  );
  res.json(rows);
});

router.post('/:id/resolve', requireRole('admin'), async (req, res) => {
  const { corrected_status, resolution_notes } = req.body;
  const fields = ['flag_resolved = true', 'updated_at = now()'];
  const values = [];
  let i = 1;
  if (corrected_status) {
    fields.push(`status = $${i++}`);
    values.push(corrected_status);
  }
  if (resolution_notes) {
    fields.push(`notes = $${i++}`);
    values.push(resolution_notes);
  }
  values.push(req.params.id);

  const { rows } = await query(
    `UPDATE attendance_records SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Attendance record not found' });

  await logAction(req.user.sub, 'attendance.resolve_flag', 'attendance_record', req.params.id, {
    corrected_status,
    resolution_notes,
  });
  res.json(rows[0]);
});

export default router;
