import assert from "node:assert/strict";
import test from "node:test";

import OpenAI from "openai";

import { uploadErrorResponse } from "../routes/report.routes";
import { cvLikeOutput } from "../utils/test-fixtures";
import { ClaimedJob, getJobMode, JobOutcome, JobStore, ReportJob } from "./jobs.service";
import { ReportProcessingDeps } from "./report-processing.service";
import { ReportWorker } from "./report-worker";

const validReport = JSON.stringify({
    classification: { isFinancialReport: true, documentType: "Financial Report", confidence: 0.95, reason: "Annual report." },
    company: "Example plc",
    reportName: "Annual Report 2025",
    reportType: "Annual Report",
    reportDate: null,
    currency: "EUR",
    source: null,
    periods: [{
        period: "FY2025", periodEnd: "2025-12-31", periodLabel: "Full Year 2025",
        revenue: 1000, grossProfit: 400, operatingProfit: 200, ebitda: null, netProfit: 150,
        cash: null, debt: null, customers: null, netAssets: null,
        operatingCashFlow: null, totalAssets: null, totalLiabilities: null, eps: null
    }]
});

/** In-memory JobStore for tests. */
function memoryStore() {
    const jobs = new Map<string, ReportJob & { pdf: Buffer | null }>();
    let next = 0;

    const store: JobStore = {
        async createJob({ originalName, pdf }) {
            const jobId = `00000000-0000-4000-8000-${String(++next).padStart(12, "0")}`;
            const job = {
                jobId, status: "queued" as const, originalName, error: null, errorCode: null,
                documentId: null, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, pdf
            };
            jobs.set(jobId, job);
            return job;
        },
        async claimNextJob() {
            const job = [...jobs.values()].find(j => j.status === "queued");
            if (!job || !job.pdf) return null;
            job.status = "processing";
            return { jobId: job.jobId, originalName: job.originalName, pdf: job.pdf, requestId: null } as ClaimedJob;
        },
        async finishJob(jobId, outcome: JobOutcome) {
            const job = jobs.get(jobId)!;
            Object.assign(job, {
                status: outcome.status,
                documentId: outcome.documentId ?? null,
                error: outcome.error ?? null,
                errorCode: outcome.errorCode ?? null,
                pdf: null,
                finishedAt: new Date().toISOString()
            });
        },
        async getJob(jobId) {
            const job = jobs.get(jobId);
            if (!job) return null;
            const { pdf: _pdf, ...rest } = job;
            return rest;
        },
        async requeueStaleJobs() {
            return 0;
        }
    };

    return { store, jobs };
}

function deps(aiResponse: () => Promise<string>, calls = { save: 0, deleted: 0 }): ReportProcessingDeps {
    return {
        documentExistsByHash: async () => false,
        uploadPDF: async () => "file-1",
        analysePDF: aiResponse,
        deletePDF: async () => { calls.deleted += 1; return true; },
        saveFinancialDocument: async () => { calls.save += 1; return { documentId: 42, conflicts: [] }; }
    };
}

const pdf = Buffer.from("%PDF-1.4 x %%EOF");
const quiet = () => undefined;
const describe = (error: unknown) => uploadErrorResponse(error).body;

test("JOB_MODE: explicit value wins, Vercel defaults to sync, elsewhere async", () => {
    assert.equal(getJobMode({ JOB_MODE: "sync" }), "sync");
    assert.equal(getJobMode({ JOB_MODE: "ASYNC", VERCEL: "1" }), "async");
    assert.equal(getJobMode({ VERCEL: "1" }), "sync");
    assert.equal(getJobMode({}), "async");
    assert.equal(getJobMode({ JOB_MODE: "nonsense" }), "async");
});

test("a valid report job succeeds with the new document id and clears the PDF", async () => {
    const { store, jobs } = memoryStore();
    const job = await store.createJob({ originalName: "a.pdf", documentHash: "h", pdf, requestId: null });

    await new ReportWorker({ store, deps: deps(async () => validReport), describe, log: quiet }).drain();

    const done = await store.getJob(job.jobId);
    assert.equal(done?.status, "succeeded");
    assert.equal(done?.documentId, 42);
    assert.equal(jobs.get(job.jobId)?.pdf, null);
});

test("a CV job is rejected with NOT_FINANCIAL_REPORT, nothing saved, OpenAI file deleted", async () => {
    const { store } = memoryStore();
    const calls = { save: 0, deleted: 0 };
    const job = await store.createJob({ originalName: "cv.pdf", documentHash: "h", pdf, requestId: null });

    await new ReportWorker({ store, deps: deps(async () => cvLikeOutput, calls), describe, log: quiet }).drain();

    const done = await store.getJob(job.jobId);
    assert.equal(done?.status, "rejected");
    assert.equal(done?.errorCode, "NOT_FINANCIAL_REPORT");
    assert.match(done?.error ?? "", /does not look like a financial report/);
    assert.equal(calls.save, 0);
    assert.equal(calls.deleted, 1);
});

test("an OpenAI failure marks the job failed with a specific message", async () => {
    const { store } = memoryStore();
    const job = await store.createJob({ originalName: "a.pdf", documentHash: "h", pdf, requestId: null });
    const failing = deps(async () => {
        throw OpenAI.APIError.generate(401, { error: { message: "bad key" } }, undefined, new Headers());
    });

    const original = console.error;
    console.error = () => undefined;
    try {
        await new ReportWorker({ store, deps: failing, describe, log: quiet }).drain();
    } finally {
        console.error = original;
    }

    const done = await store.getJob(job.jobId);
    assert.equal(done?.status, "failed");
    assert.match(done?.error ?? "", /OPENAI_API_KEY/);
});

test("kick() processes every queued job, one at a time", async () => {
    const { store } = memoryStore();
    const a = await store.createJob({ originalName: "a.pdf", documentHash: "a", pdf, requestId: null });
    const b = await store.createJob({ originalName: "b.pdf", documentHash: "b", pdf, requestId: null });
    const worker = new ReportWorker({ store, deps: deps(async () => validReport), describe, log: quiet });

    worker.kick();
    worker.kick();
    await worker.drain();
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal((await store.getJob(a.jobId))?.status, "succeeded");
    assert.equal((await store.getJob(b.jobId))?.status, "succeeded");
});
