import { FinancialReport } from "./financial-report.model";

export interface PeriodConflict {
    period: string;
    field: string;
    previousValue: number | string | null;
    newValue: number | string | null;
}

export interface UploadReportResponse {

    success: boolean;

    documentId: number;

    message: string;

    uploadedPdfId: string;

    documentHash: string;

    report: FinancialReport;

    // Figures on existing periods that this upload overwrote.
    conflicts?: PeriodConflict[];

}