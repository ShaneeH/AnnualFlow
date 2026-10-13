import assert from "node:assert/strict";
import test from "node:test";

import { findPeriodConflicts } from "./documents.service";

const stored = {
    period_end: "2025-12-31",
    period_label: "FY 2025",
    revenue: 1_800_000_000,
    gross_profit: null,
    operating_profit: 410_000_000,
    ebitda: null,
    net_profit: null,
    cash: null,
    debt: null,
    customers: 8_500_000,
<<<<<<< HEAD
    net_assets: null
=======
    net_assets: null,
    operating_cash_flow: null,
    total_assets: null,
    total_liabilities: null,
    eps: null
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
};

const incoming = {
    period: "FY2025",
    periodEnd: "2025-12-31",
    periodLabel: "FY 2025",
    revenue: 1_900_000_000,
    grossProfit: 900_000_000,
    operatingProfit: 410_000_000,
    ebitda: null,
    netProfit: null,
    cash: null,
    debt: null,
    customers: null,
<<<<<<< HEAD
    netAssets: null
=======
    netAssets: null,
    operatingCashFlow: null,
    totalAssets: null,
    totalLiabilities: null,
    eps: null
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
};

test("reports only fields where a new non-null value replaces a different stored value", () => {
    assert.deepEqual(findPeriodConflicts(stored, incoming), [
        {
            period: "FY2025",
            field: "revenue",
            previousValue: 1_800_000_000,
            newValue: 1_900_000_000
        }
    ]);
});

test("treats numeric strings from the database as equal to numbers", () => {
    assert.deepEqual(
        findPeriodConflicts(
            { ...stored, revenue: "1900000000" },
            incoming
        ),
        []
    );
});
