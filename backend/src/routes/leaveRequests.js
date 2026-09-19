import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireRole, requireDeptHead, requireCeo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { leaveRequestSchemas } from '../validation/schemas.js';
import { logAction } from '../utils/audit.js';
import { sendLeaveRequestCopy, sendApprovalNeededEmail } from '../utils/email.js';
import {
  checkVacationLateFlag,
  checkSickLateFlag,
  requiresCertAcknowledgment,
} from '../utils/leaveRules.js';

const router = Router();
router.use(requireAuth);

function calendarDays(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

/** Who to email for a given stage — the real assigned Dept Head/CEO
 * account's own login email, falling back to every active Admin when no
 * real account is assigned yet (mirrors the same fallback approve-stage
 * itself uses). Never a manually typed address. */
async function getStageRecipients(stage, department) {
  if (stage === 'dept_head') {
    const { rows } = await query('SELECT email, full_name FROM users WHERE department_head_of = $1', [department]);
    if (rows.length) return rows;
  } else if (stage === 'ceo') {
    const { rows } = await query('SELECT email, full_name FROM users WHERE is_ceo = true');
    if (rows.length) return rows;
  }
  const { rows } = await query(`SELECT email, full_name FROM users WHERE role = 'admin' AND status = 'active'`);
  return rows;
}

async function findConflicts(userId, startDate, endDate, excludeId) {
  // Section 3.2 — "Conflict warning: Admin sees a warning if approving
  // would mean multiple employees are out on overlapping dates."
  const { rows } = await query(
    `SELECT lr.id, u.full_name, u.department, lr.start_date, lr.end_date
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     WHERE lr.overall_status = 'approved'
       AND lr.user_id != $1
       AND lr.id != COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
       AND lr.start_date <= $3 AND lr.end_date >= $2`,
    [userId, startDate, endDate, excludeId || null]
  );
  return rows;
}

// Section 3.2 — Team leave calendar. Reason hidden from Employees except
// for their own requests; visible to Admin.
router.get('/calendar', async (req, res) => {
  const { rows } = await query(
    `SELECT lr.id, lr.user_id, u.full_name, u.department, lt.name AS leave_type_name,
            lr.start_date, lr.end_date, lr.is_half_day, lr.overall_status, lr.reason
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.overall_status = 'approved'
     ORDER BY lr.start_date`
  );
  const sanitized = rows.map((r) => ({
    ...r,
    reason: req.user.role === 'admin' || req.user.sub === r.user_id ? r.reason : undefined,
  }));
  res.json(sanitized);
});

// "View all leave requests (dates only, no reason)" — both roles.
router.get('/directory', async (_req, res) => {
  const { rows } = await query(
    `SELECT lr.id, lr.user_id, u.full_name, lt.name AS leave_type_name,
            lr.start_date, lr.end_date, lr.is_half_day, lr.overall_status
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     ORDER BY lr.start_date DESC`
  );
  res.json(rows);
});

// "View own leave requests, balance & reason" — full detail, own only.
router.get('/mine', async (req, res) => {
  const { rows } = await query(
    `SELECT lr.*, lt.name AS leave_type_name, lt.code AS leave_type_code
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.user_id = $1
     ORDER BY lr.created_at DESC`,
    [req.user.sub]
  );
  res.json(rows);
});

// Shared by the Admin/Dept-Head/CEO approval queues — full detail +
// conflict warnings + late/cert flags, plus who the dept_head/ceo stage
// is assigned to (if anyone) so Admin's queue can show whether it's
// waiting on a real account or needs to be proxied.
async function loadQueue(extraWhere = '', params = []) {
  // Scalar subqueries, not LEFT JOINs — department_head_of is enforced
  // unique per department, but is_ceo is NOT (nothing stops more than one
  // account being flagged CEO), and a plain `LEFT JOIN ... ON ceo.is_ceo =
  // true` would fan out every row in this result once per matching CEO.
  const { rows } = await query(
    `SELECT lr.*, lt.name AS leave_type_name, lt.code AS leave_type_code,
            u.full_name, u.employee_id, u.department,
            (SELECT full_name FROM users WHERE department_head_of = u.department LIMIT 1) AS dept_head_assigned_to,
            (SELECT full_name FROM users WHERE is_ceo = true LIMIT 1) AS ceo_assigned_to
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     JOIN users u ON u.id = lr.user_id
     ${extraWhere}
     ORDER BY lr.created_at DESC`,
    params
  );

  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      conflicts: await findConflicts(r.user_id, r.start_date, r.end_date, r.id),
    }))
  );
}

