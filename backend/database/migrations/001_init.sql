-- 001_init.sql
-- Baseline schema reconstructed from the queries in backend/src/services/*.
--
-- IMPORTANT: verify this against the live database before relying on it:
--     pg_dump --schema-only "$DATABASE_URL" > live-schema.sql
-- and reconcile any differences (column types, constraint names).
--
-- Written to be idempotent and non-destructive: every statement uses
-- IF NOT EXISTS, nothing is dropped or altered, so running `npm run db:migrate`
-- against the existing live database cannot remove data. On an existing
-- database the CREATE TABLE statements are no-ops; the unique indexes will be
-- added only if the existing data already satisfies them (otherwise the
-- migration fails and rolls back, leaving the database unchanged).

CREATE TABLE IF NOT EXISTS companies (
    company_id   SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT companies_name_not_blank CHECK (btrim(company_name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_name_lower
    ON companies (LOWER(company_name));

CREATE TABLE IF NOT EXISTS documents (
    document_id    SERIAL PRIMARY KEY,
    company_id     INTEGER NOT NULL REFERENCES companies (company_id) ON DELETE RESTRICT,
    document_hash  VARCHAR(128) NOT NULL,
    openai_file_id TEXT,
    report_name    VARCHAR(300) NOT NULL,
    report_type    VARCHAR(80) NOT NULL,
    report_date    DATE,
    currency       CHAR(3),
    source         VARCHAR(500),
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT documents_report_type_check CHECK (report_type IN (
        'Annual Report', 'Interim Report', 'Half-Year Report', 'Quarterly Report',
        'Trading Update', 'Financial Statements', 'Information Document',
        'Admission Document', 'Prospectus', 'Other'
    )),
    CONSTRAINT documents_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_document_hash
    ON documents (document_hash);
CREATE INDEX IF NOT EXISTS ix_documents_company_id
    ON documents (company_id);

CREATE TABLE IF NOT EXISTS financial_periods (
    period_id        SERIAL PRIMARY KEY,
    company_id       INTEGER NOT NULL REFERENCES companies (company_id) ON DELETE RESTRICT,
    period           VARCHAR(32) NOT NULL,
    period_label     VARCHAR(120),
    period_end       DATE,
    revenue          NUMERIC(24, 2),
    gross_profit     NUMERIC(24, 2),
    operating_profit NUMERIC(24, 2),
    ebitda           NUMERIC(24, 2),
    net_profit       NUMERIC(24, 2),
    cash             NUMERIC(24, 2),
    debt             NUMERIC(24, 2),
    customers        BIGINT,
    net_assets       NUMERIC(24, 2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT financial_periods_period_format CHECK (
        period ~ '^(FY[0-9]{4}|(Q[1-4]|H[12]|YTD|M(3|6|9|12))_[0-9]{4})$'
    ),
    CONSTRAINT financial_periods_customers_non_negative CHECK (customers IS NULL OR customers >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_financial_periods_company_period
    ON financial_periods (company_id, period);

CREATE TABLE IF NOT EXISTS document_periods (
    document_id INTEGER NOT NULL REFERENCES documents (document_id) ON DELETE CASCADE,
    period_id   INTEGER NOT NULL REFERENCES financial_periods (period_id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, period_id)
);

CREATE INDEX IF NOT EXISTS ix_document_periods_period_id
    ON document_periods (period_id);
