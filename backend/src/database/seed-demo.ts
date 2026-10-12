import "dotenv/config";

import { PoolClient } from "pg";

import { db } from "./db";
import {
    DEMO_COMPANY_NAME,
    DEMO_DOCUMENT_HASH,
    DEMO_PERIODS,
    DEMO_REPORT_NAME,
    DEMO_SOURCE,
    DemoPeriod
} from "./demo-data";

const COLUMNS: Array<[keyof DemoPeriod, string]> = [
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
        "SELECT company_id FROM companies WHERE LOWER(company_name) = LOWER($1) LIMIT 1",
        [DEMO_COMPANY_NAME]
    );

    if (existing.rows[0]) {
        await client.query("UPDATE companies SET is_demo = TRUE WHERE company_id = $1", [existing.rows[0].company_id]);
        return existing.rows[0].company_id;
    }

    const inserted = await client.query<{ company_id: number }>(
        "INSERT INTO companies (company_name, is_demo) VALUES ($1, TRUE) RETURNING company_id",
        [DEMO_COMPANY_NAME]
    );
    return inserted.rows[0].company_id;
}

/** Inserts or overwrites one demo period so re-running always restores the demo values. */
async function upsertPeriod(client: PoolClient, companyId: number, period: DemoPeriod): Promise<number> {
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

export async function seedDemo(client: PoolClient): Promise<{ companyId: number; documentId: number }> {
    const companyId = await upsertCompany(client);

    const doc = await client.query<{ document_id: number }>(
        "SELECT document_id FROM documents WHERE document_hash = $1 LIMIT 1",
        [DEMO_DOCUMENT_HASH]
    );
    const documentId = doc.rows[0]?.document_id ?? (await client.query<{ document_id: number }>(
        `INSERT INTO documents
            (company_id, document_hash, openai_file_id, report_name, report_type, report_date, currency, source)
         VALUES ($1, $2, NULL, $3, 'Annual Report', '2025-12-31', 'EUR', $4)
         RETURNING document_id`,
        [companyId, DEMO_DOCUMENT_HASH, DEMO_REPORT_NAME, DEMO_SOURCE]
    )).rows[0].document_id;

    for (const period of DEMO_PERIODS) {
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
        const { companyId, documentId } = await seedDemo(client);
        await client.query("COMMIT");
        console.log(
            `[seed] ${DEMO_COMPANY_NAME} (FICTIONAL demo data): company_id=${companyId}, ` +
            `document_id=${documentId}, ${DEMO_PERIODS.length} periods`
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
