/**
 * Ownership isolation against a real PostgreSQL database.
 *
 * Skipped unless OWNERSHIP_TEST_DATABASE_URL points at a migrated, seeded
 * database that is safe to write to (for example a throwaway schema:
 * postgres://...?options=-csearch_path%3Dauthtest). Sessions are signed
 * directly with JWT_SECRET, so no Google account is needed.
 */
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";

const url = process.env.OWNERSHIP_TEST_DATABASE_URL;

test("users only see public data plus their own, and cannot change anyone else's", { skip: !url }, async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = "ownership-test-secret-ownership-test-secret";

    const { default: app } = await import("./app");
    const { db } = await import("./database/db");
    const { SESSION_COOKIE, signSession } = await import("./middleware/auth");
    const { upsertGoogleUser } = await import("./services/users.service");
    const { documentExistsByHash, saveFinancialDocument } = await import("./services/documents.service");
    const { postgresJobStore } = await import("./services/jobs.service");

    const stamp = Date.now();
    const alice = await upsertGoogleUser({ sub: `alice-${stamp}`, email: "alice@example.com", name: "Alice", avatarUrl: null });
    const bob = await upsertGoogleUser({ sub: `bob-${stamp}`, email: "bob@example.com", name: "Bob", avatarUrl: null });

    const period = {
        period: "FY2025", periodEnd: "2025-12-31", periodLabel: "FY 2025",
        revenue: 1000, grossProfit: 400, operatingProfit: 200, ebitda: 250, netProfit: 150,
        cash: 90, debt: 30, customers: 10, netAssets: 500, operatingCashFlow: 180,
        totalAssets: 900, totalLiabilities: 400, eps: 1.5
    };
    const report = (revenue: number) => ({
        classification: { isFinancialReport: true, documentType: "Financial Report" as const, confidence: 0.99, reason: "test" },
        company: `Acme ${stamp}`,
        reportName: "Acme Annual Report 2025",
        reportType: "Annual Report" as const,
        reportDate: "2025-12-31",
        currency: "EUR",
        source: null,
        periods: [{ ...period, revenue }]
    });

    // Same PDF hash and same company name for both users: must stay two separate private records.
    const hash = `hash-${stamp}`;
    const aliceDoc = await saveFinancialDocument(hash, "file-a", report(1000), alice.id);
    const bobDoc = await saveFinancialDocument(hash, "file-b", report(2000), bob.id);
    assert.ok(await documentExistsByHash(hash, alice.id));
    assert.ok(await documentExistsByHash(hash, bob.id));

    const server = app.listen(0);
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    const as = (user: { id: number } | null) => async (path: string, method = "GET") => {
        const headers: Record<string, string> = { "x-requested-with": "Annualflow" };
        if (user) headers.cookie = `${SESSION_COOKIE}=${signSession(user.id, process.env.JWT_SECRET!)}`;
        const response = await fetch(base + path, { method, headers });
        const text = await response.text();
        let body: any = text;
        try { body = JSON.parse(text); } catch { /* PDF/CSV */ }
        return { status: response.status, body };
    };
    const anon = as(null), a = as(alice), b = as(bob);

    try {
        const publicCompanies = (await anon("/companies")).body;
        assert.ok(publicCompanies.every((c: any) => !c.isOwned), "signed-out visitors only see public companies");
        assert.ok(publicCompanies.some((c: any) => c.isExample), "the example dataset stays visible");

        const aliceCompanies = (await a("/companies")).body;
        const bobCompanies = (await b("/companies")).body;
        const aliceAcme = aliceCompanies.find((c: any) => c.isOwned);
        const bobAcme = bobCompanies.find((c: any) => c.isOwned);
        assert.equal(aliceCompanies.filter((c: any) => c.isOwned).length, 1);
        assert.equal(bobCompanies.filter((c: any) => c.isOwned).length, 1);
        assert.notEqual(aliceAcme.companyId, bobAcme.companyId, "same name, separate records");
        assert.ok(aliceCompanies.some((c: any) => c.isExample) && bobCompanies.some((c: any) => c.isExample));

        // Alice's figures are hers; Bob's company is invisible to her and to visitors.
        assert.equal((await a(`/companies/${aliceAcme.companyId}/periods/FY2025`)).body.financials.revenue, 1000);
        for (const path of [
            `/companies/${bobAcme.companyId}/periods`,
            `/companies/${bobAcme.companyId}/periods/FY2025`,
            `/companies/${bobAcme.companyId}/history`,
            `/insights/companies/${bobAcme.companyId}/periods/FY2025`
        ]) {
            assert.equal((await a(path)).status, 404, `alice: ${path}`);
            assert.equal((await anon(path)).status, 404, `anon: ${path}`);
        }
        assert.equal((await b(`/companies/${bobAcme.companyId}/periods/FY2025`)).body.financials.revenue, 2000);

        // Documents: list, detail, exports, stats.
        const aliceDocs = (await a("/reports")).body.map((d: any) => d.documentId);
        assert.ok(aliceDocs.includes(aliceDoc.documentId) && !aliceDocs.includes(bobDoc.documentId));
        assert.ok(!(await anon("/reports")).body.some((d: any) => [aliceDoc.documentId, bobDoc.documentId].includes(d.documentId)));
        assert.equal((await a(`/reports?companyId=${bobAcme.companyId}`)).body.length, 0);
        for (const suffix of ["", "/export.pdf", "/export.csv", "/export.json"]) {
            assert.equal((await a(`/reports/${bobDoc.documentId}${suffix}`)).status, 404, `alice reads bob doc${suffix}`);
            assert.equal((await anon(`/reports/${aliceDoc.documentId}${suffix}`)).status, 404, `anon reads alice doc${suffix}`);
        }
        assert.equal((await b(`/reports/${bobDoc.documentId}/export.json`)).status, 200);
        assert.equal((await anon("/reports/stats")).body.documents + 1, (await a("/reports/stats")).body.documents);

        // Insights: Bob's cached insight is his alone; the example dataset is read-only.
        await db.query(
            "INSERT INTO ai_insights (company_id, period, content, model) VALUES ($1, 'FY2025', '{}'::jsonb, 'test')",
            [bobAcme.companyId]
        );
        assert.equal((await b(`/insights/companies/${bobAcme.companyId}/periods/FY2025`)).status, 200);
        assert.equal((await a(`/insights/companies/${bobAcme.companyId}/periods/FY2025`)).status, 404);
        assert.equal((await a(`/insights/companies/${bobAcme.companyId}/periods/FY2025?regenerate=true`, "POST")).status, 404);
        const example = publicCompanies.find((c: any) => c.isExample);
        const examplePeriod = (await anon(`/companies/${example.companyId}/periods`)).body[0].period;
        assert.equal((await a(`/insights/companies/${example.companyId}/periods/${examplePeriod}?regenerate=true`, "POST")).status, 403);
        assert.equal((await anon(`/insights/companies/${example.companyId}/periods/${examplePeriod}`, "POST")).status, 401);

        // Deletes: never another user's document, never the public example.
        const exampleDoc = (await anon(`/reports?companyId=${example.companyId}`)).body[0].documentId;
        assert.equal((await a(`/reports/${bobDoc.documentId}`, "DELETE")).status, 404);
        assert.equal((await a(`/reports/${exampleDoc}`, "DELETE")).status, 404);
        assert.equal((await anon(`/reports/${aliceDoc.documentId}`, "DELETE")).status, 401);
        assert.equal((await b(`/reports/${bobDoc.documentId}`)).status, 200, "bob's document survived");
        assert.equal((await anon(`/reports/${exampleDoc}`)).status, 200, "example document survived");

        // Background jobs are visible only to whoever queued them.
        const job = await postgresJobStore.createJob({ originalName: "b.pdf", documentHash: "j", pdf: Buffer.from("x"), requestId: null, userId: bob.id });
        await db.query("UPDATE report_jobs SET status = 'failed', pdf = NULL WHERE job_id = $1", [job.jobId]);
        assert.equal((await a(`/reports/jobs/${job.jobId}`)).status, 404);
        assert.equal((await b(`/reports/jobs/${job.jobId}`)).status, 200);

        // Session endpoints.
        assert.equal((await a("/auth/me")).body.user.name, "Alice");
        assert.equal((await anon("/auth/me")).body.user, null);

        // Alice deleting her own document works and leaves Bob's same-hash copy alone.
        assert.equal((await a(`/reports/${aliceDoc.documentId}`, "DELETE")).status, 200);
        assert.ok(await documentExistsByHash(hash, bob.id));

        // Soft delete: Bob's data disappears for everyone, including Bob's own session.
        const { softDeleteUser, recoverUser, getUserById } = await import("./services/users.service");
        const { purgeExpiredAccounts } = await import("./routes/auth.routes");
        await softDeleteUser(bob.id);
        assert.equal((await b(`/reports/${bobDoc.documentId}`)).status, 404, "pending deletion hides data");
        assert.equal((await b(`/companies/${bobAcme.companyId}/periods/FY2025`)).status, 404);
        assert.ok(!(await b("/companies")).body.some((c: any) => c.isOwned));
        assert.equal((await b("/auth/me")).body.deletion.pending, true);
        assert.equal(await purgeExpiredAccounts(bob.id), 0, "inside the window nothing is purged");

        await recoverUser(bob.id);
        assert.equal((await b(`/reports/${bobDoc.documentId}`)).status, 200, "recovered");

        // Past the window: the user and everything they own are removed.
        await softDeleteUser(bob.id);
        await db.query("UPDATE users SET deleted_at = CURRENT_TIMESTAMP - INTERVAL '31 days' WHERE user_id = $1", [bob.id]);
        assert.equal(await recoverUser(bob.id), null, "recovery expired");
        assert.equal(await purgeExpiredAccounts(), 1);
        assert.equal(await getUserById(bob.id), null);
        const left = await db.query(
            `SELECT (SELECT COUNT(*) FROM companies WHERE company_id = $1)::int +
                    (SELECT COUNT(*) FROM documents WHERE document_id = $2)::int +
                    (SELECT COUNT(*) FROM financial_periods WHERE company_id = $1)::int +
                    (SELECT COUNT(*) FROM ai_insights WHERE company_id = $1)::int +
                    (SELECT COUNT(*) FROM report_jobs WHERE job_id = $3)::int AS n`,
            [bobAcme.companyId, bobDoc.documentId, job.jobId]
        );
        assert.equal(left.rows[0].n, 0, "companies, documents, periods, insights and jobs purged");
        assert.equal((await anon(`/reports/${exampleDoc}`)).status, 200, "example data untouched");
    } finally {
        server.close();
        await db.query("DELETE FROM report_jobs WHERE user_id IN ($1, $2)", [alice.id, bob.id]).catch(() => undefined);
        await db.end();
    }
});
