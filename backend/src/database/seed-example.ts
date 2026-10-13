import "dotenv/config";

// The stored hash keeps its original "demo:" prefix so existing databases are
// updated in place rather than getting a second example document.
import { PoolClient } from "pg";

import { db } from "./db";
import {
    EXAMPLE_COMPANY_NAME,
    EXAMPLE_DOCUMENT_HASH,
    EXAMPLE_PERIODS,
    EXAMPLE_REPORT_NAME,
    EXAMPLE_SOURCE,
    ExamplePeriod
} from "./example-data";

const COLUMNS: Array<[keyof ExamplePeriod, string]> = [
    ["periodLabel", "period_label"],
    ["periodEnd", "period_end"],
    ["revenue", "revenue"],
    ["grossProfit", "gross_profit"],
    ["operatingProfit", "operating_profit"],
    ["ebitda", "ebitda"],
    ["netProfit", "net_profit"],
    ["eps", "eps"],
    ["cash", "cash"],
    ["totalAssets", "total_assets"],
    ["totalLiabilities", "total_liabilities"],
    ["netAssets", "net_assets"],
    ["operatingCashFlow", "operating_cash_flow"],
    ["customers", "customers"]
];

async function upsertCompany(client: PoolClient): Promise<number> {
    const existing = await client.query<{ company_id: number }>(
        // Public rows only (user_id NULL): never adopt a signed-in user's company of the same name.
        "SELECT company_id FROM companies c WHERE LOWER(company_name) = LOWER($1) AND (to_jsonb(c) ->> 'user_id') IS NULL LIMIT 1",
        [EXAMPLE_COMPANY_NAME]
    );

    if (existing.rows[0]) {
        await client.query("UPDATE companies SET is_demo = TRUE WHERE company_id = $1", [existing.rows[0].company_id]);
        return existing.rows[0].company_id;
    }

    const inserted = await client.query<{ company_id: number }>(
        "INSERT INTO companies (company_name, is_demo) VALUES ($1, TRUE) RETURNING company_id",
        [EXAMPLE_COMPANY_NAME]
    );
    return inserted.rows[0].company_id;
}

/** Inserts or overwrites one example period so re-running always restores the example values. */
async function upsertPeriod(client: PoolClient, companyId: number, period: ExamplePeriod): Promise<number> {
    const values = COLUMNS.map(([key]) => period[key]);
    const existing = await client.query<{ period_id: number }>(
        "SELECT period_id FROM financial_periods WHERE company_id = $1 AND period = $2 LIMIT 1",
        [companyId, period.period]
    );

    if (existing.rows[0]) {
        const sets = COLUMNS.map(([, column], i) => `${column} = $${i + 2}`).join(", ");
        await client.query(
            `UPDATE financial_periods SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE period_id = $1`,
            [existing.rows[0].period_id, ...values]
        );
        return existing.rows[0].period_id;
    }

    const columns = COLUMNS.map(([, column]) => column).join(", ");
    const placeholders = COLUMNS.map((_, i) => `$${i + 3}`).join(", ");
    const inserted = await client.query<{ period_id: number }>(
        `INSERT INTO financial_periods (company_id, period, ${columns})
         VALUES ($1, $2, ${placeholders}) RETURNING period_id`,
        [companyId, period.period, ...values]
    );
    return inserted.rows[0].period_id;
}

export async function seedExample(client: PoolClient): Promise<{ companyId: number; documentId: number }> {
    const companyId = await upsertCompany(client);

    const doc = await client.query<{ document_id: number }>(
        "SELECT document_id FROM documents d WHERE document_hash = $1 AND (to_jsonb(d) ->> 'user_id') IS NULL LIMIT 1",
        [EXAMPLE_DOCUMENT_HASH]
    );
    if (doc.rows[0]) {
        // Keep the label current (e.g. after the "demo" -> "example dataset" rename).
        await client.query(
            "UPDATE documents SET report_name = $2, source = $3 WHERE document_id = $1",
            [doc.rows[0].document_id, EXAMPLE_REPORT_NAME, EXAMPLE_SOURCE]
        );
    }

    const documentId = doc.rows[0]?.document_id ?? (await client.query<{ document_id: number }>(
        `INSERT INTO documents
            (company_id, document_hash, openai_file_id, report_name, report_type, report_date, currency, source)
         VALUES ($1, $2, NULL, $3, 'Annual Report', '2025-12-31', 'EUR', $4)
         RETURNING document_id`,
        [companyId, EXAMPLE_DOCUMENT_HASH, EXAMPLE_REPORT_NAME, EXAMPLE_SOURCE]
    )).rows[0].document_id;

    for (const period of EXAMPLE_PERIODS) {
        const periodId = await upsertPeriod(client, companyId, period);
        await client.query(
            `INSERT INTO document_periods (document_id, period_id)
             SELECT $1, $2
             WHERE NOT EXISTS (SELECT 1 FROM document_periods WHERE document_id = $1 AND period_id = $2)`,
            [documentId, periodId]
        );
        // Figures may have been reset: drop any cached AI insight for the period.
        await client.query("DELETE FROM ai_insights WHERE company_id = $1 AND period = $2", [companyId, period.period]);
    }

    return { companyId, documentId };
}

async function main(): Promise<void> {
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        const { companyId, documentId } = await seedExample(client);
        await client.query("COMMIT");
        console.log(
            `[seed] ${EXAMPLE_COMPANY_NAME} (FICTIONAL example dataset): company_id=${companyId}, ` +
            `document_id=${documentId}, ${EXAMPLE_PERIODS.length} periods`
        );
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
        await db.end();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error("[seed] failed (run `npm run db:migrate` first)", error);
        process.exitCode = 1;
    });
}
