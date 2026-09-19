-- Test/demo credentials for exercising the CEO / Dept Head / Employee
-- approval chain end-to-end. Safe to re-run (idempotent on email).
-- Password for all three: Test1234!

INSERT INTO users (full_name, employee_id, department, position, email, password_hash, role, status)
VALUES ('Test Employee', 'TEST-EMP', 'QA Test Team', 'QA Tester', 'test.emp@stash.ph',
  '$2a$10$MGYUqarDQK6stz9zGbZrfu77T6m1Ht8SmnkEYD.2MkitgCccSrfzO', 'employee', 'active')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash, status = 'active';

INSERT INTO users (full_name, employee_id, department, position, email, password_hash, role, status, department_head_of)
VALUES ('Test Dept Head', 'TEST-HEAD', 'QA Test Team', 'QA Lead', 'test.head@stash.ph',
  '$2a$10$MGYUqarDQK6stz9zGbZrfu77T6m1Ht8SmnkEYD.2MkitgCccSrfzO', 'employee', 'active', 'QA Test Team')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash, status = 'active', department_head_of = 'QA Test Team';

INSERT INTO users (full_name, employee_id, department, position, email, password_hash, role, status, is_ceo)
VALUES ('Test CEO', 'TEST-CEO', 'Administration', 'Chief Executive Officer', 'test.ceo@stash.ph',
  '$2a$10$MGYUqarDQK6stz9zGbZrfu77T6m1Ht8SmnkEYD.2MkitgCccSrfzO', 'employee', 'active', true)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash, status = 'active', is_ceo = true;
