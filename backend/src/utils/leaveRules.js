// Section 3.2.1 — Leave Type-Specific Rules.
// Late flags are informational only (Section 9, item 3): they never block
// submission and never gate the approval chain.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/** Vacation Leave: must be submitted >=3 calendar days before start date. */
export function checkVacationLateFlag(submittedAt, startDate) {
  const lead = daysBetween(submittedAt, new Date(startDate));
  return lead < 3;
}

/**
 * Sick Leave: flag "late notification" if submitted on the leave's start
 * date, after the company-wide workday start time.
 */
export function checkSickLateFlag(submittedAt, startDate, workdayStartTime) {
  const submittedDateStr = submittedAt.toISOString().slice(0, 10);
  const startDateStr = new Date(startDate).toISOString().slice(0, 10);
  if (submittedDateStr !== startDateStr) return false;

  const [h, m] = workdayStartTime.split(':').map(Number);
  const thresholdMinutes = h * 60 + m;
  const submittedMinutes = submittedAt.getHours() * 60 + submittedAt.getMinutes();
  return submittedMinutes > thresholdMinutes;
}

/** Inclusive count of Mon-Fri days between two dates. */
export function countWorkingDays(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Section 3.2.2: SL requests exceeding 3 working days require the
 * acknowledgment checkbox and, once approved, a cert_pending flag. */
export function requiresCertAcknowledgment(leaveTypeCode, startDate, endDate) {
  if (leaveTypeCode !== 'SL') return false;
  return countWorkingDays(startDate, endDate) > 3;
}
