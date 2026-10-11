import assert from "node:assert/strict";
import test from "node:test";

import { NotFinancialReportError, ReportValidationError } from "./errors";
import { cvLikeOutput } from "./test-fixtures";
import { assertFinancialContent, parseAndValidateReport } from "./report-validator";

function period(overrides: Record<string, unknown> = {}) {
    return {
        period: "FY2025",
        periodEnd: "2025-12-31",
        periodLabel: "Full Year 2025",
        revenue: 1_000_000,
        grossProfit: 400_000,
        operatingProfit: 200_000,
        ebitda: null,
        netProfit: 150_000,
        cash: 300_000,
        debt: 50_000,
        customers: null,
        netAssets: 700_000,
        operatingCashFlow: 180_000,
        totalAssets: 1_200_000,
        totalLiabilities: 500_000,
        eps: 0.42,
        ...overrides
    };
}

function aiOutput(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        classification: {
            isFinancialReport: true,
            documentType: "Financial Report",
            confidence: 0.95,
            reason: "Annual report with financial statements."
        },
        company: "Example plc",
        reportName: "Annual Report 2025",
        reportType: "Annual Report",
        reportDate: "2025-12-31",
        currency: "EUR",
        source: "Consolidated Income Statement",
        periods: [period()],
        ...overrides
    });
}

test("accepts a valid financial report and keeps its classification", () => {
    const report = parseAndValidateReport(aiOutput());

    assert.equal(report.classification.isFinancialReport, true);
    assert.equal(report.periods[0].totalAssets, 1_200_000);
    assert.equal(report.periods[0].eps, 0.42);
});

test("rejects a CV classified as non-financial", () => {
    assert.throws(
        () => parseAndValidateReport(cvLikeOutput),
        (error: unknown) =>
            error instanceof NotFinancialReportError &&
            error.status === 422 &&
            /does not look like a financial report/.test(error.message) &&
            /CV \/ Resume/.test(error.message)
    );
});

test("rejects a CV even if the model wrongly extracted a person as a company", () => {
    // Model says "not financial" but still filled in fields: still rejected.
    const output = aiOutput({
        classification: {
            isFinancialReport: false,
            documentType: "CV / Resume",
            confidence: 0.9,
            reason: "Personal CV."
        },
        company: "Shane Hahesy",
        reportName: "Curriculum Vitae"
    });

    assert.throws(() => parseAndValidateReport(output), NotFinancialReportError);
});

test("rejects a CV mislabelled as financial when it has no core figures", () => {
    // Model wrongly says "financial", but deterministic checks still catch it.
    const output = aiOutput({
        company: "Shane Hahesy",
        periods: [period({
            revenue: null,
            grossProfit: null,
            operatingProfit: null,
            netProfit: null,
            cash: null,
            debt: null,
            netAssets: null,
            operatingCashFlow: null,
            totalAssets: null,
            totalLiabilities: null,
            eps: null
        })]
    });

    assert.throws(
        () => parseAndValidateReport(output),
        (error: unknown) =>
            error instanceof NotFinancialReportError &&
            /No core financial figures/.test(error.message)
    );
});

test("rejects a single isolated figure (e.g. a salary on a CV)", () => {
    assert.throws(
        () => assertFinancialContent([period({
            revenue: 55_000,
            grossProfit: null,
            operatingProfit: null,
            netProfit: null,
            cash: null,
            debt: null,
            netAssets: null,
            operatingCashFlow: null,
            totalAssets: null,
            totalLiabilities: null
        }) as never]),
        NotFinancialReportError
    );
});

test("rejects low-confidence classifications", () => {
    const output = aiOutput({
        classification: {
            isFinancialReport: true,
            documentType: "Financial Report",
            confidence: 0.4,
            reason: "Unclear document."
        }
    });

    assert.throws(() => parseAndValidateReport(output), NotFinancialReportError);
});

test("rejects missing or malformed classification", () => {
    const output = JSON.parse(aiOutput());
    delete output.classification;

    assert.throws(
        () => parseAndValidateReport(JSON.stringify(output)),
        NotFinancialReportError
    );
    assert.throws(
        () => parseAndValidateReport(aiOutput({
            classification: {
                isFinancialReport: "yes",
                documentType: "Financial Report",
                confidence: 0.9,
                reason: ""
            }
        })),
        NotFinancialReportError
    );
});

test("rejects a financial classification with no reporting periods", () => {
    assert.throws(
        () => parseAndValidateReport(aiOutput({ periods: [] })),
        NotFinancialReportError
    );
});

test("rejects implausible figures", () => {
    assert.throws(
        () => parseAndValidateReport(aiOutput({ periods: [period({ revenue: -5 })] })),
        ReportValidationError
    );
    assert.throws(
        () => parseAndValidateReport(aiOutput({
            periods: [period({ revenue: 100, grossProfit: 500 })]
        })),
        ReportValidationError
    );
});
