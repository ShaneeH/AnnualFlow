import assert from "node:assert/strict";
import test from "node:test";

import { FinancialDocumentRecord } from "./documents.service";
import {
    createReportCsv,
    createReportJson,
    createReportPdf,
    getReportExportFilename
} from "./report-export.service";

const document: FinancialDocumentRecord = {
    documentId: 7,
    companyId: 3,
    companyName: "Example plc",
    reportName: "Annual Report 2025",
    reportType: "Annual Report",
    reportDate: "2025-12-31",
    currency: "EUR",
    source: "Income Statement",
    uploadedAt: "2026-01-10T12:00:00.000Z",
    periods: [{
        periodId: 9,
        period: "FY2025",
        periodLabel: "Full Year 2025",
        periodEnd: "2025-12-31",
        revenue: "1200000",
        grossProfit: 500000,
        operatingProfit: 250000,
        ebitda: null,
        netProfit: 190000,
        cash: 300000,
        debt: 100000,
        customers: 2500,
<<<<<<< HEAD
        netAssets: 800000
=======
        netAssets: 800000,
        operatingCashFlow: 210000,
        totalAssets: 1500000,
        totalLiabilities: 700000,
        eps: 0.42
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    }]
};

test("creates a valid PDF container", () => {
    const pdf = createReportPdf(document);
    const body = pdf.toString("latin1");

    assert.equal(body.startsWith("%PDF-1.4"), true);
    assert.match(body, /xref\n/);
    assert.match(body, /%%EOF/);
    assert.match(body, /Example plc/);
});

test("creates CSV rows and protects spreadsheet formulas", () => {
    const csv = createReportCsv({
        ...document,
        companyName: "=DANGEROUS()"
    });

    assert.match(csv, /"'=DANGEROUS\(\)"/);
    assert.match(csv, /"FY2025"/);
    assert.match(csv, /"1200000"/);
});

test("creates a portable JSON report without database identifiers", () => {
    const exported = JSON.parse(createReportJson(document));

    assert.equal(exported.schemaVersion, "1.0");
    assert.equal(exported.report.company, "Example plc");
    assert.equal(exported.report.periods[0].revenue, 1200000);
    assert.equal("documentId" in exported.report, false);
    assert.equal("periodId" in exported.report.periods[0], false);
});

test("creates safe export filenames", () => {
    assert.equal(
        getReportExportFilename(document, "pdf"),
        "example-plc-annual-report-2025.pdf"
    );
});
