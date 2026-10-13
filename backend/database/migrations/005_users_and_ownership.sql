-- 005_users_and_ownership.sql
-- Idempotent and non-destructive.
--
-- Sign in with Google: one row per Google account (keyed by the stable "sub" claim).
-- Ownership: companies, documents and report_jobs get a nullable user_id.
--   NULL      = public (existing rows and the example dataset), readable by everyone, writable by no one.
--   <user id> = private to that user.
-- financial_periods, document_periods and ai_insights are owned through their company.

CREATE TABLE IF NOT EXISTS users (
    user_id    SERIAL PRIMARY KEY,
    google_sub VARCHAR(255) NOT NULL,
    email      VARCHAR(320),
    name       VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_sub ON users (google_sub);

ALTER TABLE companies   ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (user_id) ON DELETE RESTRICT;
ALTER TABLE documents   ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (user_id) ON DELETE RESTRICT;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_companies_user_id ON companies (user_id);
CREATE INDEX IF NOT EXISTS ix_documents_user_id ON documents (user_id);

-- Company names and document hashes were globally unique. They are now unique per owner,
-- so two users can each upload the same PDF or track the same company without seeing each other.
DROP INDEX IF EXISTS ux_companies_name_lower;
CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_owner_name_lower
    ON companies (COALESCE(user_id, 0), LOWER(company_name));

DROP INDEX IF EXISTS ux_documents_document_hash;
CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_owner_document_hash
    ON documents (COALESCE(user_id, 0), document_hash);
