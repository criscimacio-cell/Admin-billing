# Open Items — Resolutions

Project Plan v3, Section 9 listed three items as explicitly unresolved
("not called out ... resolved on your behalf"). They were put to the
person requesting this build rather than assumed. Their answers, and how
each is implemented:

## 1. Medical-certificate contact email

**Decision: config field**, not hardcoded in the UI.

`workday_settings.admin_notify_email` (single-row table, Admin-editable
via the Workday Settings screen) holds the address shown in the SL > 3
working days instructional notice. Changing it in Admin takes effect
immediately on the leave request form — no code change or deploy needed.

## 2. In-app signal for "SL > 3 days, cert pending"

**Decision: yes, flag it.**

`leave_requests.cert_pending` is set `true` automatically the moment an
SL request exceeding 3 working days reaches full approval. It shows as an
"Medical certificate pending" badge in the Admin leave queue. Admin clears
it with an explicit "Mark certificate received" action
(`POST /api/leave-requests/:id/cert-received`), which only records a
receipt acknowledgment — the certificate file itself is still never
uploaded, stored, or handled by the system (Section 3.2.2 / Section 7).

## 3. Consequence of a VL/SL "late flag"

**Decision: purely informational.**

`late_flag` / `late_flag_reason` are computed at submission time and
surfaced to Admin (leave queue, employee's own leave history, audit log,
and the leave CSV export) but never alter the approval workflow. The
3-stage Dept Head → Admin → CEO chain runs identically whether or not a
request is late-flagged; there is no override/acknowledgment gate tied to
it.

---

# Incentives (added post-v1)

Not part of the original Project Plan v3 — added on request to track
CEO-granted incentives (burger meal, coffee, etc. on irregular dates)
and the receipt each employee needs to send back for BIR
substantiation. Three forks were confirmed before building rather than
assumed:

## 1. Receipt proof

**Decision: employee uploads the actual file** (JPG/PNG/WEBP/PDF, max
5MB), not just an acknowledgment checkbox like the medical-certificate
flow. Admin can view and archive it. Stored as base64 in Postgres
(`incentives.receipt_file_data`) rather than a separate object-storage
service — keeps the zero-cost stack without a new dependency; revisit
(e.g. Supabase Storage) if volume grows enough that this gets unwieldy.

## 2. Grant granularity

**Decision: per employee.** One `incentives` row per person per grant.
A group treat (e.g. a team lunch) is logged once per attendee rather
than as a single multi-recipient event — simpler data model, and makes
"who still owes a receipt" a plain per-row status instead of a join.

## 3. Required receipt fields

**Decision: OR/receipt number, vendor name, and a single total amount**
(no line-item breakdown). Matches what a BIR audit would actually trace
a transaction by, without asking employees to itemize a fast-food
receipt.

---

# Dept Head / CEO real accounts (reverses Section 2)

Project Plan v3, Section 2 was explicit: "There is no separate login for
Department Head or CEO — their input in the leave approval chain is
recorded by Admin as a logged step." This was reversed on request — Dept
Head and CEO now get real logins. Since "Admin and Dept Head are also
employee," these are **capabilities layered on the base role**, not
exclusive roles: `users.department_head_of` (the department name they
head, nullable) and `users.is_ceo` (boolean) sit alongside the existing
`role` (admin/employee) column, and everyone — including Admin — keeps
full access to the Personal section (My Attendance, Request Leave, My
Leave, My Incentives).

Three forks were confirmed before building:

## 1. Fallback when no Dept Head account exists for a department yet

**Decision: Admin can still proxy that stage.** `POST
/api/leave-requests/:id/approve-stage` checks whether a real account is
assigned (`department_head_of` for that department, or `is_ceo` for the
CEO stage); if one exists, only that account or Admin may act on the
stage — the real account's name is filled in automatically and their
`user_id` recorded (`dept_head_user_id` / `ceo_user_id`), never a manually
typed name. If no account is assigned yet, only Admin may act (unchanged
from the original design), with the manually typed name preserved as
before. This was the recommended default, not an explicit choice — the
user gave their department list instead of picking, so revisit if
stricter enforcement (block until every department has a real account)
turns out to be preferred once all three departments (Admin, Sales,
Services Delivery Group) have heads assigned.

## 2. One Dept Head per department, or co-heads

**Decision: exactly one.** Enforced at the database level with a partial
unique index (`idx_users_one_head_per_department`) on
`department_head_of` — a second `PATCH /api/users/:id` trying to assign
the same department returns 409, not a silent overwrite.

## 3. Dept Head visibility beyond approvals

**Decision: read-only department attendance too.** `GET
/api/attendance/my-department` returns this month's per-employee
attendance counts for the Dept Head's own department (Team Approvals
page) — for approval context, not editable; marking attendance stays
Admin-only.

---

# Approval-stage email notifications (added post-v1)

Also not in the original plan (Section 7 explicitly listed "any
notification beyond the leave-request notify-email field" as out of
scope) — added on request once Dept Head/CEO became real accounts,
since a request can now sit unnoticed with someone who doesn't check
their queue daily.

**Decision: automatic, using each account's own login email — no new
form fields.** When a request is submitted, and again each time a stage
is approved, the account responsible for the *next* stage is emailed
directly: the real Dept Head/CEO account's `users.email` if one is
assigned, or every active Admin if not (the same fallback
`approve-stage` itself uses). The employee never types an approver's
email — that was explicitly considered and rejected, since it would
reintroduce exactly the staleness/typo problem the real-account work was
meant to fix. No email fires on the final approval (nothing left to
notify) or on a rejection (chain already stopped). Implemented in
`sendApprovalNeededEmail` (`backend/src/utils/email.js`) and
`getStageRecipients` (`backend/src/routes/leaveRequests.js`).

---

# Palette

Section 8 named two teal options. **`#0F766E`** (darker,
corporate/health-tech-leaning) was used as the working assumption per the
project plan and is wired up as the `brand` color scale in
`frontend/tailwind.config.js`. Swap the scale's values if `#14B8A6`
(lighter) is preferred instead — everything in the UI references the
`brand-*` Tailwind classes, so no other file needs to change.
