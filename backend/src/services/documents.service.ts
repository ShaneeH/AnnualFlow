import { PoolClient } from "pg";

import { pool } from "../database/db";
import {
    FinancialPeriod,
    FinancialReport
} from "../utils/report-validator";

export class DuplicateDocumentError extends Error {
    constructor() {
        super("This exact PDF has already been uploaded.");
        this.name = "DuplicateDocumentError";
    }
}

export interface DocumentPeriodRecord {
    periodId: number;
    period: string;
    periodLabel: string | null;
    periodEnd: string | null;
    revenue: number | string | null;
    grossProfit: number | string | null;
    operatingProfit: number | string | null;
    ebitda: number | string | null;
    netProfit: number | string | null;
    cash: number | string | null;
    debt: number | string | null;
    customers: number | string | null;
    netAssets: number | string | null;
<<<<<<< HEAD
=======
    operatingCashFlow: number | string | null;
    totalAssets: number | string | null;
    totalLiabilities: number | string | null;
    eps: number | string | null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
}

export interface FinancialDocumentRecord {
    documentId: number;
    companyId: number;
    companyName: string;
    reportName: string;
    reportType: string;
    reportDate: string | null;
    currency: string | null;
    source: string | null;
    uploadedAt: string;
<<<<<<< HEAD
=======
    /** SHA-256 of the uploaded PDF bytes (used for duplicate detection). */
    documentHash?: string | null;
    /** True when the viewer owns it (rows from other users are never returned). */
    isOwned?: boolean;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    periods: DocumentPeriodRecord[];
}

/**
 * A figure that an upload changed on a period that already existed.
 * The new value is still written (current merge behaviour); this record
 * makes the overwrite visible to the caller instead of silent.
 */
export interface PeriodConflict {
    period: string;
    field: string;
    previousValue: number | string | null;
    newValue: number | string | null;
}

export interface SavedDocumentResult {
    documentId: number;
    conflicts: PeriodConflict[];
}

export interface DocumentListOptions {
<<<<<<< HEAD
=======
    /** Signed-in user id, or null for public rows only. */
    viewerId: number | null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    companyId?: number;
    limit?: number;
    offset?: number;
}

export interface DeletedDocument {
    documentId: number;
    reportName: string;
    openaiFileId: string | null;
}

const DOCUMENT_SELECT = `
    SELECT
        d.document_id AS "documentId",
        d.company_id AS "companyId",
        c.company_name AS "companyName",
        d.report_name AS "reportName",
        d.report_type AS "reportType",
        d.report_date AS "reportDate",
        d.currency,
        d.source,
        d.uploaded_at AS "uploadedAt",
<<<<<<< HEAD
=======
        d.document_hash AS "documentHash",
        (d.user_id IS NOT NULL) AS "isOwned",
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'periodId', fp.period_id,
                    'period', fp.period,
                    'periodLabel', fp.period_label,
                    'periodEnd', fp.period_end,
                    'revenue', fp.revenue,
                    'grossProfit', fp.gross_profit,
                    'operatingProfit', fp.operating_profit,
                    'ebitda', fp.ebitda,
                    'netProfit', fp.net_profit,
                    'cash', fp.cash,
                    'debt', fp.debt,
                    'customers', fp.customers,
<<<<<<< HEAD
                    'netAssets', fp.net_assets
=======
                    'netAssets', fp.net_assets,
                    'operatingCashFlow', fp.operating_cash_flow,
                    'totalAssets', fp.total_assets,
                    'totalLiabilities', fp.total_liabilities,
                    'eps', fp.eps
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
                )
                ORDER BY fp.period_end DESC NULLS LAST, fp.period_id DESC
            ) FILTER (WHERE fp.period_id IS NOT NULL),
            '[]'::JSONB
        ) AS periods
    FROM documents d
    JOIN companies c
        ON c.company_id = d.company_id
    LEFT JOIN document_periods dp
        ON dp.document_id = d.document_id
    LEFT JOIN financial_periods fp
        ON fp.period_id = dp.period_id
`;

const DOCUMENT_GROUP = `
    GROUP BY
        d.document_id,
        d.company_id,
        c.company_name,
        d.report_name,
        d.report_type,
        d.report_date,
        d.currency,
        d.source,
<<<<<<< HEAD
        d.uploaded_at
`;

