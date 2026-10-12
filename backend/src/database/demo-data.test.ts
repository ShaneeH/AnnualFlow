import assert from "node:assert/strict";
import test from "node:test";

import { calculateFinancialMetrics } from "../services/financial-metrics.service";
import { DEMO_COMPANY_NAME, DEMO_PERIODS, DEMO_REPORT_NAME, DEMO_SOURCE } from "./demo-data";
import { seedDemo } from "./seed-demo";

const byPeriod = (period: string) => DEMO_PERIODS.find(p => p.period === period)!;

test("demo data is clearly labelled as fictional", () => {
    assert.equal(DEMO_COMPANY_NAME, "Northwind Analytics plc");
    assert.match(DEMO_REPORT_NAME, /FICTIONAL/);
    assert.match(DEMO_SOURCE, /not a real company/);
});

test("demo figures are stored in full EUR (x1000), EPS and customers unscaled", () => {
    const fy25 = byPeriod("FY2025");
    assert.equal(fy25.revenue, 248_600_000);
    assert.equal(fy25.netAssets, 170_700_000);
    assert.equal(fy25.eps, 0.88);
    assert.equal(fy25.customers, 4_120);
    assert.equal(byPeriod("FY2024").operatingCashFlow, 38_200_000);
    assert.deepEqual(DEMO_PERIODS.map(p => p.period), ["FY2024", "FY2025", "Q1_2025", "Q2_2025", "Q3_2025", "Q4_2025"]);
});

test("quarters add up to the full year and derived margins are sensible", () => {
    const quarters = DEMO_PERIODS.filter(p => p.period.startsWith("Q"));
    const sum = (key: "revenue" | "grossProfit" | "operatingProfit" | "netProfit" | "operatingCashFlow") =>
        quarters.reduce((total, q) => total + (q[key] ?? 0), 0);

    assert.equal(sum("revenue"), byPeriod("FY2025").revenue);
    assert.equal(sum("grossProfit"), byPeriod("FY2025").grossProfit);
    assert.equal(sum("operatingProfit"), byPeriod("FY2025").operatingProfit);
    assert.equal(sum("netProfit"), byPeriod("FY2025").netProfit);
    assert.equal(sum("operatingCashFlow"), byPeriod("FY2025").operatingCashFlow);

    const metrics = calculateFinancialMetrics({ ...byPeriod("FY2025"), debt: null });
    assert.equal(metrics.grossMargin, 60);
    assert.equal(metrics.netMargin, 14.14);
});

test("seedDemo is idempotent: second run updates instead of inserting duplicates", async () => {
    const statements: string[] = [];
    let seeded = false;
    const client = {
        async query(sql: string) {
            statements.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
            if (/^SELECT company_id/.test(sql.trim())) return { rows: seeded ? [{ company_id: 1 }] : [] };
            if (/^SELECT document_id/.test(sql.trim())) return { rows: seeded ? [{ document_id: 9 }] : [] };
            if (/^SELECT period_id/.test(sql.trim())) return { rows: seeded ? [{ period_id: 5 }] : [] };
            if (/RETURNING company_id/.test(sql)) return { rows: [{ company_id: 1 }] };
            if (/RETURNING document_id/.test(sql)) return { rows: [{ document_id: 9 }] };
            if (/RETURNING period_id/.test(sql)) return { rows: [{ period_id: 5 }] };
            return { rows: [] };
        }
    };

    await seedDemo(client as never);
    const firstInserts = statements.filter(s => s.startsWith("INSERT INTO")).length;

    statements.length = 0;
    seeded = true;
    await seedDemo(client as never);

    assert.equal(firstInserts, 1 + 1 + 6 + 6); // company, document, periods, links
    assert.equal(statements.filter(s => /^INSERT INTO (companies|documents|financial_periods)/.test(s)).length, 0);
    assert.equal(statements.filter(s => s.startsWith("UPDATE financial_periods")).length, 6);
});
