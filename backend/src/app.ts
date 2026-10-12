import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import healthRoutes from "./routes/health.routes";
import openAiRoutes from "./routes/openai.routes";
import reportRoutes from "./routes/report.routes";
import companiesRouter from "./routes/companies.routes";
import insightsRouter from "./routes/insights.routes";

import { apiLimiter } from "./middleware/rate-limit";
import { logServerError } from "./utils/errors";
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
            "X-CSRF-Token"
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

app.use("/api/health", healthRoutes);
app.use("/api/openai", openAiRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/companies", companiesRouter);
app.use("/api/insights", insightsRouter);

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

    logServerError("http] [unhandled", res.locals.requestId, error);

    res.status(500).json({
        success: false,
        error: "An unexpected server error occurred.",
        requestId: res.locals.requestId
    });
});

export default app;