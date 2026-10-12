import OpenAI from "openai";

/** Base class for errors that map directly to an HTTP status. */
export class AppError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = new.target.name;
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 404);
    }
}

/** The AI output failed validation and must not be stored. */
export class ReportValidationError extends AppError {
    constructor(message: string) {
        super(message, 422);
    }
}

/**
 * The uploaded document is not a financial report (e.g. a CV, invoice or
 * letter). Nothing may be written to the database for it.
 */
export class NotFinancialReportError extends ReportValidationError {
    constructor(message: string) {
        super(message);
    }
}

/** A required server-side setting (such as OPENAI_API_KEY) is missing. */
export class ServiceConfigError extends AppError {
    constructor(message: string) {
        super(message, 503);
    }
}

/** The analysis service returned an unusable (empty) response. */
export class AnalysisServiceError extends AppError {
    constructor(message: string) {
        super(message, 422);
    }
}

/** Keeps upstream messages short and single-line before showing them to users. */
function shortMessage(error: { message?: string }): string {
    const message = String(error.message ?? "").replace(/\s+/g, " ").trim();
    return message.length > 300 ? `${message.slice(0, 297)}...` : message;
}

/**
 * Converts known upstream (OpenAI SDK) failures into AppErrors with a
 * specific, user-facing message. Returns null when the error is not
 * recognised.
 */
export function toUpstreamAppError(error: unknown): AppError | null {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
        return new AppError(
            "The AI service timed out. Please try again.",
            504
        );
    }

    if (error instanceof OpenAI.APIConnectionError) {
        return new AppError(
            "Could not reach the AI service. Check the server's internet connection and try again.",
            502
        );
    }

    if (error instanceof OpenAI.RateLimitError) {
        // 429 covers both request rate limits and an exhausted quota/billing.
        return error.code === "insufficient_quota"
            ? new AppError(
                "The OpenAI account has no remaining quota. Check billing for the API key.",
                429
            )
            : new AppError(
                "The AI service is busy. Please try again shortly.",
                429
            );
    }

    if (error instanceof OpenAI.AuthenticationError) {
        return new AppError(
            "The OpenAI API key was rejected. Check OPENAI_API_KEY on the server.",
            503
        );
    }

    if (error instanceof OpenAI.PermissionDeniedError) {
        return new AppError(
            `The OpenAI API key is not allowed to make this request: ${shortMessage(error)}`,
            503
        );
    }

    if (error instanceof OpenAI.NotFoundError) {
        return new AppError(
            `The AI model or resource was not found (check OPENAI_MODEL): ${shortMessage(error)}`,
            503
        );
    }

    if (error instanceof OpenAI.APIError) {
        // 400/422 from OpenAI means our request (e.g. JSON schema or a model
        // parameter) was rejected; 5xx is an OpenAI outage. Either way the
        // upstream message is the most useful thing to show.
        const status = error.status ?? 0;
        return new AppError(
            status >= 500
                ? "The AI service is temporarily unavailable. Please try again."
                : `The AI service rejected the request: ${shortMessage(error)}`,
            502
        );
    }

    return toDatabaseAppError(error);
}

/** Maps common PostgreSQL / connection failures to actionable messages. */
function toDatabaseAppError(error: unknown): AppError | null {
    if (!(error instanceof Error)) return null;
    const code = (error as Error & { code?: unknown }).code;

    if (code === "42P01" || code === "42703") {
        return new AppError(
            "The database schema is out of date. Run `npm run db:migrate` on the server.",
            503
        );
    }

    if (
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "28P01" ||
        code === "3D000" ||
        /connection terminated|timeout exceeded when trying to connect/i.test(error.message)
    ) {
        return new AppError(
            "The database is unavailable. Check DATABASE_URL and that PostgreSQL is running.",
            503
        );
    }

    return null;
}

/** Structured details of any error for server logs (never sent to clients). */
export function describeError(error: unknown): Record<string, unknown> {
    if (error instanceof OpenAI.APIError) {
        return {
            kind: `OpenAI.${error.constructor.name}`,
            status: error.status,
            message: error.message,
            code: error.code,
            type: error.type,
            param: error.param,
            openaiRequestId: error.requestID,
            body: error.error,
            cause: error.cause instanceof Error ? error.cause.message : undefined
        };
    }

    if (error instanceof AppError) {
        return { kind: error.name, status: error.status, message: error.message };
    }

    if (error instanceof Error) {
        const extra = error as Error & { code?: unknown; detail?: unknown };
        return {
            kind: error.name,
            message: error.message,
            code: extra.code,
            detail: extra.detail,
            stack: error.stack
        };
    }

    return { kind: typeof error, value: String(error) };
}

/** Logs an error with the request ID and full details to stderr. */
export function logServerError(
    context: string,
    requestId: unknown,
    error: unknown
): void {
    console.error(
        `[${context}] request=${String(requestId ?? "unknown")} ` +
        JSON.stringify(describeError(error), null, 2)
    );
}
