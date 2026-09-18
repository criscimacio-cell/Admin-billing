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

# Palette

Section 8 named two teal options. **`#0F766E`** (darker,
corporate/health-tech-leaning) was used as the working assumption per the
project plan and is wired up as the `brand` color scale in
`frontend/tailwind.config.js`. Swap the scale's values if `#14B8A6`
(lighter) is preferred instead — everything in the UI references the
`brand-*` Tailwind classes, so no other file needs to change.
