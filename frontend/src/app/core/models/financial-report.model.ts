import { FinancialReportPeriod } from "./financial-report-period.model";

<<<<<<< HEAD
export interface FinancialReport {

=======
export interface DocumentClassification {

    isFinancialReport: boolean;

    documentType: string;

    confidence: number;

    reason: string;

}

export interface FinancialReport {

    classification?: DocumentClassification;

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    company: string;

    reportName: string;

    reportType: string;

    reportDate: string | null;

    currency: string | null;

    source: string | null;

    periods: FinancialReportPeriod[];

}