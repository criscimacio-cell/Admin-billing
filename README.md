# StashHQ — Attendance & Leave Tracking

Internal web application for Stash PH to replace manual/ad-hoc tracking of
employee attendance and leave requests. Built per the Project Plan v3
(see `DECISIONS.md` for how the plan's three open items were resolved).

Two roles: **Admin** and **Employee**. Multi-device, persistent, shared —
a real backend and database, not a local/offline tool.

## Stack (Section 6 — zero out-of-pocket cost)

| Layer | Tool |
|---|---|
| Frontend | React + Tailwind CSS (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase or Neon free tier, or local Postgres) |
| Auth | JWT (self-implemented) |
| Backend hosting | Render free web service |
| Frontend hosting | Vercel or Netlify free tier |
| Email | Resend or SendGrid free-tier SMTP relay |

## Repository layout

```
backend/    Express API, PostgreSQL schema, business logic
frontend/   React + Tailwind client (Vite)
DECISIONS.md   How the plan's open items were resolved
```

## Local setup

### 1. Database

```bash
createdb stashhq   # or create a free Supabase/Neon Postgres instance
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

The seed creates the first Admin account:
- Email: `admin@stash.ph`
- Password: `ChangeMe123!`

Change this password immediately after first login (Admin → Employees →
Set password).

### 2. Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173, proxies /api to :4000
```

## What's implemented (Project Plan v3)

- **RBAC** (Section 2): Admin / Employee only; Dept Head and CEO have no
  logins — their decisions are recorded by Admin as logged steps.
- **Attendance** (3.1): per-employee/day marking, day view across all
  employees, monthly summary, employee discrepancy flags + Admin
  resolution queue.
- **Leave management** (3.2): configurable leave types & credits,
  half-day requests, notify-email copy on submission, fixed
  Dept Head → Admin → CEO approval chain (all three required, any
  rejection stops the chain), auto-deduction from balance on approval,
  conflict warnings for overlapping approved leave, approved leave
  auto-reflected on the attendance calendar, team leave calendar with
  reason visibility scoped per Section 5.
- **Leave-type rules** (3.2.1 / 3.2.2): VL ≥3-calendar-day lead time and
  SL vs. workday-start-time checks, both informational-only late flags;
  medical-certificate acknowledgment checkbox for SL > 3 working days
  (no upload — the certificate is emailed to Admin outside the app).
- **Reporting & dashboard** (3.3): Admin stats, CSV export for attendance
  and leave summaries.
- **Audit trail** (3.4): every attendance mark/edit and every
  approval-chain step logged, Admin-only.
- **Login screen** (Section 8): single form, no self-registration, no
  self-serve password reset, teal palette, server-side role routing.

Out of scope for v1, per Section 7: biometric/clock-in and payroll
integrations, native mobile app, any notification beyond the leave
notify-email, and any in-app handling of the medical certificate file
itself.

### Incentives (added post-v1, see `DECISIONS.md`)

CEO-granted incentives (burger meal, coffee, etc.) on irregular dates,
each requiring a receipt back from the employee for BIR substantiation:

- Admin logs a grant per employee (description, amount, date, notes).
- Employee uploads the receipt (JPG/PNG/WEBP/PDF, max 5MB) plus OR/receipt
  number and vendor name from "My Incentives".
- Admin reviews and verifies or rejects (with a note, sent back to the
  employee for resubmission) from "Incentives".
- CSV export for a filing period, alongside the attendance/leave exports.
- Admin dashboard KPI for receipts not yet verified.

The receipt file is stored as base64 in Postgres rather than a separate
object-storage service, to stay on the zero-cost stack without adding a
new dependency — revisit (e.g. Supabase Storage) if volume grows.

## Deploying to the free-tier stack

1. Push this repo to a private GitHub repo.
2. Create a Postgres database on Supabase or Neon; run `db/schema.sql`
   then `db/seed.sql` against it.
3. Deploy `backend/` to Render as a free web service; set the env vars
   from `.env.example` (`DATABASE_URL` pointing at the hosted Postgres,
   a strong `JWT_SECRET`, SMTP credentials from Resend/SendGrid).
4. Deploy `frontend/` to Vercel or Netlify; set `VITE_API_PROXY_TARGET`
   or update the API base URL to point at the deployed backend.

## Applying schema changes to an existing database

New tables/columns added after the initial build live in
`backend/db/migrations/`, numbered in order. Run any you haven't applied
yet against your existing database:

```bash
psql "$DATABASE_URL" -f backend/db/migrations/002_incentives.sql
```

`db/schema.sql` already includes everything for a brand-new database —
only run the migration files if you're updating a database created
before that feature existed.
