-- Default leave types (Section 3.2 — configurable via UI afterwards)
INSERT INTO leave_types (name, code, default_credits_per_year) VALUES
  ('Vacation Leave', 'VL', 15),
  ('Sick Leave', 'SL', 15),
  ('Emergency Leave', 'EL', 5)
ON CONFLICT (code) DO NOTHING;

-- Single-row company-wide workday settings (Section 3.2.1 / 4)
INSERT INTO workday_settings (id, workday_start_time, admin_notify_email)
VALUES (1, '08:00', 'admin@stash.ph')
ON CONFLICT (id) DO NOTHING;

-- First Admin account so the app is usable on a fresh database.
-- Password: ChangeMe123! (bcrypt hash below) — change immediately after first login.
INSERT INTO users (full_name, employee_id, department, position, email, password_hash, role, status)
VALUES (
  'System Admin',
  'EMP-000',
  'Administration',
  'Administrator',
  'admin@stash.ph',
  '$2a$10$smdkYhK1qqe1BL1eN4LHm.s7/2T5h3NphAyckobyFEX2KnuqKRkqG',
  'admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;
