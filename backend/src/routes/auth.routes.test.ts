import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { attachUser, configureUserStatusLookup, SESSION_COOKIE, signSession } from "../middleware/auth";
import { User } from "../services/users.service";
import { AuthDeps, createAuthRouter } from "./auth.routes";

process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-42";
process.env.GOOGLE_CLIENT_ID ??= "test-client.apps.googleusercontent.com";

/** In-memory account store standing in for the users table. */
function fakeAccounts() {
    const users = new Map<number, User>();
    const state = { purged: 0 };
    users.set(1, { id: 1, email: "a@example.com", name: "Alice", avatarUrl: null, createdAt: "2026-01-01T00:00:00Z", deletedAt: null });
    configureUserStatusLookup(async id => {
        const user = users.get(id);
        return user ? (user.deletedAt ? "deleted" : "active") : null;
    });
    const deps: AuthDeps = {
        verifyGoogleToken: async credential => (credential === "good" ? { sub: "g-1", email: "a@example.com", name: "Alice", avatarUrl: null } : null),
        upsertUser: async () => users.get(1) ?? (users.set(1, { id: 1, email: "a@example.com", name: "Alice", avatarUrl: null, createdAt: new Date().toISOString(), deletedAt: null }), users.get(1)!),
        getUser: async id => users.get(id) ?? null,
        getCounts: async () => ({ companies: 2, reports: 3 }),
        softDelete: async id => {
            const user = users.get(id);
            if (!user) return null;
            user.deletedAt ??= new Date().toISOString();
            return user;
        },
        recover: async id => {
            const user = users.get(id);
            if (!user?.deletedAt || Date.now() - Date.parse(user.deletedAt) > 30 * 86_400_000) return null;
            user.deletedAt = null;
            return user;
        },
        purgeExpired: async id => {
            const user = id ? users.get(id) : undefined;
            if (user?.deletedAt && Date.now() - Date.parse(user.deletedAt) > 30 * 86_400_000) {
                users.delete(user.id);
                state.purged += 1;
                return 1;
            }
            return 0;
        }
    };
    return { users, deps, state };
}

async function call(deps: AuthDeps, method: string, path: string, body?: unknown, signedIn = true) {
    const app = express();
    app.use(express.json());
    app.use(attachUser);
    app.use("/api/auth", createAuthRouter(deps));
    const server = app.listen(0);
    try {
        await new Promise<void>(resolve => server.once("listening", resolve));
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (signedIn) headers.cookie = `${SESSION_COOKIE}=${signSession(1, process.env.JWT_SECRET!)}`;
        const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth${path}`, {
            method, headers, body: body === undefined ? undefined : JSON.stringify(body)
        });
        return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
    } finally {
        server.close();
    }
}

test("account shows counts; delete needs the typed DELETE confirmation", async () => {
    const { deps, users } = fakeAccounts();
    const account = await call(deps, "GET", "/account");
    assert.equal(account.status, 200);
    assert.deepEqual(account.body.counts, { companies: 2, reports: 3 });
    assert.equal(account.body.deletion.pending, false);

    assert.equal((await call(deps, "DELETE", "/account", { confirm: "delete" })).status, 400);
    assert.equal(users.get(1)!.deletedAt, null);
    assert.equal((await call(deps, "DELETE", "/account", {}, false)).status, 401);
});

test("a deleted account is pending: no data access, /me reports it, recover restores it", async () => {
    const { deps, users } = fakeAccounts();
    const deleted = await call(deps, "DELETE", "/account", { confirm: "DELETE" });
    assert.equal(deleted.status, 200);
    assert.match(deleted.cookie ?? "", /rh_session=;/, "session cookie cleared");
    assert.ok(users.get(1)!.deletedAt);

    // Still holding an old cookie: treated as not signed in for data, but /me shows the pending deletion.
    assert.equal((await call(deps, "GET", "/account")).status, 401);
    const me = await call(deps, "GET", "/me");
    assert.equal(me.body.deletion.pending, true);
    assert.ok(Date.parse(me.body.deletion.purgeAfter) > Date.now() + 29 * 86_400_000);

    // Signing in again within 30 days gives a session plus the recover prompt.
    const signIn = await call(deps, "POST", "/google", { credential: "good" }, false);
    assert.equal(signIn.status, 200);
    assert.equal(signIn.body.deletion.pending, true);

    const recovered = await call(deps, "POST", "/account/recover");
    assert.equal(recovered.status, 200);
    assert.equal(recovered.body.deletion.pending, false);
    assert.equal((await call(deps, "GET", "/account")).status, 200);
    assert.equal((await call(deps, "POST", "/account/recover")).status, 409);
});

test("after 30 days sign-in purges the old account and recovery is gone", async () => {
    const { deps, users, state } = fakeAccounts();
    users.get(1)!.deletedAt = new Date(Date.now() - 31 * 86_400_000).toISOString();
    assert.equal((await call(deps, "POST", "/account/recover")).status, 410);

    const signIn = await call(deps, "POST", "/google", { credential: "good" }, false);
    assert.equal(signIn.status, 200);
    assert.equal(state.purged, 1);
    assert.equal(signIn.body.deletion.pending, false, "fresh account");
});
