import { randomUUID } from "node:crypto";

import { db } from "../database/db";

export const JOB_STATUSES = ["queued", "processing", "succeeded", "rejected", "failed"] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export interface ReportJob {
    jobId: string;
    status: JobStatus;
    originalName: string;
    error: string | null;
    errorCode: string | null;
    documentId: number | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
}

/** A claimed job including the PDF bytes to process. */
export interface ClaimedJob {
    jobId: string;
    originalName: string;
    pdf: Buffer;
    requestId: string | null;
}

export interface JobOutcome {
    status: Extract<JobStatus, "succeeded" | "rejected" | "failed">;
    documentId?: number | null;
    error?: string | null;
    errorCode?: string | null;
}

/** Persistence used by the worker (injectable for tests). */
export interface JobStore {
    createJob(input: {
        originalName: string;
        documentHash: string;
        pdf: Buffer;
        requestId: string | null;
    }): Promise<ReportJob>;
    claimNextJob(): Promise<ClaimedJob | null>;
    finishJob(jobId: string, outcome: JobOutcome): Promise<void>;
    getJob(jobId: string): Promise<ReportJob | null>;
    requeueStaleJobs(olderThanMinutes: number): Promise<number>;
}

/**
 * JOB_MODE=sync|async. Default: sync on Vercel (serverless functions are
 * frozen after the response, so an in-process worker would never run),
 * async everywhere else (local dev, Render, Railway, Fly, a VM...).
 */
export function getJobMode(env: NodeJS.ProcessEnv = process.env): "sync" | "async" {
    const configured = env.JOB_MODE?.trim().toLowerCase();
    if (configured === "sync" || configured === "async") return configured;
    return env.VERCEL ? "sync" : "async";
}

const JOB_COLUMNS = `
    job_id AS "jobId",
    status,
    original_name AS "originalName",
    error,
    error_code AS "errorCode",
    document_id AS "documentId",
    created_at AS "createdAt",
    started_at AS "startedAt",
    finished_at AS "finishedAt"
`;

export const postgresJobStore: JobStore = {
    async createJob({ originalName, documentHash, pdf, requestId }) {
        const result = await db.query<ReportJob>(
            `
            INSERT INTO report_jobs (job_id, original_name, document_hash, pdf, request_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING ${JOB_COLUMNS};
            `,
            [randomUUID(), originalName.slice(0, 255), documentHash, pdf, requestId]
        );
        return result.rows[0];
    },

    async claimNextJob() {
        // SKIP LOCKED lets several worker processes share the queue safely.
        const result = await db.query<{
            jobId: string;
            originalName: string;
            pdf: Buffer;
            requestId: string | null;
        }>(
            `
            UPDATE report_jobs
            SET status = 'processing',
                started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                attempts = attempts + 1
            WHERE job_id = (
                SELECT job_id
                FROM report_jobs
                WHERE status = 'queued'
                ORDER BY created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING
                job_id AS "jobId",
                original_name AS "originalName",
                pdf,
                request_id AS "requestId";
            `
        );
        const row = result.rows[0];
        return row?.pdf ? row : null;
    },

    async finishJob(jobId, outcome) {
        await db.query(
            `
            UPDATE report_jobs
            SET status = $2,
                document_id = $3,
                error = $4,
                error_code = $5,
                pdf = NULL,
                finished_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE job_id = $1;
            `,
            [
                jobId,
                outcome.status,
                outcome.documentId ?? null,
                outcome.error ?? null,
                outcome.errorCode ?? null
            ]
        );
    },

    async getJob(jobId) {
        const result = await db.query<ReportJob>(
            `SELECT ${JOB_COLUMNS} FROM report_jobs WHERE job_id = $1;`,
            [jobId]
        );
        return result.rows[0] ?? null;
    },

    async requeueStaleJobs(olderThanMinutes) {
        // Jobs left 'processing' by a crashed/restarted process are retried
        // (up to 3 attempts), then marked failed.
        const failed = await db.query(
            `
            UPDATE report_jobs
            SET status = 'failed',
                error = 'Processing was interrupted repeatedly. Please upload the PDF again.',
                error_code = 'INTERRUPTED',
                pdf = NULL,
                finished_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'processing'
              AND attempts >= 3
              AND started_at < CURRENT_TIMESTAMP - make_interval(mins => $1);
            `,
            [olderThanMinutes]
        );
        const requeued = await db.query(
            `
            UPDATE report_jobs
            SET status = 'queued', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'processing'
              AND started_at < CURRENT_TIMESTAMP - make_interval(mins => $1);
            `,
            [olderThanMinutes]
        );
        return (failed.rowCount ?? 0) + (requeued.rowCount ?? 0);
    }
};