// Admin approval queue — company-wide, every request.
router.get('/queue', requireRole('admin'), async (_req, res) => {
  res.json(await loadQueue());
});

// Dept Head approval queue — scoped to their own department only.
router.get('/dept-queue', requireDeptHead, async (req, res) => {
  res.json(await loadQueue('WHERE u.department = $1', [req.user.department_head_of]));
});

// CEO approval queue — company-wide, same shape as Admin's.
router.get('/ceo-queue', requireCeo, async (_req, res) => {
  res.json(await loadQueue());
});

// Lightweight sidebar notification badge — how many requests are actually
// waiting on THIS user's action right now (not just "pending" in general,
// and not the full queue with per-row conflict checks). Zero for whichever
// capability the account doesn't have.
router.get('/approval-counts', async (req, res) => {
  const counts = { dept_head: 0, ceo: 0, admin: 0 };

  if (req.user.department_head_of) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE u.department = $1 AND lr.dept_head_status = 'pending' AND lr.overall_status = 'pending'`,
      [req.user.department_head_of]
    );
    counts.dept_head = rows[0].count;
  }

  if (req.user.is_ceo) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM leave_requests
       WHERE dept_head_status = 'approved' AND admin_status = 'approved'
         AND ceo_status = 'pending' AND overall_status = 'pending'`
    );
    counts.ceo = rows[0].count;
  }

  if (req.user.role === 'admin') {
    // Admin can always override any stage, so "every pending request"
    // would make this badge noisy and near-permanent. Scope it to what
    // genuinely needs Admin specifically: their own stage turn, plus any
    // dept_head/ceo stage that has no real account to proxy for.
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.overall_status = 'pending' AND (
         (lr.dept_head_status = 'approved' AND lr.admin_status = 'pending')
         OR (lr.dept_head_status = 'pending' AND NOT EXISTS (
               SELECT 1 FROM users h WHERE h.department_head_of = u.department))
         OR (lr.admin_status = 'approved' AND lr.ceo_status = 'pending' AND NOT EXISTS (
               SELECT 1 FROM users c WHERE c.is_ceo = true))
       )`
    );
    counts.admin = rows[0].count;
  }

  res.json(counts);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT lr.*, lt.name AS leave_type_name, lt.code AS leave_type_code,
            u.full_name, u.employee_id, u.department
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     JOIN users u ON u.id = lr.user_id
     WHERE lr.id = $1`,
    [req.params.id]
  );
  const record = rows[0];
  if (!record) return res.status(404).json({ error: 'Leave request not found' });
  if (req.user.role !== 'admin' && req.user.sub !== record.user_id) {
    return res.status(403).json({ error: 'Cannot view another employee\'s leave request' });
  }
  record.conflicts = await findConflicts(record.user_id, record.start_date, record.end_date, record.id);
  res.json(record);
});

