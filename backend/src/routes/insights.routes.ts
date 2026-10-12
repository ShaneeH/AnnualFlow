import { Request, Response, Router } from "express";

import { insightLimiter } from "../middleware/rate-limit";
import {
    defaultInsightDeps,
    generateInsight,
    getInsight,
    InsightDeps
} from "../services/insights.service";
import { AppError, ServiceConfigError, toUpstreamAppError } from "../utils/errors";
import { PERIOD_PATTERN } from "../utils/report-validator";

const MAX_ID = 2_147_483_647;

function sendError(res: Response, status: number, error: string) {
    return res.status(status).json({
        success: false,
        error,
        requestId: res.locals.requestId
    });
}

function parseParams(req: Request): { companyId: number; period: string } | null {
    const rawId = String(req.params.companyId ?? "");
    const period = String(req.params.period ?? "");

    if (!/^\d+$/.test(rawId)) return null;
    const companyId = Number(rawId);
    if (companyId < 1 || companyId > MAX_ID) return null;
    if (period.length > 32 || !PERIOD_PATTERN.test(period)) return null;

    return { companyId, period };
}

function handleError(res: Response, error: unknown) {
    const appError = error instanceof AppError ? error : toUpstreamAppError(error);

    if (error instanceof ServiceConfigError) {
        console.error(`[insights] not configured request=${res.locals.requestId}`);
        return sendError(res, 503, "The AI insight service is not configured.");
    }

    if (appError) {
        if (appError.status >= 500) {
            console.error(`[insights] request failed request=${res.locals.requestId}`, error);
        }
        return sendError(res, appError.status, appError.message);
    }

    console.error(`[insights] request failed request=${res.locals.requestId}`, error);
    return sendError(res, 500, "The AI insight could not be generated.");
}

/** Factory so tests can inject fake dependencies. */
export function createInsightsRouter(deps: InsightDeps = defaultInsightDeps): Router {
    const router = Router();
    const path = "/companies/:companyId/periods/:period";

    // Read the cached insight only; never calls the model.
    router.get(path, async (req, res) => {
        const params = parseParams(req);
        if (!params) return sendError(res, 400, "Invalid company ID or period.");

        try {
            const insight = await getInsight(params.companyId, params.period, deps);
            return insight
                ? res.json(insight)
                : sendError(res, 404, "No AI insight has been generated for this period yet.");
        } catch (error) {
            return handleError(res, error);
        }
    });

    // Generate on demand (returns the cached one unless ?regenerate=true).
    router.post(path, insightLimiter, async (req, res) => {
        const params = parseParams(req);
        if (!params) return sendError(res, 400, "Invalid company ID or period.");

        const regenerate = req.query.regenerate === "true";

        try {
            const { insight, cached } = await generateInsight(
                params.companyId,
                params.period,
                { regenerate },
                deps
            );
            return res.status(cached ? 200 : 201).json(insight);
        } catch (error) {
            return handleError(res, error);
        }
    });

    return router;
}

export default createInsightsRouter();
