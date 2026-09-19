import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { incentiveSchemas } from '../validation/schemas.js';
import { logAction } from '../utils/audit.js';
import { toCsv } from '../utils/csv.js';

const router = Router();
router.use(requireAuth);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — receipts are small; keeps base64-in-Postgres reasonable.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, or PDF receipts are accepted'));
    }
    cb(null, true);
  },
});

const SUMMARY_COLUMNS = `
  i.id, i.user_id, i.description, i.amount, i.given_date, i.notes,
  i.receipt_status, i.receipt_or_number, i.receipt_vendor_name, i.receipt_amount,
  i.receipt_file_name, i.receipt_file_mime, i.receipt_file_size,
  i.receipt_submitted_at, i.receipt_verified_by, i.receipt_verified_at, i.receipt_verification_notes,
  i.created_at
`;

// Admin: log a new incentive grant (Section — CEO-granted burger/coffee
// incentives on irregular dates, one row per employee).
router.post('/', requireRole('admin'), validate(incentiveSchemas.create), async (req, res) => {
  const { user_id, description, amount, given_date, notes } = req.body;

  const { rows } = await query(
    `INSERT INTO incentives (user_id, description, amount, given_date, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, description, amount, given_date, notes, receipt_status, created_at`,
    [user_id, description, amount, given_date, notes || null, req.user.sub]
  );
  await logAction(req.user.sub, 'incentive.create', 'incentive', rows[0].id, { user_id, description, amount, given_date });
  res.status(201).json(rows[0]);
});

// Admin: full list with employee info, for the incentives table + BIR review.
router.get('/', requireRole('admin'), async (req, res) => {
  const { status, from, to, user_id } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;

  if (status) {
    conditions.push(`i.receipt_status = $${i++}`);
    params.push(status);
  }
  if (user_id) {
    conditions.push(`i.user_id = $${i++}`);
    params.push(user_id);
  }
  if (from) {
    conditions.push(`i.given_date >= $${i++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`i.given_date <= $${i++}`);
    params.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${SUMMARY_COLUMNS}, u.full_name, u.employee_id, u.department
     FROM incentives i
     JOIN users u ON u.id = i.user_id
     ${where}
     ORDER BY i.given_date DESC, i.created_at DESC`,
    params
  );
  res.json(rows);
});

// Employee: own incentives.
router.get('/mine', async (req, res) => {
  const { rows } = await query(
    `SELECT ${SUMMARY_COLUMNS} FROM incentives i WHERE i.user_id = $1 ORDER BY i.given_date DESC, i.created_at DESC`,
    [req.user.sub]
  );
  res.json(rows);
});

async function getIncentiveOr404(id) {
  const { rows } = await query('SELECT * FROM incentives WHERE id = $1', [id]);
  return rows[0];
}

// Employee submits (or resubmits, if Admin rejected) the receipt for one
// of their own incentives. multipart/form-data: file + or_number +
// vendor_name + amount.
router.post('/:id/receipt', upload.single('file'), validate(incentiveSchemas.receipt), async (req, res) => {
  const incentive = await getIncentiveOr404(req.params.id);
  if (!incentive) return res.status(404).json({ error: 'Incentive not found' });
  if (req.user.role !== 'admin' && req.user.sub !== incentive.user_id) {
    return res.status(403).json({ error: "Cannot submit a receipt for another employee's incentive" });
  }
  if (!req.file) return res.status(400).json({ error: 'A receipt file is required' });

  const { or_number, vendor_name, amount } = req.body;
  const fileData = req.file.buffer.toString('base64');

  const { rows } = await query(
    `UPDATE incentives AS i SET
       receipt_status = 'submitted',
       receipt_or_number = $2,
       receipt_vendor_name = $3,
       receipt_amount = $4,
       receipt_file_name = $5,
       receipt_file_mime = $6,
       receipt_file_data = $7,
       receipt_file_size = $8,
       receipt_submitted_at = now(),
       receipt_verified_by = NULL,
       receipt_verified_at = NULL,
       receipt_verification_notes = NULL,
       updated_at = now()
     WHERE i.id = $1
     RETURNING ${SUMMARY_COLUMNS}`,
    [req.params.id, or_number || null, vendor_name || null, amount || null, req.file.originalname, req.file.mimetype, fileData, req.file.size]
  );

  await logAction(req.user.sub, 'incentive.receipt_submit', 'incentive', req.params.id, {
    or_number, vendor_name, amount, file_name: req.file.originalname,
  });
  res.json(rows[0]);
});

// Download the stored receipt file — Admin, or the employee it belongs to.
router.get('/:id/receipt-file', async (req, res) => {
  const incentive = await getIncentiveOr404(req.params.id);
  if (!incentive) return res.status(404).json({ error: 'Incentive not found' });
  if (req.user.role !== 'admin' && req.user.sub !== incentive.user_id) {
    return res.status(403).json({ error: "Cannot view another employee's receipt" });
  }
  if (!incentive.receipt_file_data) return res.status(404).json({ error: 'No receipt file on this incentive' });

  res.setHeader('Content-Type', incentive.receipt_file_mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${incentive.receipt_file_name || 'receipt'}"`);
  res.send(Buffer.from(incentive.receipt_file_data, 'base64'));
});

// Admin marks the submitted receipt verified (BIR-ready record).
router.post('/:id/verify', requireRole('admin'), validate(incentiveSchemas.verify), async (req, res) => {
  const { rows } = await query(
    `UPDATE incentives AS i SET
       receipt_status = 'verified', receipt_verified_by = $2, receipt_verified_at = now(),
       receipt_verification_notes = $3, updated_at = now()
     WHERE i.id = $1 AND receipt_status = 'submitted'
     RETURNING ${SUMMARY_COLUMNS}`,
    [req.params.id, req.user.sub, req.body.notes || null]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a submitted receipt can be verified' });

  await logAction(req.user.sub, 'incentive.receipt_verify', 'incentive', req.params.id, { notes: req.body.notes });
  res.json(rows[0]);
});

// Admin rejects a submitted receipt, sending it back to the employee for resubmission.
router.post('/:id/reject', requireRole('admin'), validate(incentiveSchemas.reject), async (req, res) => {
  const { notes } = req.body;

  const { rows } = await query(
    `UPDATE incentives AS i SET
       receipt_status = 'pending', receipt_verification_notes = $2, updated_at = now()
     WHERE i.id = $1 AND receipt_status = 'submitted'
     RETURNING ${SUMMARY_COLUMNS}`,
    [req.params.id, notes]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a submitted receipt can be rejected' });

  await logAction(req.user.sub, 'incentive.receipt_reject', 'incentive', req.params.id, { notes });
  res.json(rows[0]);
});

export default router;
