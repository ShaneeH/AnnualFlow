-- 002_additional_metrics.sql
-- Adds extra extracted metrics to financial_periods. All columns are nullable.
-- Idempotent and non-destructive (ADD COLUMN IF NOT EXISTS only), safe to run
-- against the live database. Must be applied BEFORE deploying the backend that
-- reads/writes these columns, otherwise queries will fail with
-- "column ... does not exist".

ALTER TABLE financial_periods
    ADD COLUMN IF NOT EXISTS operating_cash_flow NUMERIC(24, 2),
    ADD COLUMN IF NOT EXISTS total_assets        NUMERIC(24, 2),
    ADD COLUMN IF NOT EXISTS total_liabilities   NUMERIC(24, 2),
    ADD COLUMN IF NOT EXISTS eps                 NUMERIC(18, 4);