export async function documentExistsByHash(
    documentHash: string
): Promise<boolean> {
    const result = await pool.query(
        "SELECT 1 FROM documents WHERE document_hash = $1 LIMIT 1",
        [documentHash]
=======
        d.uploaded_at,
        d.document_hash,
        d.user_id
`;

/** Visibility rule shared with companies.service: public rows plus the viewer's own. */
const visibleDocument = (param: string) => `(d.user_id IS NULL OR d.user_id = ${param})`;

/** Duplicate check, per owner: another user's copy of the same PDF does not count. */
export async function documentExistsByHash(
    documentHash: string,
    ownerId: number
): Promise<boolean> {
    const result = await pool.query(
        "SELECT 1 FROM documents WHERE document_hash = $1 AND user_id = $2 LIMIT 1",
        [documentHash, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    return Boolean(result.rowCount);
}

export async function saveFinancialDocument(
    documentHash: string,
    openaiFileId: string,
<<<<<<< HEAD
    report: FinancialReport
=======
    report: FinancialReport,
    ownerId: number
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
): Promise<SavedDocumentResult> {
    const client = await pool.connect();
    const conflicts: PeriodConflict[] = [];

    try {
        await client.query("BEGIN");

        const existing = await client.query(
<<<<<<< HEAD
            "SELECT 1 FROM documents WHERE document_hash = $1 LIMIT 1",
            [documentHash]
=======
            "SELECT 1 FROM documents WHERE document_hash = $1 AND user_id = $2 LIMIT 1",
            [documentHash, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        );

        if (existing.rowCount) {
            throw new DuplicateDocumentError();
        }

<<<<<<< HEAD
        const companyId = await getOrCreateCompany(
            client,
            report.company
=======
        // Always the uploader's own company record, never a public or another user's one.
        const companyId = await getOrCreateCompany(
            client,
            report.company,
            ownerId
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        );

        const documentId = await insertDocument(
            client,
<<<<<<< HEAD
=======
            ownerId,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            companyId,
            documentHash,
            openaiFileId,
            report
        );

        for (const period of report.periods) {
            const periodId = await upsertFinancialPeriod(
                client,
                companyId,
                period,
                conflicts
            );

<<<<<<< HEAD
=======
            // The period's figures may have changed: invalidate its cached insight.
            await client.query(
                "DELETE FROM ai_insights WHERE company_id = $1 AND period = $2",
                [companyId, period.period]
            );

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            await linkDocumentToPeriod(
                client,
                documentId,
                periodId
            );
        }

        await client.query("COMMIT");

        return { documentId, conflicts };
    } catch (error) {
        await client.query("ROLLBACK");

        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            throw new DuplicateDocumentError();
        }

        throw error;
    } finally {
        client.release();
    }
}

export async function getDocuments(
<<<<<<< HEAD
    options: DocumentListOptions = {}
): Promise<FinancialDocumentRecord[]> {
    const values: number[] = [];
    const conditions: string[] = [];
=======
    options: DocumentListOptions
): Promise<FinancialDocumentRecord[]> {
    const values: Array<number | null> = [options.viewerId];
    const conditions: string[] = [visibleDocument("$1")];
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    if (options.companyId !== undefined) {
        values.push(options.companyId);

        conditions.push(
            `d.company_id = $${values.length}`
        );
    }

    const limit = Math.min(
        Math.max(options.limit ?? 100, 1),
        100
    );

    const offset = Math.max(
        options.offset ?? 0,
        0
    );

    values.push(limit);
    const limitPosition = values.length;

    values.push(offset);
    const offsetPosition = values.length;

    const result = await pool.query<FinancialDocumentRecord>(
        `
        ${DOCUMENT_SELECT}

<<<<<<< HEAD
        ${
            conditions.length
                ? `WHERE ${conditions.join(" AND ")}`
                : ""
        }
=======
        WHERE ${conditions.join(" AND ")}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        ${DOCUMENT_GROUP}

        ORDER BY d.document_id DESC

        LIMIT $${limitPosition}
        OFFSET $${offsetPosition};
        `,
        values
    );

    return result.rows;
}

export async function getDocumentById(
<<<<<<< HEAD
    documentId: number
=======
    documentId: number,
    viewerId: number | null
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
): Promise<FinancialDocumentRecord | null> {
    const result = await pool.query<FinancialDocumentRecord>(
        `
        ${DOCUMENT_SELECT}

        WHERE d.document_id = $1
<<<<<<< HEAD
=======
          AND ${visibleDocument("$2")}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        ${DOCUMENT_GROUP}

        LIMIT 1;
        `,
<<<<<<< HEAD
        [documentId]
=======
        [documentId, viewerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    return result.rows[0] ?? null;
}

<<<<<<< HEAD
export async function getDocumentStats(): Promise<{
=======
export async function getDocumentStats(viewerId: number | null): Promise<{
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    documents: number;
    companies: number;
    latestUpload: string | null;
}> {
    const result = await pool.query<{
        documents: string;
        companies: string;
        latestUpload: string | null;
    }>(
        `
        SELECT
            COUNT(*)::TEXT AS documents,
            COUNT(DISTINCT d.company_id)::TEXT AS companies,
            MAX(d.uploaded_at) AS "latestUpload"
<<<<<<< HEAD
        FROM documents d;
        `
=======
        FROM documents d
        WHERE ${visibleDocument("$1")};
        `,
        [viewerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    return {
        documents: Number(result.rows[0].documents),
        companies: Number(result.rows[0].companies),
        latestUpload: result.rows[0].latestUpload
    };
}

<<<<<<< HEAD
export async function deleteFinancialDocument(
    documentId: number
=======
/** Deletes one of the owner's documents. Public (example) documents can never be deleted here. */
export async function deleteFinancialDocument(
    documentId: number,
    ownerId: number
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
): Promise<DeletedDocument | null> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const document = await client.query<{
            document_id: number;
            company_id: number;
            report_name: string;
            openai_file_id: string | null;
        }>(
            `
            SELECT
                document_id,
                company_id,
                report_name,
                openai_file_id
            FROM documents
            WHERE document_id = $1
<<<<<<< HEAD
            FOR UPDATE;
            `,
            [documentId]
=======
              AND user_id = $2
            FOR UPDATE;
            `,
            [documentId, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        );

        if (!document.rowCount) {
            await client.query("ROLLBACK");
            return null;
        }

        const row = document.rows[0];

        const periodResult = await client.query<{
            period_id: number;
        }>(
            `
            SELECT period_id
            FROM document_periods
            WHERE document_id = $1;
            `,
            [documentId]
        );

        const periodIds = periodResult.rows.map(
            item => item.period_id
        );

        await client.query(
            `
            DELETE FROM document_periods
            WHERE document_id = $1;
            `,
            [documentId]
        );

        await client.query(
            `
            DELETE FROM documents
            WHERE document_id = $1;
            `,
            [documentId]
        );

        if (periodIds.length) {
            await client.query(
                `
                DELETE FROM financial_periods fp
                WHERE fp.period_id = ANY($1::INTEGER[])
                  AND NOT EXISTS (
                      SELECT 1
                      FROM document_periods dp
                      WHERE dp.period_id = fp.period_id
                  );
                `,
                [periodIds]
            );
        }

<<<<<<< HEAD
=======
        // Drop cached AI insights whose financial period no longer exists.
        await client.query(
            `
            DELETE FROM ai_insights ai
            WHERE ai.company_id = $1
              AND NOT EXISTS (
                  SELECT 1
                  FROM financial_periods fp
                  WHERE fp.company_id = ai.company_id
                    AND fp.period = ai.period
              );
            `,
            [row.company_id]
        );

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        await client.query(
            `
            DELETE FROM companies c
            WHERE c.company_id = $1
              AND NOT EXISTS (
                  SELECT 1
                  FROM documents d
                  WHERE d.company_id = c.company_id
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM financial_periods fp
                  WHERE fp.company_id = c.company_id
              );
            `,
            [row.company_id]
        );

        await client.query("COMMIT");

        return {
            documentId: row.document_id,
            reportName: row.report_name,
            openaiFileId: row.openai_file_id
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getOrCreateCompany(
    client: PoolClient,
<<<<<<< HEAD
    companyName: string
=======
    companyName: string,
    ownerId: number
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
): Promise<number> {
    const normalisedName = companyName.trim();

    await client.query(
<<<<<<< HEAD
        "SELECT pg_advisory_xact_lock(hashtext(LOWER($1)))",
        [normalisedName]
=======
        "SELECT pg_advisory_xact_lock(hashtext($2::TEXT || ':' || LOWER($1)))",
        [normalisedName, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    const existing = await client.query<{
        company_id: number;
    }>(
        `
        SELECT company_id
        FROM companies
        WHERE LOWER(company_name) = LOWER($1)
<<<<<<< HEAD
        ORDER BY company_id
        LIMIT 1;
        `,
        [normalisedName]
=======
          AND user_id = $2
        ORDER BY company_id
        LIMIT 1;
        `,
        [normalisedName, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    if (existing.rows[0]) {
        return existing.rows[0].company_id;
    }

    const inserted = await client.query<{
        company_id: number;
    }>(
        `
        INSERT INTO companies (
<<<<<<< HEAD
            company_name
        )
        VALUES ($1)
        RETURNING company_id;
        `,
        [normalisedName]
=======
            company_name,
            user_id
        )
        VALUES ($1, $2)
        RETURNING company_id;
        `,
        [normalisedName, ownerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    return inserted.rows[0].company_id;
}

async function insertDocument(
    client: PoolClient,
<<<<<<< HEAD
=======
    ownerId: number,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    companyId: number,
    documentHash: string,
    openaiFileId: string,
    report: FinancialReport
): Promise<number> {
    const result = await client.query<{
        document_id: number;
    }>(
        `
        INSERT INTO documents (
<<<<<<< HEAD
=======
            user_id,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            company_id,
            document_hash,
            openai_file_id,
            report_name,
            report_type,
            report_date,
            currency,
            source
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
<<<<<<< HEAD
            $8
=======
            $8,
            $9
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        )
        RETURNING document_id;
        `,
        [
<<<<<<< HEAD
=======
            ownerId,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            companyId,
            documentHash,
            openaiFileId,
            report.reportName,
            report.reportType,
            report.reportDate,
            report.currency,
            report.source
        ]
    );

    return result.rows[0].document_id;
}

async function upsertFinancialPeriod(
    client: PoolClient,
    companyId: number,
    period: FinancialPeriod,
    conflicts: PeriodConflict[]
): Promise<number> {
    const existing = await client.query<{
        period_id: number;
        period_end: string | null;
        period_label: string | null;
    } & Record<PeriodMetricColumn, number | string | null>>(
        `
        SELECT
            period_id,
            period_end,
            period_label,
            ${PERIOD_METRIC_COLUMNS.map(([, column]) => column).join(",\n            ")}
        FROM financial_periods
        WHERE company_id = $1
          AND period = $2
        ORDER BY period_id
        LIMIT 1
        FOR UPDATE;
        `,
        [
            companyId,
            period.period
        ]
    );

    if (existing.rows[0]) {
        const row = existing.rows[0];
        const periodId = row.period_id;

        conflicts.push(...findPeriodConflicts(row, period));

        await client.query(
            `
            UPDATE financial_periods
            SET
                period_end = COALESCE(
                    $2,
                    period_end
                ),
                period_label = COALESCE(
                    $3,
                    period_label
                ),
                revenue = COALESCE(
                    $4,
                    revenue
                ),
                gross_profit = COALESCE(
                    $5,
                    gross_profit
                ),
                operating_profit = COALESCE(
                    $6,
                    operating_profit
                ),
                ebitda = COALESCE(
                    $7,
                    ebitda
                ),
                net_profit = COALESCE(
                    $8,
                    net_profit
                ),
                cash = COALESCE(
                    $9,
                    cash
                ),
                debt = COALESCE(
                    $10,
                    debt
                ),
                customers = COALESCE(
                    $11,
                    customers
                ),
                net_assets = COALESCE(
                    $12,
                    net_assets
                ),
<<<<<<< HEAD
=======
                operating_cash_flow = COALESCE(
                    $13,
                    operating_cash_flow
                ),
                total_assets = COALESCE(
                    $14,
                    total_assets
                ),
                total_liabilities = COALESCE(
                    $15,
                    total_liabilities
                ),
                eps = COALESCE(
                    $16,
                    eps
                ),
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
                updated_at = CURRENT_TIMESTAMP
            WHERE period_id = $1;
            `,
            [
                periodId,
                period.periodEnd,
                period.periodLabel,
                period.revenue,
                period.grossProfit,
                period.operatingProfit,
                period.ebitda,
                period.netProfit,
                period.cash,
                period.debt,
                period.customers,
<<<<<<< HEAD
                period.netAssets
=======
                period.netAssets,
                period.operatingCashFlow,
                period.totalAssets,
                period.totalLiabilities,
                period.eps
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            ]
        );

        return periodId;
    }

    const inserted = await client.query<{
        period_id: number;
    }>(
        `
        INSERT INTO financial_periods (
            company_id,
            period,
            period_end,
            period_label,
            revenue,
            gross_profit,
            operating_profit,
            ebitda,
            net_profit,
            cash,
            debt,
            customers,
<<<<<<< HEAD
            net_assets
=======
            net_assets,
            operating_cash_flow,
            total_assets,
            total_liabilities,
            eps
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
<<<<<<< HEAD
            $13
=======
            $13,
            $14,
            $15,
            $16,
            $17
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        )
        RETURNING period_id;
        `,
        [
            companyId,
            period.period,
            period.periodEnd,
            period.periodLabel,
            period.revenue,
            period.grossProfit,
            period.operatingProfit,
            period.ebitda,
            period.netProfit,
            period.cash,
            period.debt,
            period.customers,
<<<<<<< HEAD
            period.netAssets
=======
            period.netAssets,
            period.operatingCashFlow,
            period.totalAssets,
            period.totalLiabilities,
            period.eps
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        ]
    );

    return inserted.rows[0].period_id;
}

const PERIOD_METRIC_COLUMNS = [
    ["revenue", "revenue"],
    ["grossProfit", "gross_profit"],
    ["operatingProfit", "operating_profit"],
    ["ebitda", "ebitda"],
    ["netProfit", "net_profit"],
    ["cash", "cash"],
    ["debt", "debt"],
    ["customers", "customers"],
<<<<<<< HEAD
    ["netAssets", "net_assets"]
=======
    ["netAssets", "net_assets"],
    ["operatingCashFlow", "operating_cash_flow"],
    ["totalAssets", "total_assets"],
    ["totalLiabilities", "total_liabilities"],
    ["eps", "eps"]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
] as const;

type PeriodMetricColumn = typeof PERIOD_METRIC_COLUMNS[number][1];

function sameValue(
    previous: number | string | null,
    next: number | string | null
): boolean {
    if (typeof previous === "number" || typeof next === "number") {
        return Number(previous) === Number(next);
    }

    return String(previous) === String(next);
}

/**
 * Lists fields where a non-null incoming value differs from a non-null stored
 * value. Null incoming values never overwrite (COALESCE), so they are ignored.
 */
export function findPeriodConflicts(
    existing: {
        period_end: string | null;
        period_label: string | null;
    } & Record<PeriodMetricColumn, number | string | null>,
    period: FinancialPeriod
): PeriodConflict[] {
    const conflicts: PeriodConflict[] = [];
    const candidates: Array<[string, number | string | null, number | string | null]> = [
        ["periodEnd", existing.period_end, period.periodEnd],
        ["periodLabel", existing.period_label, period.periodLabel],
        ...PERIOD_METRIC_COLUMNS.map(([field, column]) =>
            [field, existing[column], period[field]] as [string, number | string | null, number | null]
        )
    ];

    for (const [field, previousValue, newValue] of candidates) {
        if (
            previousValue !== null &&
            newValue !== null &&
            !sameValue(previousValue, newValue)
        ) {
            conflicts.push({
                period: period.period,
                field,
                previousValue,
                newValue
            });
        }
    }

    return conflicts;
}

async function linkDocumentToPeriod(
    client: PoolClient,
    documentId: number,
    periodId: number
): Promise<void> {
    await client.query(
        `
        INSERT INTO document_periods (
            document_id,
            period_id
        )
        SELECT
            $1,
            $2
        WHERE NOT EXISTS (
            SELECT 1
            FROM document_periods
            WHERE document_id = $1
              AND period_id = $2
        );
        `,
        [
            documentId,
            periodId
        ]
    );
}