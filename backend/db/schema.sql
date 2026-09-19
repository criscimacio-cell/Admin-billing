-- StashHQ — Attendance & Leave Tracking
-- Schema matches Project Plan v3, Section 4 (Data Model), plus the three
-- open items from Section 9 as resolved (see DECISIONS.md at repo root):
--   1. Medical-cert contact email lives in workday_settings.admin_notify_email
--      (config field, not hardcoded in the UI).
--   2. leave_requests.cert_pending flags an approved SL >3 working days
--      request until Admin marks the certificate received.
--   3. late_flag / late_flag_reason are informational only — they do not
--      alter the approval workflow.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE user_status AS ENUM ('active', 'disabled');

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE overall_leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE late_flag_reason AS ENUM ('VL_LATE_SUBMISSION', 'SL_LATE_NOTIFICATION');

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  employee_id         TEXT NOT NULL UNIQUE,
  department          TEXT NOT NULL,
  position            TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  role                user_role NOT NULL DEFAULT 'employee',
  status              user_status NOT NULL DEFAULT 'active',

  -- Everyone (including admin) is fundamentally an employee; these are
  -- additional approval capabilities layered on top, not exclusive roles.
  -- department_head_of holds the department name this person heads
  -- (matched against other users' `department` by value, not a strict FK,
  -- so existing free-text department values never break). Enforced to at
  -- most one head per department via the partial unique index below.
  department_head_of  TEXT,
  is_ceo              BOOLEAN NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_one_head_per_department
  ON users(department_head_of) WHERE department_head_of IS NOT NULL;

CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          attendance_status NOT NULL,
  marked_by       UUID NOT NULL REFERENCES users(id),
  notes           TEXT,
  flagged         BOOLEAN NOT NULL DEFAULT false,
  flag_comment    TEXT,
  flag_resolved   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE leave_types (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE,
  code                    TEXT NOT NULL UNIQUE, -- e.g. 'VL', 'SL', 'EL'
  default_credits_per_year NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leave_balances (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id     UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  remaining_credits NUMERIC(6,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, leave_type_id)
);

CREATE TABLE leave_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id       UUID NOT NULL REFERENCES leave_types(id),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  is_half_day         BOOLEAN NOT NULL DEFAULT false,
  reason              TEXT NOT NULL,
  notify_email        TEXT,

  -- dept_head_name/ceo_name stay as the display name regardless of mode;
  -- dept_head_user_id/ceo_user_id are set only when a real Dept
  -- Head/CEO account performed the stage themselves (null when Admin
  -- proxied it, e.g. no head assigned yet for that department).
  dept_head_name      TEXT,
  dept_head_user_id   UUID REFERENCES users(id),
  dept_head_status    approval_status NOT NULL DEFAULT 'pending',
  dept_head_at        TIMESTAMPTZ,
  dept_head_remark    TEXT,

  admin_status        approval_status NOT NULL DEFAULT 'pending',
  admin_by            UUID REFERENCES users(id),
  admin_at            TIMESTAMPTZ,
  admin_remark        TEXT,

  ceo_name            TEXT,
  ceo_user_id         UUID REFERENCES users(id),
  ceo_status          approval_status NOT NULL DEFAULT 'pending',
  ceo_at              TIMESTAMPTZ,
  ceo_remark          TEXT,

  overall_status      overall_leave_status NOT NULL DEFAULT 'pending',

  -- Informational only (Section 9, item 3) — never gates approval.
  late_flag           BOOLEAN NOT NULL DEFAULT false,
  late_flag_reason    late_flag_reason,

  -- SL > 3 working days: cert handled by email, outside the app.
  cert_ack_confirmed  BOOLEAN NOT NULL DEFAULT false,
  -- Section 9, item 2: cleared by Admin once the emailed cert is received.
  cert_pending        BOOLEAN NOT NULL DEFAULT false,
  cert_received_at    TIMESTAMPTZ,

  balance_deducted    BOOLEAN NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- Section 9, item 1: admin_notify_email is a config field (not hardcoded
-- in the UI) so the medical-certificate instructional text stays correct
-- if Admin's contact address changes.
CREATE TABLE workday_settings (
  id                   INT PRIMARY KEY DEFAULT 1,
  workday_start_time   TIME NOT NULL DEFAULT '08:00',
  admin_notify_email   TEXT NOT NULL DEFAULT 'admin@stash.ph',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  details     JSONB
);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- CEO-granted incentives (burger meal, coffee, etc. on irregular dates) that
-- require a receipt back from the employee for BIR substantiation. Receipt
-- fields live on the same row (one receipt per grant), following the same
-- pattern as leave_requests' embedded cert fields. The file itself is
-- stored as base64 in Postgres rather than a separate object-storage
-- service, to stay on the zero-cost stack without adding a new dependency
-- — revisit if volume grows, per the same philosophy as Section 6.
CREATE TYPE incentive_receipt_status AS ENUM ('pending', 'submitted', 'verified');

CREATE TABLE incentives (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description                 TEXT NOT NULL, -- e.g. "Burger Meal", "Coffee"
  amount                      NUMERIC(10,2) NOT NULL,
  given_date                  DATE NOT NULL, -- approximate date is fine
  notes                       TEXT,
  created_by                  UUID NOT NULL REFERENCES users(id),

  receipt_status              incentive_receipt_status NOT NULL DEFAULT 'pending',
  receipt_or_number           TEXT,
  receipt_vendor_name         TEXT,
  receipt_amount              NUMERIC(10,2),
  receipt_file_name           TEXT,
  receipt_file_mime           TEXT,
  receipt_file_data           TEXT, -- base64
  receipt_file_size           INT,
  receipt_submitted_at        TIMESTAMPTZ,
  receipt_verified_by         UUID REFERENCES users(id),
  receipt_verified_at         TIMESTAMPTZ,
  receipt_verification_notes  TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incentives_user ON incentives(user_id);
CREATE INDEX idx_incentives_receipt_status ON incentives(receipt_status);
CREATE INDEX idx_incentives_given_date ON incentives(given_date);
