-- Incremental migration for an existing database (schema.sql already
-- includes this table for fresh installs — run this only against a DB
-- that predates the incentives feature).

CREATE TYPE incentive_receipt_status AS ENUM ('pending', 'submitted', 'verified');

CREATE TABLE incentives (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description                 TEXT NOT NULL,
  amount                      NUMERIC(10,2) NOT NULL,
  given_date                  DATE NOT NULL,
  notes                       TEXT,
  created_by                  UUID NOT NULL REFERENCES users(id),

  receipt_status              incentive_receipt_status NOT NULL DEFAULT 'pending',
  receipt_or_number           TEXT,
  receipt_vendor_name         TEXT,
  receipt_amount              NUMERIC(10,2),
  receipt_file_name           TEXT,
  receipt_file_mime           TEXT,
  receipt_file_data           TEXT,
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
