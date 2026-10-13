-- 003_ai_insights.sql
-- Cached AI insight per company reporting period. Generated on demand only.
-- Idempotent and non-destructive (IF NOT EXISTS only).
--
-- Lifecycle (consistent with how periods are deleted):
--   * Deleting a company cascades to its insights (FK ON DELETE CASCADE).
--   * Insights are keyed by (company_id, period), the same natural key the
--     app uses for financial_periods. When a document delete removes an
--     orphaned financial period, the application deletes that period's
--     insight in the same transaction (documents.service.ts).
--   * When an upload changes a period's figures, its cached insight is
--     deleted so it is regenerated from the new numbers.

CREATE TABLE IF NOT EXISTS ai_insights (
    insight_id   SERIAL PRIMARY KEY,
    company_id   INTEGER NOT NULL REFERENCES companies (company_id) ON DELETE CASCADE,
    period       VARCHAR(32) NOT NULL,
    content      JSONB NOT NULL,
    model        VARCHAR(100) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_insights_company_period_unique UNIQUE (company_id, period),
    CONSTRAINT ai_insights_content_is_object CHECK (jsonb_typeof(content) = 'object')
);
