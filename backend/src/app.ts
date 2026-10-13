import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import healthRoutes from "./routes/health.routes";
import openAiRoutes from "./routes/openai.routes";
import reportRoutes from "./routes/report.routes";
import companiesRouter from "./routes/companies.routes";
<<<<<<< HEAD

import { apiLimiter } from "./middleware/rate-limit";
=======
import insightsRouter from "./routes/insights.routes";
import authRouter from "./routes/auth.routes";

import { apiLimiter } from "./middleware/rate-limit";
import { attachUser, requireCsrfHeader } from "./middleware/auth";
import { logServerError } from "./utils/errors";
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
import {
    getAllowedOrigins,
    requestContext,
    securityHeaders
} from "./middleware/security";

const app = express();

function normaliseOrigin(origin: string): string {
    return origin.trim().replace(/\/+$/, "");
}

const allowedOrigins = new Set(
    Array.from(getAllowedOrigins()).map(normaliseOrigin)
);

const frontendUrl = process.env.FRONTEND_URL;

if (frontendUrl) {
    allowedOrigins.add(normaliseOrigin(frontendUrl));
}

app.disable("x-powered-by");

app.set(
    "trust proxy",
    process.env.TRUST_PROXY === "true" ? 1 : false
);

app.use(requestContext);
app.use(securityHeaders);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }

            const isAllowed = allowedOrigins.has(
                normaliseOrigin(origin)
            );

            callback(null, isAllowed);
        },
        credentials: true,
        methods: [
            "GET",
            "POST",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Request-Id",
<<<<<<< HEAD
            "X-CSRF-Token"
=======
            "X-CSRF-Token",
            "X-Requested-With"
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        ],
        exposedHeaders: [
            "Content-Disposition",
            "X-Request-Id"
        ],
        maxAge: 600
    })
);

app.use(express.json({ limit: "100kb" }));

app.use("/api", apiLimiter);
<<<<<<< HEAD

=======
app.use("/api", attachUser, requireCsrfHeader);

app.use("/api/auth", authRouter);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
app.use("/api/health", healthRoutes);
app.use("/api/openai", openAiRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/companies", companiesRouter);
<<<<<<< HEAD
=======
app.use("/api/insights", insightsRouter);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found.",
        requestId: res.locals.requestId
    });
});

app.use((
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (res.headersSent) {
        return;
    }

    const errorType =
        typeof error === "object" &&
        error !== null &&
        "type" in error
            ? error.type
            : null;

    if (errorType === "entity.parse.failed") {
        res.status(400).json({
            success: false,
            error: "The request body contains invalid JSON.",
            requestId: res.locals.requestId
        });
        return;
    }

    if (errorType === "entity.too.large") {
        res.status(413).json({
            success: false,
            error: "The request body is too large.",
            requestId: res.locals.requestId
        });
        return;
    }

<<<<<<< HEAD
    console.error(
        `[http] unhandled request=${res.locals.requestId}`,
        error
    );
=======
    logServerError("http] [unhandled", res.locals.requestId, error);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    res.status(500).json({
        success: false,
        error: "An unexpected server error occurred.",
        requestId: res.locals.requestId
    });
});

export default app;