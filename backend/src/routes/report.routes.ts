import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";

import {
    deleteFinancialDocument,
    DuplicateDocumentError,
    getDocumentById,
    getDocuments,
    getDocumentStats
} from "../services/documents.service";
import {
    createReportCsv,
    createReportJson,
    createReportPdf,
    getReportExportFilename
} from "../services/report-export.service";
import { deletePDF } from "../services/openai.service";
import {
    defaultReportProcessingDeps,
    processReportUpload
} from "../services/report-processing.service";
import {
    exportLimiter,
    uploadLimiter
} from "../middleware/rate-limit";
import {
    maxPdfBytes,
    PdfUploadError,
    validatePdfUpload
} from "../utils/pdf-upload";
import { ProcessingIndicator } from "../utils/processing-indicator";
import { analysePrompt } from "../utils/prompts";
import {
    AppError,
    NotFinancialReportError,
    ServiceConfigError,
    logServerError,
    toUpstreamAppError
} from "../utils/errors";
import { parseAndValidateReport } from "../utils/report-validator";

const router = Router();
const MAX_ID = 2_147_483_647;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: maxPdfBytes,
        files: 1,
        fields: 5,
        parts: 6
    },
    fileFilter(_req, file, callback) {
        if (
            file.mimetype !== "application/pdf" ||
            !file.originalname.toLowerCase().endsWith(".pdf")
        ) {
            callback(new PdfUploadError("Only PDF documents are accepted."));
            return;
        }

        callback(null, true);
    }
});

function parsePositiveInteger(value: unknown): number | null {
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text !== "string" || !/^\d+$/.test(text)) return null;

    const parsed = Number(text);
    return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= MAX_ID
        ? parsed
        : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text !== "string" || !/^\d+$/.test(text)) return null;

    const parsed = Number(text);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sendError(
    res: Response,
    status: number,
    error: string
) {
    return res.status(status).json({
        success: false,
        error,
        requestId: res.locals.requestId
    });
}

function logRouteError(
    res: Response,
    context: string,
    error: unknown
): void {
    logServerError(`reports] [${context}`, res.locals.requestId, error);
}

/**
 * Maps any upload-processing failure to an HTTP status and a specific,
 * user-facing message. Exported for tests.
 */
export function uploadErrorResponse(error: unknown): {
    status: number;
    body: { error: string; code?: string };
} {
    if (error instanceof DuplicateDocumentError) {
        return { status: 409, body: { error: error.message, code: "DUPLICATE_DOCUMENT" } };
    }

    if (error instanceof PdfUploadError) {
        return { status: error.status, body: { error: error.message } };
    }

    if (error instanceof NotFinancialReportError) {
        return { status: 422, body: { error: error.message, code: "NOT_FINANCIAL_REPORT" } };
    }

    if (error instanceof ServiceConfigError) {
        return {
            status: 503,
            body: { error: "The document analysis service is not configured (OPENAI_API_KEY is missing)." }
        };
    }

    const appError = error instanceof AppError ? error : toUpstreamAppError(error);
    if (appError) {
        return { status: appError.status, body: { error: appError.message } };
    }

    return {
        status: 500,
        body: {
            error: "The document could not be processed due to an unexpected server error. " +
                "The server log has the details for this request ID."
        }
    };
}

function uploadSinglePdf(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    upload.single("file")(req, res, error => {
        if (!error) {
            next();
            return;
        }

        if (error instanceof multer.MulterError) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
            const messages: Partial<Record<multer.MulterError["code"], string>> = {
                LIMIT_FILE_SIZE: `The PDF exceeds the ${Math.round(maxPdfBytes / 1024 / 1024)} MB limit.`,
                LIMIT_FILE_COUNT: "Only one PDF can be uploaded at a time.",
                LIMIT_UNEXPECTED_FILE: "The PDF must be sent using the form field named file.",
                LIMIT_FIELD_COUNT: "The upload contains too many form fields.",
                LIMIT_PART_COUNT: "The upload contains too many multipart sections."
            };
            const message = messages[error.code] ??
                `The PDF upload could not be accepted (${error.code}).`;

            console.warn(
                `[reports] upload rejected request=${res.locals.requestId} code=${error.code}`
            );
            sendError(res, status, message);
            return;
        }

        if (error instanceof PdfUploadError) {
            sendError(res, error.status, error.message);
            return;
        }

        next(error);
    });
}

router.get("/", async (req, res) => { const companyId = req.query.companyId === undefined
        ? undefined
        : parsePositiveInteger(req.query.companyId);
    const limit = req.query.limit === undefined
        ? undefined
        : parsePositiveInteger(req.query.limit);
    const offset = req.query.offset === undefined
        ? undefined
        : parseNonNegativeInteger(req.query.offset);

    if (req.query.companyId !== undefined && companyId === null) {
        return sendError(res, 400, "Invalid companyId query parameter.");
    }
    if (req.query.limit !== undefined && limit === null) {
        return sendError(res, 400, "Invalid limit query parameter.");
    }
    if (req.query.offset !== undefined && offset === null) {
        return sendError(res, 400, "Invalid offset query parameter.");
    }

    try {
        return res.json(await getDocuments({
            companyId: companyId ?? undefined,
            limit: limit ?? undefined,
            offset: offset ?? undefined
        }));
    } catch (error) {
        logRouteError(res, "list failed", error);
        return sendError(res, 500, "Failed to retrieve documents.");
    }
});

