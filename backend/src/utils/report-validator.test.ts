import assert from "node:assert/strict";
import test from "node:test";

import { ReportValidationError } from "./errors";
import { parseAndValidateReport } from "./report-validator";

function validReport(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        company: "Example plc",
        reportName: "Annual Report 2025",
        reportType: "Annual Report",
        reportDate: "2025-12-31",
        currency: "EUR",
        source: "Consolidated Income Statement",
        periods: [{
            period: "FY2025",
            periodEnd: "2025-12-31",
            periodLabel: "Full Year 2025",
            revenue: 1000,
            grossProfit: 400,
            operatingProfit: 200,
            ebitda: null,
            netProfit: 150,
            cash: 300,
            debt: 50,
            customers: 42,
            netAssets: 700
        }],
        ...overrides
    });
}

test("validates and normalises a financial report", () => {
    const report = parseAndValidateReport(validReport({
        company: "  Example plc  "
    }));

    assert.equal(report.company, "Example plc");
    assert.equal(report.periods[0].period, "FY2025");
});

test("rejects unsupported report types", () => {
    assert.throws(
        () => parseAndValidateReport(validReport({ reportType: "Secret Memo" })),
        /unsupported/
    );
});

test("rejects duplicate or malformed periods", () => {
    const period = JSON.parse(validReport()).periods[0];
    assert.throws(
        () => parseAndValidateReport(validReport({ periods: [period, period] })),
        /duplicate/
    );
    assert.throws(
        () => parseAndValidateReport(validReport({
            periods: [{ ...period, period: "DROP TABLE" }]
        })),
        /unsupported format/
    );
});

test("rejects invalid dates and currency codes", () => {
    assert.throws(
        () => parseAndValidateReport(validReport({ reportDate: "2025-02-30" })),
        /real date/
    );
    assert.throws(
        () => parseAndValidateReport(validReport({ currency: "eur" })),
        /uppercase code/
    );
});


test("rejects fractional customer counts as a validation error", () => {
    const report = JSON.parse(validReport());
    report.periods[0].customers = 42.5;

    assert.throws(
        () => parseAndValidateReport(JSON.stringify(report)),
        (error: unknown) =>
            error instanceof ReportValidationError &&
            error.status === 422 &&
            /whole number/.test(error.message)
    );
});
