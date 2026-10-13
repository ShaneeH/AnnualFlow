import { Request, Response, Router } from "express";
import { OAuth2Client } from "google-auth-library";

import { authLimiter } from "../middleware/rate-limit";
import {
    getJwtSecret,
    requireAuth,
    SESSION_COOKIE,
    sessionCookieOptions,
    signSession
} from "../middleware/auth";
import { deletePDF } from "../services/openai.service";
import {
    getAccountCounts,
    getUserById,
    purgeAfter,
    purgeExpiredUsers,
    recoverUser,
    softDeleteUser,
    upsertGoogleUser,
    User
} from "../services/users.service";
import { logServerError } from "../utils/errors";

export interface GoogleProfile {
    sub: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
}

export interface AuthDeps {
    verifyGoogleToken(credential: string, clientId: string): Promise<GoogleProfile | null>;
    upsertUser(profile: GoogleProfile): Promise<User>;
    getUser(id: number): Promise<User | null>;
    getCounts(id: number): Promise<{ companies: number; reports: number }>;
    softDelete(id: number): Promise<User | null>;
    recover(id: number): Promise<User | null>;
    /** Permanently removes expired deletions (optionally only this user). */
    purgeExpired(userId?: number): Promise<number>;
}

const googleClient = new OAuth2Client();

async function verifyGoogleToken(credential: string, clientId: string): Promise<GoogleProfile | null> {
    try {
        // Checks signature, expiry, issuer (accounts.google.com) and audience (our client ID).
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub) return null;
        return {
            sub: payload.sub,
            email: payload.email_verified ? payload.email ?? null : null,
            name: payload.name ?? null,
            avatarUrl: payload.picture ?? null
        };
    } catch {
        return null;
    }
}

/** Purges expired accounts and best-effort removes their OpenAI working copies. */
export async function purgeExpiredAccounts(userId?: number): Promise<number> {
    const { users, openaiFileIds } = await purgeExpiredUsers(userId);
    for (const fileId of openaiFileIds) {
        await deletePDF(fileId).catch(() => false);
    }
    if (users) console.log(`[auth] permanently removed ${users} deleted account(s)`);
    return users;
}

export const defaultAuthDeps: AuthDeps = {
    verifyGoogleToken,
    upsertUser: upsertGoogleUser,
    getUser: getUserById,
    getCounts: getAccountCounts,
    softDelete: softDeleteUser,
    recover: recoverUser,
    purgeExpired: purgeExpiredAccounts
};

function sendError(res: Response, status: number, error: string, code?: string) {
    return res.status(status).json({ success: false, error, ...(code ? { code } : {}), requestId: res.locals.requestId });
}

function clearSession(res: Response): void {
    const { maxAge: _maxAge, ...options } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
}

/** Public shape: profile plus the deletion status the frontend uses for the recover prompt. */
function present(user: User) {
    const { deletedAt, ...profile } = user;
    return {
        user: profile,
        deletion: deletedAt
            ? { pending: true, deletedAt, purgeAfter: purgeAfter(deletedAt) }
            : { pending: false, deletedAt: null, purgeAfter: null }
    };
}

export function createAuthRouter(deps: AuthDeps = defaultAuthDeps): Router {
    const router = Router();

    // POST /api/auth/google { credential } -> sets the session cookie.
    router.post("/google", authLimiter, async (req: Request, res: Response) => {
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
        const secret = getJwtSecret();
        if (!clientId || !secret) {
            return sendError(res, 503, "Sign-in is not configured on this server (GOOGLE_CLIENT_ID / JWT_SECRET).");
        }

        const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
        if (!credential || credential.length > 4096) {
            return sendError(res, 400, "Missing Google credential.");
        }

        try {
            const profile = await deps.verifyGoogleToken(credential, clientId);
            if (!profile) return sendError(res, 401, "Google sign-in could not be verified.");

            let user = await deps.upsertUser(profile);
            // Past the recovery window: remove the old account for good and start fresh.
            if (user.deletedAt && (await deps.purgeExpired(user.id)) > 0) {
                user = await deps.upsertUser(profile);
            }

            // A pending-deletion account still gets a session, but only to see the recover prompt.
            res.cookie(SESSION_COOKIE, signSession(user.id, secret), sessionCookieOptions());
            res.setHeader("Cache-Control", "no-store");
            return res.json(present(user));
        } catch (error) {
            logServerError("auth", res.locals.requestId, error);
            return sendError(res, 500, "Sign-in failed.");
        }
    });

    // GET /api/auth/me -> { user, deletion } or { user: null }
    router.get("/me", async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        const id = req.user?.id ?? req.deletedUser?.id;
        if (!id) return res.json({ user: null, deletion: null });

        try {
            const user = await deps.getUser(id);
            if (!user) {
                clearSession(res);
                return res.json({ user: null, deletion: null });
            }
            return res.json(present(user));
        } catch (error) {
            logServerError("auth", res.locals.requestId, error);
            return sendError(res, 500, "Could not load the signed-in user.");
        }
    });

    // GET /api/auth/account -> profile plus counts (active accounts only).
    router.get("/account", requireAuth, async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        try {
            const [user, counts] = await Promise.all([deps.getUser(req.user!.id), deps.getCounts(req.user!.id)]);
            if (!user) return sendError(res, 404, "Account not found.");
            return res.json({ ...present(user), counts });
        } catch (error) {
            logServerError("auth", res.locals.requestId, error);
            return sendError(res, 500, "Could not load the account.");
        }
    });

    // DELETE /api/auth/account { confirm: "DELETE" } -> soft delete, 30-day recovery window.
    router.delete("/account", requireAuth, async (req, res) => {
        if (req.body?.confirm !== "DELETE") {
            return sendError(res, 400, "Type DELETE to confirm.", "CONFIRMATION_REQUIRED");
        }
        try {
            const user = await deps.softDelete(req.user!.id);
            if (!user) return sendError(res, 404, "Account not found.");
            clearSession(res);
            return res.json({ success: true, ...present(user) });
        } catch (error) {
            logServerError("auth", res.locals.requestId, error);
            return sendError(res, 500, "The account could not be deleted.");
        }
    });

    // POST /api/auth/account/recover -> restores a pending deletion within 30 days.
    router.post("/account/recover", async (req, res) => {
        const id = req.deletedUser?.id;
        if (!id) {
            return req.user
                ? sendError(res, 409, "This account is not pending deletion.")
                : sendError(res, 401, "Please sign in to do that.", "SIGN_IN_REQUIRED");
        }
        try {
            const user = await deps.recover(id);
            if (!user) return sendError(res, 410, "The recovery window has passed.", "RECOVERY_EXPIRED");
            return res.json({ success: true, ...present(user) });
        } catch (error) {
            logServerError("auth", res.locals.requestId, error);
            return sendError(res, 500, "The account could not be recovered.");
        }
    });

    router.post("/logout", (_req, res) => {
        clearSession(res);
        return res.json({ success: true });
    });

    return router;
}

export default createAuthRouter();
