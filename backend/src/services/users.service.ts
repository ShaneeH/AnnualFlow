import { db, pool } from "../database/db";

export interface User {
    id: number;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
    /** Set while the account is pending deletion (30-day recovery window). */
    deletedAt: string | null;
}

export const RECOVERY_DAYS = 30;

const USER_COLUMNS = `
    user_id AS id, email, name, avatar_url AS "avatarUrl",
    created_at AS "createdAt", deleted_at AS "deletedAt"`;

/** Creates the user on first sign-in, refreshes profile details afterwards. Never touches deleted_at. */
export async function upsertGoogleUser(profile: {
    sub: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
}): Promise<User> {
    const result = await db.query<User>(
        `
        INSERT INTO users (google_sub, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (google_sub) DO UPDATE
            SET email = EXCLUDED.email,
                name = EXCLUDED.name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = CURRENT_TIMESTAMP
        RETURNING ${USER_COLUMNS};
        `,
        [profile.sub, profile.email, profile.name, profile.avatarUrl]
    );
    return result.rows[0];
}

export async function getUserById(id: number): Promise<User | null> {
    const result = await db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = $1`, [id]);
    return result.rows[0] ?? null;
}

/** "active", "deleted" (pending, recoverable) or null (no such user). Used on every request. */
export async function getUserStatus(id: number): Promise<"active" | "deleted" | null> {
    const result = await db.query<{ deleted: boolean }>(
        "SELECT deleted_at IS NOT NULL AS deleted FROM users WHERE user_id = $1",
        [id]
    );
    const row = result.rows[0];
    return row ? (row.deleted ? "deleted" : "active") : null;
}

export async function getAccountCounts(id: number): Promise<{ companies: number; reports: number }> {
    const result = await db.query<{ companies: number; reports: number }>(
        `
        SELECT
            (SELECT COUNT(*)::int FROM companies WHERE user_id = $1) AS companies,
            (SELECT COUNT(*)::int FROM documents WHERE user_id = $1) AS reports;
        `,
        [id]
    );
    return result.rows[0];
}

export async function softDeleteUser(id: number): Promise<User | null> {
    const result = await db.query<User>(
        `UPDATE users SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 RETURNING ${USER_COLUMNS}`,
        [id]
    );
    return result.rows[0] ?? null;
}

/** Restores a pending deletion if it is still inside the recovery window. */
export async function recoverUser(id: number): Promise<User | null> {
    const result = await db.query<User>(
        `UPDATE users SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND deleted_at IS NOT NULL
           AND deleted_at > CURRENT_TIMESTAMP - make_interval(days => $2)
         RETURNING ${USER_COLUMNS}`,
        [id, RECOVERY_DAYS]
    );
    return result.rows[0] ?? null;
}

export function purgeAfter(deletedAt: string | Date): string {
    return new Date(new Date(deletedAt).getTime() + RECOVERY_DAYS * 86_400_000).toISOString();
}

/**
 * Permanently removes users whose recovery window has passed, with their companies,
 * documents, periods, insights and jobs. Returns the OpenAI file ids of removed
 * documents so the caller can clean those up too.
 */
export async function purgeExpiredUsers(userId?: number): Promise<{ users: number; openaiFileIds: string[] }> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const expired = await client.query<{ user_id: number }>(
            `SELECT user_id FROM users
             WHERE deleted_at IS NOT NULL
               AND deleted_at <= CURRENT_TIMESTAMP - make_interval(days => $1)
               AND ($2::int IS NULL OR user_id = $2)
             FOR UPDATE`,
            [RECOVERY_DAYS, userId ?? null]
        );
        const ids = expired.rows.map(r => r.user_id);
        if (!ids.length) {
            await client.query("COMMIT");
            return { users: 0, openaiFileIds: [] };
        }

        const files = await client.query<{ openai_file_id: string }>(
            "SELECT openai_file_id FROM documents WHERE user_id = ANY($1::int[]) AND openai_file_id IS NOT NULL",
            [ids]
        );
        // Order respects the foreign keys (documents/periods RESTRICT on companies).
        await client.query("DELETE FROM report_jobs WHERE user_id = ANY($1::int[])", [ids]);
        await client.query("DELETE FROM documents WHERE user_id = ANY($1::int[])", [ids]); // cascades document_periods
        await client.query(
            "DELETE FROM financial_periods WHERE company_id IN (SELECT company_id FROM companies WHERE user_id = ANY($1::int[]))",
            [ids]
        );
        await client.query("DELETE FROM companies WHERE user_id = ANY($1::int[])", [ids]); // cascades ai_insights
        await client.query("DELETE FROM users WHERE user_id = ANY($1::int[])", [ids]);
        await client.query("COMMIT");
        return { users: ids.length, openaiFileIds: files.rows.map(r => r.openai_file_id) };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
