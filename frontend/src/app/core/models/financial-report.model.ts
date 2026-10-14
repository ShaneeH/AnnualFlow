import { FinancialReportPeriod } from "./financial-report-period.model";

export interface DocumentClassification {

    isFinancialReport: boolean;

    documentType: string;

    confidence: number;

    reason: string;

}

export interface FinancialReport {

    classification?: DocumentClassification;

    company: string;

    reportName: string;

    reportType: string;

    reportDate: string | null;

    currency: string | null;

    source: string | null;

    periods: FinancialReportPeriod[];

}