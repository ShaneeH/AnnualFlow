import { NotFinancialReportError, logServerError } from "../utils/errors";
import { DuplicateDocumentError } from "./documents.service";
import { ClaimedJob, JobOutcome, JobStore, postgresJobStore } from "./jobs.service";
import {
    defaultReportProcessingDeps,
    processReportUpload,
    ReportProcessingDeps
} from "./report-processing.service";

/** Maps an error to the HTTP-style message used elsewhere (injected to avoid a cycle). */
export type ErrorDescriber = (error: unknown) => { error: string; code?: string };

export interface WorkerOptions {
    store?: JobStore;
    deps?: ReportProcessingDeps;
    describe?: ErrorDescriber;
    log?: (message: string) => void;
}

/**
 * In-process background worker. Processes queued jobs one at a time.
 * Suitable for local development and long-running hosts (Render, Railway,
 * Fly, a VM). NOT suitable for serverless (Vercel), where the process is
 * frozen after the HTTP response; use JOB_MODE=sync there.
 */
export class ReportWorker {
    private running = false;
    private rerun = false;
    private readonly store: JobStore;
    private readonly deps: ReportProcessingDeps;
    private readonly describe: ErrorDescriber;
    private readonly log: (message: string) => void;

    constructor(options: WorkerOptions = {}) {
        this.store = options.store ?? postgresJobStore;
        this.deps = options.deps ?? defaultReportProcessingDeps;
        this.describe = options.describe ?? (error => ({
            error: error instanceof Error ? error.message : "Processing failed."
        }));
        this.log = options.log ?? (message => console.log(message));
    }

    /** Wake the worker. Safe to call often; only one drain loop runs at a time. */
    kick(): void {
        if (this.running) {
            this.rerun = true;
            return;
        }
        void this.drain();
    }

    /** Processes queued jobs until none are left. Resolves when idle. */
    async drain(): Promise<void> {
        if (this.running) return;
        this.running = true;

        try {
            do {
                this.rerun = false;
                let job: ClaimedJob | null;
                while ((job = await this.store.claimNextJob())) {
                    await this.processJob(job);
                }
            } while (this.rerun);
        } catch (error) {
            logServerError("worker", null, error);
        } finally {
            this.running = false;
        }
    }

    async processJob(job: ClaimedJob): Promise<JobOutcome> {
        this.log(`[worker] job=${job.jobId} processing ${job.originalName}`);
        let outcome: JobOutcome;

        try {
            const result = await processReportUpload(job.pdf, job.originalName, this.deps);
            outcome = { status: "succeeded", documentId: result.documentId };
        } catch (error) {
            const described = this.describe(error);

            if (error instanceof NotFinancialReportError || error instanceof DuplicateDocumentError) {
                // Expected outcomes: the document was refused, nothing was stored.
                outcome = {
                    status: "rejected",
                    error: described.error,
                    errorCode: described.code ?? null
                };
            } else {
                logServerError("worker", job.requestId ?? job.jobId, error);
                outcome = { status: "failed", error: described.error, errorCode: described.code ?? null };
            }
        }

        await this.store.finishJob(job.jobId, outcome);
        this.log(`[worker] job=${job.jobId} ${outcome.status}`);
        return outcome;
    }
}
