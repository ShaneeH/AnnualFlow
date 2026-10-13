import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundError, ReportValidationError } from "../utils/errors";
import { validInsightJson } from "../utils/test-fixtures";
import {
    AiInsight,
    buildInsightInput,
    findPreviousPeriod,
    generateInsight,
    InsightContext,
    InsightDeps
} from "./insights.service";

const context: InsightContext = {
    companyName: "WWE",
    currency: "USD",
    period: "FY2025",
    periodLabel: "FY 2025",
    periodEnd: "2025-12-31",
    financials: { revenue: 1_800_000_000, netProfit: 330_000_000 },
    metrics: { operatingMargin: 22.78 },
    comparison: { period: "FY2024", growthPercent: { revenueGrowth: 5.2 } }
};

function fakeDeps(overrides: Partial<InsightDeps> = {}) {
    const calls = { generate: 0, save: 0, prompts: [] as InsightContext[] };
    let stored: AiInsight | null = null;

    const deps: InsightDeps = {
        companyAccess: async () => "owner",
        findInsight: async () => stored,
        loadContext: async () => context,
        // Mocked OpenAI call: returns a fixed structured response.
        generate: async ctx => {
            calls.generate += 1;
            calls.prompts.push(ctx);
            return { text: validInsightJson, model: "gpt-test" };
        },
        saveInsight: async (companyId, period, content, model) => {
            calls.save += 1;
            stored = { companyId, period, content, model, generatedAt: "2026-10-12T00:00:00Z" };
            return stored;
        },
        ...overrides
    };

    return { deps, calls };
}

test("generates, validates and stores an insight on first request", async () => {
    const { deps, calls } = fakeDeps();
    const { insight, cached } = await generateInsight(1, "FY2025", { userId: 1 }, deps);

    assert.equal(cached, false);
    assert.equal(insight.model, "gpt-test");
    assert.match(insight.content.performanceSummary, /1\.8bn/);
    assert.equal(calls.generate, 1);
    assert.equal(calls.save, 1);
});

test("returns the cached insight without calling the model", async () => {
    const { deps, calls } = fakeDeps();
    await generateInsight(1, "FY2025", { userId: 1 }, deps);
    const second = await generateInsight(1, "FY2025", { userId: 1 }, deps);

    assert.equal(second.cached, true);
    assert.equal(calls.generate, 1);
});

test("regenerate=true forces a new model call", async () => {
    const { deps, calls } = fakeDeps();
    await generateInsight(1, "FY2025", { userId: 1 }, deps);
    const again = await generateInsight(1, "FY2025", { regenerate: true, userId: 1 }, deps);

    assert.equal(again.cached, false);
    assert.equal(calls.generate, 2);
});

test("does not save invalid model output", async () => {
    const { deps, calls } = fakeDeps({
        generate: async () => ({ text: JSON.stringify({ performanceSummary: "Hi" }), model: "m" })
    });

    await assert.rejects(generateInsight(1, "FY2025", { userId: 1 }, deps), ReportValidationError);
    assert.equal(calls.save, 0);
});

test("unknown periods are 404 and never reach the model", async () => {
    const { deps, calls } = fakeDeps({ loadContext: async () => null });

    await assert.rejects(generateInsight(1, "FY2030", { userId: 1 }, deps), NotFoundError);
    assert.equal(calls.generate, 0);
});

test("the model input contains the deterministic figures and comparison", () => {
    const input = buildInsightInput(context);

    assert.match(input, /1800000000/);
    assert.match(input, /"operatingMargin": 22\.78/);
    assert.match(input, /"period": "FY2024"/);
});

test("picks the like-for-like previous period, else the closest earlier one", () => {
    const periods = [
        { period: "FY2025", periodEnd: "2025-12-31" },
        { period: "H1_2025", periodEnd: "2025-06-30" },
        { period: "FY2024", periodEnd: "2024-12-31" },
        { period: "Q2_2025", periodEnd: "2025-06-30" }
    ];

    assert.equal(findPreviousPeriod(periods, "FY2025"), "FY2024");
    assert.equal(findPreviousPeriod(periods, "H1_2025"), "FY2024");
    assert.equal(findPreviousPeriod(periods, "FY2024"), null);
});
