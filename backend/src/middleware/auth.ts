import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { getUserStatus } from "../services/users.service";

/** The signed-in user, set by attachUser from the session cookie. */
export interface AuthUser {
    id: number;
}

declare module "express-serve-static-core" {
    interface Request {
        /** Active signed-in user. Never set for accounts pending deletion. */
        user?: AuthUser;
        /** Valid session for an account pending deletion: may only view status, recover or sign out. */
        deletedUser?: AuthUser;
    }
}

export const SESSION_COOKIE = "rh_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Header the frontend sends on every write. Forces a CORS preflight, which blocks cross-site form posts (CSRF). */
export const CSRF_HEADER = "x-requested-with";

export function getJwtSecret(): string | null {
    const secret = process.env.JWT_SECRET?.trim();
    return secret && secret.length >= 32 ? secret : null;
}

type SameSite = "lax" | "strict" | "none";

/**
 * Cookie settings. Production defaults to SameSite=None + Secure because the
 * frontend (Vercel) and the API live on different sites. COOKIE_SAMESITE overrides.
 */
export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
    const production = env.NODE_ENV === "production";
    const configured = env.COOKIE_SAMESITE?.trim().toLowerCase();
    const sameSite: SameSite = configured === "lax" || configured === "strict" || configured === "none"
        ? configured
        : production ? "none" : "lax";

    return {
        httpOnly: true,
        // Browsers reject SameSite=None cookies that are not Secure.
        secure: production || sameSite === "none",
        sameSite,
        path: "/",
        maxAge: SESSION_MAX_AGE_MS
    };
}

export function signSession(userId: number, secret: string): string {
    return jwt.sign({}, secret, {
        algorithm: "HS256",
        subject: String(userId),
        expiresIn: Math.floor(SESSION_MAX_AGE_MS / 1000)
    });
}

/** Returns the user id from a valid session token, or null. */
export function verifySession(token: string, secret: string): number | null {
    try {
        const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
        const id = typeof payload === "object" ? Number(payload.sub) : NaN;
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

export function readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null;
    for (const part of header.split(";")) {
        const index = part.indexOf("=");
        if (index < 0) continue;
        if (part.slice(0, index).trim() === name) {
            try {
                return decodeURIComponent(part.slice(index + 1).trim());
            } catch {
                return null;
            }
        }
    }
    return null;
}

type StatusLookup = (id: number) => Promise<"active" | "deleted" | null>;
let statusLookup: StatusLookup = getUserStatus;

/** Test hook: replace the per-request account status lookup. */
export function configureUserStatusLookup(lookup: StatusLookup): void {
    statusLookup = lookup;
}

/**
 * Sets req.user for a valid session of an active account, or req.deletedUser
 * for an account pending deletion (whose data is then hidden like anyone else's).
 * Never rejects; a failed lookup means signed out.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
    req.user = undefined;
    req.deletedUser = undefined;
    const secret = getJwtSecret();
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const id = secret && token ? verifySession(token, secret) : null;
    if (id) {
        try {
            const status = await statusLookup(id);
            if (status === "active") req.user = { id };
            else if (status === "deleted") req.deletedUser = { id };
        } catch {
            // Fail closed: treat as signed out.
        }
    }
    next();
}

/** Rejects state-changing requests that lack the custom header (CSRF protection for cookie sessions). */
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.header(CSRF_HEADER)) {
        next();
        return;
    }
    res.status(403).json({
        success: false,
        error: "Missing X-Requested-With header.",
        requestId: res.locals.requestId
    });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (req.user) {
        next();
        return;
    }
    res.status(401).json({
        success: false,
        error: "Please sign in to do that.",
        code: "SIGN_IN_REQUIRED",
        requestId: res.locals.requestId
    });
}

/** The viewer's user id, or null for signed-out visitors (who see public data only). */
export function viewerId(req: Request): number | null {
    return req.user?.id ?? null;
}
