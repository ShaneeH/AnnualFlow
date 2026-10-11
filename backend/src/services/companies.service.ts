import { NotFoundError } from "../utils/errors";
import { db } from "../database/db";
import { calculateFinancialMetrics } from "./financial-metrics.service";
import { compareFinancialPeriods } from "./comparison.service";

export async function getCompanies() {

    const result = await db.query(
        `
        SELECT
            company_id AS "companyId",
            company_name AS "companyName"
        FROM companies
        ORDER BY company_name;
        `
    );

    return result.rows;

}

export async function getCompanyPeriods(
    companyId: number
) {

    const result = await db.query(
        `
        SELECT
            period_id AS "periodId",
            period,
            period_label AS "periodLabel",
            period_end AS "periodEnd"
        FROM financial_periods
        WHERE company_id = $1
        ORDER BY period_end DESC NULLS LAST, period;
        `,
        [companyId]
    );

    // An empty list means the company is unknown or has no periods;
    // the route decides how to respond.
    return result.rows;

}

export async function getFinancialPeriod(
    companyId: number,
    period: string,
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
            fp.net_assets AS "netAssets"

        FROM companies c

        JOIN financial_periods fp
            ON fp.company_id = c.company_id

        WHERE
            c.company_id = $1
        AND
            fp.period = $2

        LIMIT 1;
        `,
        [
            companyId,
            period
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
            net_assets AS "netAssets"

        FROM financial_periods

        WHERE
            company_id = $1
        AND
            period = $2

        LIMIT 1;
        `,
        [
            companyId,
            compareTo
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
    companyId: number
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
            net_assets AS "netAssets"

        FROM financial_periods

        WHERE company_id = $1

        ORDER BY period_end ASC NULLS LAST, period;
        `,
        [companyId]
    );

    return result.rows;

}