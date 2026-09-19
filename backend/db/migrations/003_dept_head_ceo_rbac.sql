-- Incremental migration for an existing database (schema.sql already
-- includes this for fresh installs).
--
-- Adds real login capability for Dept Head and CEO on top of the base
-- employee/admin role — everyone (including admin) keeps their own
-- employee self-service access; this only adds approval authority.

ALTER TABLE users ADD COLUMN department_head_of TEXT;
ALTER TABLE users ADD COLUMN is_ceo BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_users_one_head_per_department
  ON users(department_head_of) WHERE department_head_of IS NOT NULL;

ALTER TABLE leave_requests ADD COLUMN dept_head_user_id UUID REFERENCES users(id);
ALTER TABLE leave_requests ADD COLUMN ceo_user_id UUID REFERENCES users(id);
