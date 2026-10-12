-- 004_report_jobs_and_demo.sql
-- Idempotent and non-destructive (IF NOT EXISTS only).
--
-- 1. report_jobs: background processing of uploaded PDFs (JOB_MODE=async).
--    The PDF bytes are kept only until the job finishes, then cleared.
-- 2. companies.is_demo: marks seeded fictional demo data (npm run db:seed:demo).

CREATE TABLE IF NOT EXISTS report_jobs (
    job_id        UUID PRIMARY KEY,
    status        VARCHAR(16) NOT NULL DEFAULT 'queued',
    original_name VARCHAR(255) NOT NULL,
    document_hash VARCHAR(128) NOT NULL,
    pdf           BYTEA,
    error         TEXT,
    error_code    VARCHAR(64),
    document_id   INTEGER REFERENCES documents (document_id) ON DELETE SET NULL,
    request_id    VARCHAR(128),
    attempts      INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT report_jobs_status_check CHECK (
        status IN ('queued', 'processing', 'succeeded', 'rejected', 'failed')
    )
);

CREATE INDEX IF NOT EXISTS ix_report_jobs_queued
    ON report_jobs (created_at)
    WHERE status = 'queued';

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