router.get("/stats", async (_req, res) => {
    try {
        return res.json(await getDocumentStats());
    } catch (error) {
        logRouteError(res, "stats failed", error);
        return sendError(res, 500, "Failed to retrieve document statistics.");
    }
});

router.get("/:documentId", async (req, res) => {
    const documentId = parsePositiveInteger(req.params.documentId);
    if (documentId === null) {
        return sendError(res, 400, "Invalid document ID.");
    }

    try {
        const document = await getDocumentById(documentId);
        return document
            ? res.json(document)
            : sendError(res, 404, "Document not found.");
    } catch (error) {
        logRouteError(res, "detail failed", error);
        return sendError(res, 500, "Failed to retrieve the document.");
    }
});

router.get("/:documentId/export.pdf", exportLimiter, async (req, res) => {
    const documentId = parsePositiveInteger(req.params.documentId);
    if (documentId === null) {
        return sendError(res, 400, "Invalid document ID.");
    }

    try {
        const document = await getDocumentById(documentId);
        if (!document) return sendError(res, 404, "Document not found.");

        const pdf = createReportPdf(document);
        const filename = getReportExportFilename(document, "pdf");

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdf.length);
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(pdf);
    } catch (error) {
        logRouteError(res, "PDF export failed", error);
        return sendError(res, 500, "Failed to export the document as PDF.");
    }
});

router.get("/:documentId/export.csv", exportLimiter, async (req, res) => {
    const documentId = parsePositiveInteger(req.params.documentId);
    if (documentId === null) {
        return sendError(res, 400, "Invalid document ID.");
    }

    try {
        const document = await getDocumentById(documentId);
        if (!document) return sendError(res, 404, "Document not found.");

        const csv = createReportCsv(document);
        const filename = getReportExportFilename(document, "csv");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(csv);
    } catch (error) {
        logRouteError(res, "CSV export failed", error);
        return sendError(res, 500, "Failed to export the document as CSV.");
    }
});

router.get("/:documentId/export.json", exportLimiter, async (req, res) => {
    const documentId = parsePositiveInteger(req.params.documentId);
    if (documentId === null) {
        return sendError(res, 400, "Invalid document ID.");
    }

    try {
        const document = await getDocumentById(documentId);
        if (!document) return sendError(res, 404, "Document not found.");

        const json = createReportJson(document);
        const filename = getReportExportFilename(document, "json");

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(json);
    } catch (error) {
        logRouteError(res, "JSON export failed", error);
        return sendError(res, 500, "Failed to export the document as JSON.");
    }
});

router.post(
    "/add",
    uploadLimiter,
    uploadSinglePdf,
    async (req, res) => {
        const progress = new ProcessingIndicator(
            String(res.locals.requestId ?? "unknown")
        );

        try {
            if (!req.file) {
                return sendError(res, 400, "No PDF uploaded.");
            }

            progress.start("Validating PDF");
            validatePdfUpload(req.file);

            const result = await processReportUpload(
                req.file.buffer,
                req.file.originalname,
                defaultReportProcessingDeps,
                stage => progress.update(stage)
            );

            progress.succeed(`Saved ${result.report.reportName}`);

            return res.status(201).json({
                success: true,
                message: "The PDF was successfully uploaded and analysed.",
                ...result
            });
        } catch (error) {
            progress.fail("Document processing failed");

            if (
                !(error instanceof DuplicateDocumentError) &&
                !(error instanceof PdfUploadError)
            ) {
                logRouteError(
                    res,
                    error instanceof NotFinancialReportError
                        ? "rejected non-financial document"
                        : "processing failed",
                    error
                );
            }

            const { status, body } = uploadErrorResponse(error);
            return res.status(status).json({
                success: false,
                ...body,
                requestId: res.locals.requestId
            });
        }
    }
);

router.delete("/:documentId", async (req, res) => {
    const documentId = parsePositiveInteger(req.params.documentId);
    if (documentId === null) {
        return sendError(res, 400, "Invalid document ID.");
    }

    try {
        const deleted = await deleteFinancialDocument(documentId);
        if (!deleted) {
            return sendError(res, 404, "Document not found.");
        }

        if (deleted.openaiFileId) {
            await deletePDF(deleted.openaiFileId);
        }

        return res.json({
            success: true,
            message: `${deleted.reportName} was deleted successfully.`,
            documentId: deleted.documentId
        });
    } catch (error) {
        logRouteError(res, "delete failed", error);
        return sendError(res, 500, "Failed to delete the document.");
    }
});

export default router;
