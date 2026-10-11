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

/**
 * Converts known upstream (OpenAI SDK) failures into AppErrors.
 * Returns null when the error is not recognised.
 */
export function toUpstreamAppError(error: unknown): AppError | null {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
        return new AppError(
            "The document analysis service timed out. Please try again.",
            504
        );
    }

    if (error instanceof OpenAI.RateLimitError) {
        return new AppError(
            "The document analysis service is busy. Please try again shortly.",
            429
        );
    }

    return null;
}
