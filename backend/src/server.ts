import "dotenv/config";

import app from "./app";
import { db } from "./database/db";
<<<<<<< HEAD
=======
import { getJobRuntime } from "./routes/report.routes";
import { purgeExpiredAccounts } from "./routes/auth.routes";
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

const PORT = Number(process.env.PORT) || 3000;
let shuttingDown = false;

const server = app.listen(PORT, () => {
<<<<<<< HEAD
    console.log("\n  ◆ SENUS API");
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/api/health`);
    console.log(`  Mode:    ${process.env.NODE_ENV ?? "development"}\n`);
=======
    console.log("\n  ◆ ANNUALFLOW API");
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Health:  http://localhost:${PORT}/api/health`);
    console.log(`  Mode:    ${process.env.NODE_ENV ?? "development"}`);

    // Permanently remove accounts whose 30-day recovery window has passed (also checked at sign-in).
    purgeExpiredAccounts().catch(error => console.error("[auth] could not purge deleted accounts", error));

    const jobs = getJobRuntime();
    console.log(`  Jobs:    ${jobs.mode}${jobs.mode === "async" ? " (in-process worker)" : ""}\n`);

    if (jobs.mode === "async") {
        // Recover work interrupted by a restart, then process anything queued.
        jobs.store
            .requeueStaleJobs(10)
            .catch(error => console.error("[worker] could not requeue stale jobs", error))
            .finally(() => jobs.worker.kick());
    }
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
});

function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[server] ${signal} received, closing connections...`);

    const forceTimer = setTimeout(() => {
        console.error("[server] graceful shutdown timed out");
        process.exit(1);
    }, 10_000);
    forceTimer.unref();

    server.close(async error => {
        try {
            await db.end();
        } catch (databaseError) {
            console.error("[server] database shutdown failed", databaseError);
            process.exitCode = 1;
        }

        clearTimeout(forceTimer);

        if (error) {
            console.error("[server] shutdown failed", error);
            process.exitCode = 1;
        }
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
