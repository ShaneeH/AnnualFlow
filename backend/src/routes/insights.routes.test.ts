import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";
import OpenAI from "openai";

import { AiInsight, InsightDeps } from "../services/insights.service";
import { ServiceConfigError } from "../utils/errors";
import { validInsightJson } from "../utils/test-fixtures";
import { createInsightsRouter } from "./insights.routes";

const stored: AiInsight = {
    companyId: 1,
    period: "FY2025",
    content: JSON.parse(validInsightJson),
    model: "gpt-test",
    generatedAt: "2026-10-12T00:00:00Z"
};

function deps(overrides: Partial<InsightDeps> = {}): InsightDeps {
    return {
        findInsight: async () => null,
        loadContext: async () => ({
            companyName: "WWE",
            currency: null,
            period: "FY2025",
            periodLabel: "FY 2025",
            periodEnd: null,
            financials: {},
            metrics: {},
            comparison: null
        }),
        generate: async () => ({ text: validInsightJson, model: "gpt-test" }),
        saveInsight: async () => stored,
        ...overrides
    };
}

async function call(
    d: InsightDeps,
    method: "GET" | "POST",
    path: string
): Promise<{ status: number; body: any }> {
    const app = express();
    app.use("/api/insights", createInsightsRouter(d));
    const server = app.listen(0);

    try {
        await new Promise<void>(resolve => server.once("listening", resolve));
        const port = (server.address() as AddressInfo).port;
        const response = await fetch(`http://127.0.0.1:${port}/api/insights${path}`, { method });
        return { status: response.status, body: await response.json() };
    } finally {
        server.close();
    }
}

const path = "/companies/1/periods/FY2025";

test("GET returns 404 when no insight is cached", async () => {
    const { status } = await call(deps(), "GET", path);
    assert.equal(status, 404);
});

test("GET returns the cached insight", async () => {
    const { status, body } = await call(deps({ findInsight: async () => stored }), "GET", path);
    assert.equal(status, 200);
    assert.equal(body.model, "gpt-test");
});

test("GET never calls the model", async () => {
    let generated = 0;
    await call(deps({ generate: async () => { generated += 1; return { text: validInsightJson, model: "m" }; } }), "GET", path);
    assert.equal(generated, 0);
});

test("rejects invalid params with 400", async () => {
    assert.equal((await call(deps(), "GET", "/companies/abc/periods/FY2025")).status, 400);
    assert.equal((await call(deps(), "POST", "/companies/1/periods/2025")).status, 400);
});

test("POST generates (201) and returns cached (200)", async () => {
    assert.equal((await call(deps(), "POST", path)).status, 201);
    assert.equal((await call(deps({ findInsight: async () => stored }), "POST", path)).status, 200);
});

test("POST ?regenerate=true bypasses the cache", async () => {
    let generated = 0;
    const d = deps({
        findInsight: async () => stored,
        generate: async () => { generated += 1; return { text: validInsightJson, model: "m" }; }
    });

    assert.equal((await call(d, "POST", `${path}?regenerate=true`)).status, 201);
    assert.equal(generated, 1);
});

test("maps OpenAI timeout to 504, rate limit to 429 and missing key to 503", async () => {
    const timeout = deps({ generate: async () => { throw new OpenAI.APIConnectionTimeoutError(); } });
    const limited = deps({
        generate: async () => {
            throw new OpenAI.RateLimitError(429, undefined, "rate limited", new Headers());
        }
    });
    const noKey = deps({
        generate: async () => { throw new ServiceConfigError("OPENAI_API_KEY is not configured."); }
    });

    assert.equal((await call(timeout, "POST", path)).status, 504);
    assert.equal((await call(limited, "POST", path)).status, 429);
    assert.equal((await call(noKey, "POST", path)).status, 503);
});

test("invalid model output is 422", async () => {
    const bad = deps({ generate: async () => ({ text: "{}", model: "m" }) });
    assert.equal((await call(bad, "POST", path)).status, 422);
});
