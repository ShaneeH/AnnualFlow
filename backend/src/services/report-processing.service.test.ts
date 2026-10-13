import assert from "node:assert/strict";
import test from "node:test";

import { NotFinancialReportError } from "../utils/errors";
import { cvLikeOutput } from "../utils/test-fixtures";
import {
    processReportUpload,
    ReportProcessingDeps
} from "./report-processing.service";

function fakeDeps(aiResponse: string) {
    const calls = { save: 0, deleted: [] as string[] };

    const deps: ReportProcessingDeps = {
        documentExistsByHash: async () => false,
        uploadPDF: async () => "file-abc",
        analysePDF: async () => aiResponse,
        deletePDF: async fileId => {
            calls.deleted.push(fileId);
            return true;
        },
        saveFinancialDocument: async () => {
            calls.save += 1;
            return { documentId: 1, conflicts: [] };
        }
    };

    return { deps, calls };
}

const pdf = Buffer.from("%PDF-1.4\nCV\n%%EOF");

test("a CV is rejected with 422, nothing is saved and the OpenAI file is deleted", async () => {
    const { deps, calls } = fakeDeps(cvLikeOutput);

    await assert.rejects(
        processReportUpload(pdf, "shane-cv.pdf", 1, deps),
        (error: unknown) =>
            error instanceof NotFinancialReportError && error.status === 422
    );

    assert.equal(calls.save, 0, "saveFinancialDocument must not be called");
    assert.deepEqual(calls.deleted, ["file-abc"]);
});

test("a valid report is saved and the working copy is kept", async () => {
    const report = JSON.parse(cvLikeOutput);
    report.classification = {
        isFinancialReport: true,
        documentType: "Financial Report",
        confidence: 0.95,
        reason: "Annual report."
    };
    Object.assign(report, {
        company: "Example plc",
        reportName: "Annual Report 2025",
        reportType: "Annual Report",
        periods: [{
            period: "FY2025",
            periodEnd: "2025-12-31",
            periodLabel: "Full Year 2025",
            revenue: 1000,
            grossProfit: 400,
            operatingProfit: 200,
            ebitda: null,
            netProfit: 150,
            cash: null,
            debt: null,
            customers: null,
            netAssets: null,
            operatingCashFlow: null,
            totalAssets: null,
            totalLiabilities: null,
            eps: null
        }]
    });

    const { deps, calls } = fakeDeps(JSON.stringify(report));
    const result = await processReportUpload(pdf, "annual.pdf", 1, deps);

    assert.equal(result.documentId, 1);
    assert.equal(calls.save, 1);
    assert.deepEqual(calls.deleted, []);
});
