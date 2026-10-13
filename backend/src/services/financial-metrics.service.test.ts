import assert from "node:assert/strict";
import test from "node:test";

import { calculateFinancialMetrics, calculateMargins } from "./financial-metrics.service";

const base = {
    revenue: 1000,
    grossProfit: 400,
    operatingProfit: 200,
    ebitda: 250,
    netProfit: 100,
    cash: 300,
    debt: 200,
    customers: null,
    netAssets: 500,
    operatingCashFlow: 150,
    totalAssets: 2000,
    totalLiabilities: 1500
};

test("derives margins and balance-sheet ratios deterministically", () => {
    const metrics = calculateFinancialMetrics(base);

    assert.equal(metrics.grossMargin, 40);
    assert.equal(metrics.netMargin, 10);
    assert.equal(metrics.operatingCashFlowMargin, 15);
    assert.equal(metrics.cashConversion, 1.5);
    assert.equal(metrics.returnOnEquity, 20);
    assert.equal(metrics.returnOnAssets, 5);
    assert.equal(metrics.debtToEquity, 0.4);
    assert.equal(metrics.liabilitiesToAssets, 75);
});

test("returns null instead of meaningless ratios", () => {
    const metrics = calculateFinancialMetrics({
        ...base,
        revenue: 0,
        netAssets: -50,
        totalAssets: null
    });

    assert.equal(metrics.grossMargin, null);
    assert.equal(metrics.returnOnEquity, null);
    assert.equal(metrics.debtToEquity, null);
    assert.equal(metrics.liabilitiesToAssets, null);
});

test("calculateMargins returns only the four margins", () => {
    assert.deepEqual(calculateMargins(base), {
        grossMargin: 40,
        operatingMargin: 20,
        ebitdaMargin: 25,
        netMargin: 10
    });
});
