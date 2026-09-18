import { query } from '../db.js';

/** Section 3.4 — Audit Trail. Viewable by Admin only (enforced in the route). */
export async function logAction(actorId, action, targetType, targetId, details = {}) {
  await query(
    `INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, action, targetType, String(targetId), details]
  );
}
