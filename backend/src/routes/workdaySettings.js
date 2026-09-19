import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { workdaySettingsSchemas } from '../validation/schemas.js';
import { logAction } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// Section 4 — WorkdaySettings: single company-wide workday_start_time,
// Admin-editable, required for the SL late-notification rule.
// Section 9, item 1 (resolved): admin_notify_email is a config field so
// the medical-cert instructional text stays correct if it changes.
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM workday_settings WHERE id = 1');
  res.json(rows[0]);
});

router.put('/', requireRole('admin'), validate(workdaySettingsSchemas.update), async (req, res) => {
  const { workday_start_time, admin_notify_email } = req.body;
  const { rows } = await query(
    `UPDATE workday_settings
     SET workday_start_time = COALESCE($1, workday_start_time),
         admin_notify_email = COALESCE($2, admin_notify_email),
         updated_at = now()
     WHERE id = 1 RETURNING *`,
    [workday_start_time || null, admin_notify_email || null]
  );
  await logAction(req.user.sub, 'workday_settings.update', 'workday_settings', 1, req.body);
  res.json(rows[0]);
});

export default router;
