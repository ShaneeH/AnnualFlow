import { NotFoundError } from "../utils/errors";
import { db } from "../database/db";
<<<<<<< HEAD
import { calculateFinancialMetrics } from "./financial-metrics.service";
import { compareFinancialPeriods } from "./comparison.service";

export async function getCompanies() {
=======
import { calculateFinancialMetrics, calculateMargins } from "./financial-metrics.service";
import { compareFinancialPeriods } from "./comparison.service";

/**
 * Visibility rule used by every read: public rows (user_id IS NULL, e.g. the
 * example dataset) plus the viewer's own rows. A NULL viewer matches public only.
 */
export const visibleTo = (alias: string, param: string) =>
    `(${alias}.user_id IS NULL OR ${alias}.user_id = ${param})`;

export type CompanyAccess = "owner" | "public" | null;

/** "owner" if the viewer owns the company, "public" if anyone may read it, null if hidden or missing. */
export async function getCompanyAccess(
    companyId: number,
    viewerId: number | null
): Promise<CompanyAccess> {
    const result = await db.query<{ user_id: number | null }>(
        `SELECT c.user_id FROM companies c WHERE c.company_id = $1 AND ${visibleTo("c", "$2")}`,
        [companyId, viewerId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return row.user_id === null ? "public" : "owner";
}

export async function getCompanies(viewerId: number | null) {
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    const result = await db.query(
        `
        SELECT
<<<<<<< HEAD
            company_id AS "companyId",
            company_name AS "companyName"
        FROM companies
        ORDER BY company_name;
        `
=======
            c.company_id AS "companyId",
            c.company_name AS "companyName",
            -- Example dataset flag. The DB column keeps its original name
            -- (is_demo, migration 004); the API exposes it as isExample.
            -- Read via JSONB so this works before migration 004 is applied.
            COALESCE((to_jsonb(c) ->> 'is_demo')::boolean, FALSE) AS "isExample",
            (c.user_id IS NOT NULL) AS "isOwned"
        FROM companies c
        WHERE ${visibleTo("c", "$1")}
        ORDER BY c.company_name;
        `,
        [viewerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    return result.rows;

}

export async function getCompanyPeriods(
<<<<<<< HEAD
    companyId: number
=======
    companyId: number,
    viewerId: number | null
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
) {

    const result = await db.query(
        `
        SELECT
<<<<<<< HEAD
            period_id AS "periodId",
            period,
            period_label AS "periodLabel",
            period_end AS "periodEnd"
        FROM financial_periods
        WHERE company_id = $1
        ORDER BY period_end DESC NULLS LAST, period;
        `,
        [companyId]
=======
            fp.period_id AS "periodId",
            fp.period,
            fp.period_label AS "periodLabel",
            fp.period_end AS "periodEnd"
        FROM financial_periods fp
        JOIN companies c ON c.company_id = fp.company_id
        WHERE fp.company_id = $1
          AND ${visibleTo("c", "$2")}
        ORDER BY fp.period_end DESC NULLS LAST, fp.period;
        `,
        [companyId, viewerId]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    );

    // An empty list means the company is unknown or has no periods;
    // the route decides how to respond.
    return result.rows;

}

export async function getFinancialPeriod(
    companyId: number,
    period: string,
<<<<<<< HEAD
=======
    viewerId: number | null,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    compareTo?: string
) {

    const result = await db.query(
        `
        SELECT
            c.company_id AS "companyId",
            c.company_name AS "companyName",

            fp.period,
            fp.period_label AS "periodLabel",
            fp.period_end AS "periodEnd",

            fp.revenue,
            fp.gross_profit AS "grossProfit",
            fp.operating_profit AS "operatingProfit",
            fp.ebitda,
            fp.net_profit AS "netProfit",

            fp.cash,
            fp.debt,
            fp.customers,
<<<<<<< HEAD
            fp.net_assets AS "netAssets"
=======
            fp.net_assets AS "netAssets",
            fp.operating_cash_flow AS "operatingCashFlow",
            fp.total_assets AS "totalAssets",
            fp.total_liabilities AS "totalLiabilities",
            fp.eps AS "eps",

            -- Data Enrichment: how many uploaded documents contributed to this period.
            (
                SELECT COUNT(*)::int
                FROM document_periods dp
                WHERE dp.period_id = fp.period_id
            ) AS "sourceDocumentCount"
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        FROM companies c

        JOIN financial_periods fp
            ON fp.company_id = c.company_id

        WHERE
            c.company_id = $1
        AND
            fp.period = $2
<<<<<<< HEAD
=======
        AND
            ${visibleTo("c", "$3")}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        LIMIT 1;
        `,
        [
            companyId,
<<<<<<< HEAD
            period
=======
            period,
            viewerId
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        ]
    );

    if (result.rowCount === 0) {
        return null;
    }

    const currentPeriod = result.rows[0];

    const metrics = calculateFinancialMetrics(currentPeriod);

    if (!compareTo) {

        return {

            financials: currentPeriod,

            metrics

        };

    }

    const comparisonResult = await db.query(
        `
        SELECT
            period,
            period_label AS "periodLabel",
            period_end AS "periodEnd",

            revenue,
            gross_profit AS "grossProfit",
            operating_profit AS "operatingProfit",
            ebitda,
            net_profit AS "netProfit",

            cash,
            debt,
            customers,
<<<<<<< HEAD
            net_assets AS "netAssets"

        FROM financial_periods

        WHERE
            company_id = $1
        AND
            period = $2
=======
            net_assets AS "netAssets",
            operating_cash_flow AS "operatingCashFlow",
            total_assets AS "totalAssets",
            total_liabilities AS "totalLiabilities",
            eps AS "eps"

        FROM financial_periods fp

        JOIN companies c ON c.company_id = fp.company_id

        WHERE
            fp.company_id = $1
        AND
            fp.period = $2
        AND
            ${visibleTo("c", "$3")}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        LIMIT 1;
        `,
        [
            companyId,
<<<<<<< HEAD
            compareTo
=======
            compareTo,
            viewerId
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        ]
    );

    if (comparisonResult.rowCount === 0) {
        throw new NotFoundError(
            `Comparison period '${compareTo}' not found for company ${companyId}.`
        );
    }

    const comparisonPeriod =
        comparisonResult.rows[0];

    const comparison =
        compareFinancialPeriods(
            currentPeriod,
            comparisonPeriod
        );

    return {

        financials: currentPeriod,

        metrics,

        comparison

    };

}

export async function getCompanyHistory(
<<<<<<< HEAD
    companyId: number
=======
    companyId: number,
    viewerId: number | null
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
) {

    const result = await db.query(
        `
        SELECT
            period,
            period_label AS "periodLabel",
            period_end AS "periodEnd",

            revenue,
            gross_profit AS "grossProfit",
            operating_profit AS "operatingProfit",
            ebitda,
            net_profit AS "netProfit",

            cash,
            debt,
            customers,
<<<<<<< HEAD
            net_assets AS "netAssets"

        FROM financial_periods

        WHERE company_id = $1

        ORDER BY period_end ASC NULLS LAST, period;
        `,
        [companyId]
    );

    return result.rows;
=======
            net_assets AS "netAssets",
            operating_cash_flow AS "operatingCashFlow",
            total_assets AS "totalAssets",
            total_liabilities AS "totalLiabilities",
            eps AS "eps"

        FROM financial_periods fp

        JOIN companies c ON c.company_id = fp.company_id

        WHERE fp.company_id = $1
          AND ${visibleTo("c", "$2")}

        ORDER BY fp.period_end ASC NULLS LAST, fp.period;
        `,
        [companyId, viewerId]
    );

    // Attach deterministic margins so the frontend can chart them directly.
    return result.rows.map(row => ({
        ...row,
        ...calculateMargins(row)
    }));
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

}