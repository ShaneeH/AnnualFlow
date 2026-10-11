import { generateDocumentHash } from "../utils/document-hash";
import { analysePrompt } from "../utils/prompts";
import { FinancialReport, parseAndValidateReport } from "../utils/report-validator";
import {
    documentExistsByHash,
    DuplicateDocumentError,
    PeriodConflict,
    saveFinancialDocument,
    SavedDocumentResult
} from "./documents.service";
import { analysePDF, deletePDF, uploadPDF } from "./openai.service";

/** External effects used while processing an upload (injectable for tests). */
export interface ReportProcessingDeps {
    documentExistsByHash(hash: string): Promise<boolean>;
    uploadPDF(pdf: Buffer, originalName: string): Promise<string>;
    analysePDF(fileId: string, prompt: string): Promise<string>;
    deletePDF(fileId: string): Promise<boolean>;
    saveFinancialDocument(
        hash: string,
        fileId: string,
        report: FinancialReport
    ): Promise<SavedDocumentResult>;
}

export const defaultReportProcessingDeps: ReportProcessingDeps = {
    documentExistsByHash,
    uploadPDF,
    analysePDF,
    deletePDF,
    saveFinancialDocument
};

export interface ProcessedReport {
    documentId: number;
    uploadedPdfId: string;
    documentHash: string;
    report: FinancialReport;
    conflicts: PeriodConflict[];
}

export type ProcessingStage =
    | "Checking for duplicates"
    | "Uploading secure working copy"
    | "Extracting financial periods"
    | "Validating and saving results";

/**
 * Hash, de-duplicate, analyse and store one PDF.
 *
 * The AI output is fully validated (including the "is this a financial
 * report?" checks) BEFORE saveFinancialDocument is called, so nothing is
 * written to the database for a rejected document. On any failure the
 * working copy uploaded to OpenAI is deleted.
 */
export async function processReportUpload(
    pdf: Buffer,
    originalName: string,
    deps: ReportProcessingDeps = defaultReportProcessingDeps,
    onStage: (stage: ProcessingStage) => void = () => undefined
): Promise<ProcessedReport> {
    const documentHash = generateDocumentHash(pdf);

    onStage("Checking for duplicates");
    if (await deps.documentExistsByHash(documentHash)) {
        throw new DuplicateDocumentError();
    }

    let uploadedPdfId: string | null = null;

    try {
        onStage("Uploading secure working copy");
        uploadedPdfId = await deps.uploadPDF(pdf, originalName);

        onStage("Extracting financial periods");
        const aiResponse = await deps.analysePDF(uploadedPdfId, analysePrompt);

        onStage("Validating and saving results");
        const report = parseAndValidateReport(aiResponse);
        const { documentId, conflicts } = await deps.saveFinancialDocument(
            documentHash,
            uploadedPdfId,
            report
        );

        return { documentId, uploadedPdfId, documentHash, report, conflicts };
    } catch (error) {
        if (uploadedPdfId) {
            await deps.deletePDF(uploadedPdfId);
        }

        throw error;
    }
}