// Section 3.2 — Submit a leave request. Both Admin and Employee may submit.
router.post('/', validate(leaveRequestSchemas.create), async (req, res) => {
  const { leave_type_id, start_date, end_date, is_half_day, reason, notify_email, cert_ack_confirmed } = req.body;

  const { rows: ltRows } = await query('SELECT * FROM leave_types WHERE id = $1', [leave_type_id]);
  const leaveType = ltRows[0];
  if (!leaveType) return res.status(400).json({ error: 'Unknown leave type' });

  // Section 3.2.2 — SL > 3 working days requires the acknowledgment
  // checkbox before the form can be submitted at all.
  const needsCertAck = requiresCertAcknowledgment(leaveType.code, start_date, end_date);
  if (needsCertAck && !cert_ack_confirmed) {
    return res.status(400).json({
      error: 'You must acknowledge the medical certificate notice before submitting this request',
    });
  }

  const submittedAt = new Date();
  let late_flag = false;
  let late_flag_reason = null;

  if (leaveType.code === 'VL') {
    late_flag = checkVacationLateFlag(submittedAt, start_date);
    if (late_flag) late_flag_reason = 'VL_LATE_SUBMISSION';
  } else if (leaveType.code === 'SL') {
    const { rows: settingsRows } = await query('SELECT workday_start_time FROM workday_settings WHERE id = 1');
    const workdayStart = settingsRows[0]?.workday_start_time || '08:00';
    late_flag = checkSickLateFlag(submittedAt, start_date, workdayStart);
    if (late_flag) late_flag_reason = 'SL_LATE_NOTIFICATION';
  }

  const { rows } = await query(
    `INSERT INTO leave_requests
       (user_id, leave_type_id, start_date, end_date, is_half_day, reason, notify_email,
        late_flag, late_flag_reason, cert_ack_confirmed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      req.user.sub, leave_type_id, start_date, end_date, !!is_half_day, reason, notify_email || null,
      late_flag, late_flag_reason, !!cert_ack_confirmed,
    ]
  );
  const created = rows[0];

  await logAction(req.user.sub, 'leave_request.submit', 'leave_request', created.id, {
    leave_type: leaveType.code, late_flag, late_flag_reason,
  });

  const { rows: userRows } = await query('SELECT full_name, employee_id, department FROM users WHERE id = $1', [req.user.sub]);
  const submitter = userRows[0];
  await sendLeaveRequestCopy(created, submitter, leaveType.name).catch((err) =>
    console.error('Failed to send leave request copy email:', err.message)
  );

  const firstStageRecipients = await getStageRecipients('dept_head', submitter.department);
  await sendApprovalNeededEmail(firstStageRecipients, 'dept_head', created, submitter.full_name, leaveType.name);

  res.status(201).json(created);
});

// Section 3.2 — fixed hierarchy: Dept Head -> Admin -> CEO. A real Dept
// Head/CEO account (once assigned/designated) performs their own stage
// directly; Admin can still proxy any stage that has no assigned account
// yet, and retains an override for stages that do (e.g. the head is
// themselves on leave) — see DECISIONS.md.
router.post('/:id/approve-stage', validate(leaveRequestSchemas.approveStage), async (req, res) => {
  const { stage, decision, name, remark } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT lr.*, u.department AS employee_department, u.full_name AS employee_name, lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = $1 FOR UPDATE OF lr`,
      [req.params.id]
    );
    const record = rows[0];
    if (!record) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Leave request not found' });
    }
    if (record.overall_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Request is already ${record.overall_status}` });
    }

    // --- Authorization: who may act on this specific stage ---
    let actingName = name || null;
    let actingUserId = null; // set only when a real Dept Head/CEO account acts themselves

    if (stage === 'admin') {
      if (req.user.role !== 'admin') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only Admin can act on the Admin stage' });
      }
    } else if (stage === 'dept_head') {
      const { rows: headRows } = await client.query(
        'SELECT id, full_name FROM users WHERE department_head_of = $1',
        [record.employee_department]
      );
      const head = headRows[0];
      if (head) {
        if (req.user.sub === head.id) {
          actingName = head.full_name;
          actingUserId = head.id;
        } else if (req.user.role !== 'admin') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: `Only ${head.full_name} (Department Head) or Admin can act on this stage` });
        }
      } else if (req.user.role !== 'admin') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No Department Head is assigned for this department yet — Admin must record this stage' });
      }
    } else {
      const { rows: ceoRows } = await client.query('SELECT id, full_name FROM users WHERE is_ceo = true LIMIT 1');
      const ceo = ceoRows[0];
      if (ceo) {
        if (req.user.sub === ceo.id) {
          actingName = ceo.full_name;
          actingUserId = ceo.id;
        } else if (req.user.role !== 'admin') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: `Only ${ceo.full_name} (CEO) or Admin can act on this stage` });
        }
      } else if (req.user.role !== 'admin') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No CEO account is designated yet — Admin must record this stage' });
      }
    }

    const stageOrder = ['dept_head', 'admin', 'ceo'];
    const currentIndex = stageOrder.indexOf(stage);
    for (let i = 0; i < currentIndex; i++) {
      if (record[`${stageOrder[i]}_status`] !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `${stageOrder[i]} must approve before ${stage}` });
      }
    }
    if (record[`${stage}_status`] !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${stage} stage has already been recorded` });
    }

    // overall_status: rejection at any stage stops the chain immediately;
    // approval requires all three stages signed off.
    let overall = 'pending';
    if (decision === 'rejected') {
      overall = 'rejected';
    } else if (
      (stage === 'dept_head' ? decision : record.dept_head_status) === 'approved' &&
      (stage === 'admin' ? decision : record.admin_status) === 'approved' &&
      (stage === 'ceo' ? decision : record.ceo_status) === 'approved'
    ) {
      overall = 'approved';
    }

    let updateSql;
    let updateParams;
    if (stage === 'dept_head') {
      updateSql = `UPDATE leave_requests SET
         dept_head_status = $2, dept_head_at = now(), dept_head_remark = $3, dept_head_name = $4, dept_head_user_id = $5,
         overall_status = $6, updated_at = now()
       WHERE id = $1 RETURNING *`;
      updateParams = [req.params.id, decision, remark || null, actingName, actingUserId, overall];
    } else if (stage === 'admin') {
      updateSql = `UPDATE leave_requests SET
         admin_status = $2, admin_at = now(), admin_remark = $3, admin_by = $4,
         overall_status = $5, updated_at = now()
       WHERE id = $1 RETURNING *`;
      updateParams = [req.params.id, decision, remark || null, req.user.sub, overall];
    } else {
      updateSql = `UPDATE leave_requests SET
         ceo_status = $2, ceo_at = now(), ceo_remark = $3, ceo_name = $4, ceo_user_id = $5,
         overall_status = $6, updated_at = now()
       WHERE id = $1 RETURNING *`;
      updateParams = [req.params.id, decision, remark || null, actingName, actingUserId, overall];
    }

    const { rows: updatedRows } = await client.query(updateSql, updateParams);
    let updated = updatedRows[0];

    if (overall === 'approved') {
      const { rows: ltRows } = await client.query('SELECT * FROM leave_types WHERE id = $1', [updated.leave_type_id]);
      const leaveType = ltRows[0];
      const days = updated.is_half_day ? 0.5 : calendarDays(updated.start_date, updated.end_date);

      if (!updated.balance_deducted) {
        await client.query(
          `INSERT INTO leave_balances (user_id, leave_type_id, remaining_credits)
           VALUES ($1, $2, $3::numeric - $4::numeric)
           ON CONFLICT (user_id, leave_type_id)
           DO UPDATE SET remaining_credits = leave_balances.remaining_credits - $4::numeric`,
          [updated.user_id, updated.leave_type_id, leaveType.default_credits_per_year, days]
        );
        const certPending = requiresCertAcknowledgment(leaveType.code, updated.start_date, updated.end_date);
        const { rows: final } = await client.query(
          `UPDATE leave_requests SET balance_deducted = true, cert_pending = $2 WHERE id = $1 RETURNING *`,
          [updated.id, certPending]
        );
        updated = final[0];
      }

      // "Approved leave auto-reflects on the attendance calendar."
      let cur = new Date(updated.start_date);
      const end = new Date(updated.end_date);
      while (cur <= end) {
        const dateStr = cur.toISOString().slice(0, 10);
        await client.query(
          `INSERT INTO attendance_records (user_id, date, status, marked_by)
           VALUES ($1, $2, 'on_leave', $3)
           ON CONFLICT (user_id, date) DO UPDATE SET status = 'on_leave', marked_by = $3, updated_at = now()`,
          [updated.user_id, dateStr, req.user.sub]
        );
        cur.setDate(cur.getDate() + 1);
      }
    }

    await client.query('COMMIT');
    await logAction(req.user.sub, `leave_request.${stage}_${decision}`, 'leave_request', req.params.id, {
      stage, decision, name, remark,
    });

    // Notify whoever is responsible for the next stage — only when the
    // chain is actually continuing (approved, and not yet the last stage).
    if (decision === 'approved' && overall === 'pending') {
      const nextStage = stageOrder[currentIndex + 1];
      const recipients = await getStageRecipients(nextStage, record.employee_department);
      await sendApprovalNeededEmail(recipients, nextStage, updated, record.employee_name, record.leave_type_name);
    }

    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Section 9, item 2 (resolved): Admin clears the cert_pending flag once
// the emailed medical certificate is received. The file itself is never
// stored — this is a receipt acknowledgment only.
router.post('/:id/cert-received', requireRole('admin'), async (req, res) => {
  const { rows } = await query(
    `UPDATE leave_requests SET cert_pending = false, cert_received_at = now()
     WHERE id = $1 AND cert_pending = true RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No pending certificate on this request' });
  await logAction(req.user.sub, 'leave_request.cert_received', 'leave_request', req.params.id, {});
  res.json(rows[0]);
});

export default router;
