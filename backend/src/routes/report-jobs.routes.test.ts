import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";

import app from "../app";
import { JobStore, ReportJob } from "../services/jobs.service";
import { ReportWorker } from "../services/report-worker";
import { configureReportJobs } from "./report.routes";
import { configureUserStatusLookup, SESSION_COOKIE, signSession } from "../middleware/auth";

process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-42";
configureUserStatusLookup(async () => "active");
const sessionCookie = () => `${SESSION_COOKIE}=${signSession(1, process.env.JWT_SECRET!)}`;

const job: ReportJob = {
    jobId: "11111111-2222-4333-8444-555555555555",
    status: "queued",
    originalName: "report.pdf",
    error: null,
    errorCode: null,
    documentId: null,
    createdAt: "2026-10-12T00:00:00Z",
    startedAt: null,
    finishedAt: null
};

function fakeStore(overrides: Partial<JobStore> = {}): JobStore & { created: number } {
    const store = {
        created: 0,
        async createJob() { store.created += 1; return job; },
        async claimNextJob() { return null; },
        async finishJob() { /* no-op */ },
        async getJob(id: string) { return id === job.jobId ? { ...job, status: "succeeded" as const, documentId: 7 } : null; },
        async requeueStaleJobs() { return 0; },
        ...overrides
    };
    return store;
}

async function request(
    method: string,
    path: string,
    body?: FormData,
    headers: Record<string, string> = { cookie: sessionCookie(), "x-requested-with": "Annualflow" }
) {
    const server = app.listen(0);
    try {
        await new Promise<void>(resolve => server.once("listening", resolve));
        const port = (server.address() as AddressInfo).port;
        const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, body, headers });
        return { status: response.status, body: await response.json() };
    } finally {
        server.close();
    }
}

function pdfForm(): FormData {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("%PDF-1.4\nreport\n%%EOF")], { type: "application/pdf" }), "report.pdf");
    return form;
}

test("async mode: POST /add queues a job and returns 202 with the job id", async () => {
    const store = fakeStore();
    let kicked = 0;
    const worker = { kick: () => { kicked += 1; } } as unknown as ReportWorker;
    configureReportJobs({ mode: "async", store, worker, documentExistsByHash: async () => false });

    const { status, body } = await request("POST", "/api/reports/add", pdfForm());

    assert.equal(status, 202);
    assert.equal(body.jobId, job.jobId);
    assert.equal(body.statusUrl, `/api/reports/jobs/${job.jobId}`);
    assert.equal(store.created, 1);
    assert.equal(kicked, 1);
});

test("async mode: duplicates are refused with 409 before queuing", async () => {
    const store = fakeStore();
    configureReportJobs({ mode: "async", store, documentExistsByHash: async () => true });

    const { status, body } = await request("POST", "/api/reports/add", pdfForm());

    assert.equal(status, 409);
    assert.equal(body.code, "DUPLICATE_DOCUMENT");
    assert.equal(store.created, 0);
});

test("async mode: invalid PDFs are still rejected synchronously", async () => {
    const store = fakeStore();
    configureReportJobs({ mode: "async", store });
    const form = new FormData();
    form.append("file", new Blob(["not a pdf"], { type: "application/pdf" }), "fake.pdf");

    const { status } = await request("POST", "/api/reports/add", form);

    assert.equal(status, 400);
    assert.equal(store.created, 0);
});

test("GET /jobs/:id returns status, 404 for unknown and 400 for malformed ids", async () => {
    configureReportJobs({ store: fakeStore() });

    const found = await request("GET", `/api/reports/jobs/${job.jobId}`);
    assert.equal(found.status, 200);
    assert.equal(found.body.status, "succeeded");
    assert.equal(found.body.documentId, 7);

    assert.equal((await request("GET", "/api/reports/jobs/00000000-0000-4000-8000-000000000000")).status, 404);
    assert.equal((await request("GET", "/api/reports/jobs/not-a-uuid")).status, 400);
});

test("uploads and job status require sign-in", async () => {
    const store = fakeStore();
    configureReportJobs({ mode: "async", store, documentExistsByHash: async () => false });

    const upload = await request("POST", "/api/reports/add", pdfForm(), { "x-requested-with": "Annualflow" });
    assert.equal(upload.status, 401);
    assert.equal(upload.body.code, "SIGN_IN_REQUIRED");
    assert.equal((await request("GET", `/api/reports/jobs/${job.jobId}`, undefined, {})).status, 401);
    assert.equal(store.created, 0);
});

test("writes without the X-Requested-With header are refused (CSRF)", async () => {
    const store = fakeStore();
    configureReportJobs({ mode: "async", store, documentExistsByHash: async () => false });

    const { status } = await request("POST", "/api/reports/add", pdfForm(), { cookie: sessionCookie() });
    assert.equal(status, 403);
    assert.equal(store.created, 0);
});

test("a tampered or foreign-signed session cookie is treated as signed out", async () => {
    configureReportJobs({ mode: "async", store: fakeStore() });
    const forged = `${SESSION_COOKIE}=${signSession(1, "some-other-secret-some-other-secret-1")}`;
    const { status } = await request("POST", "/api/reports/add", pdfForm(), { cookie: forged, "x-requested-with": "Annualflow" });
    assert.equal(status, 401);
});
