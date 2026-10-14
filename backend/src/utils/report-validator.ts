import { NotFinancialReportError, ReportValidationError } from "./errors";

export const REPORT_TYPES = [
    "Annual Report",
    "Interim Report",
    "Half-Year Report",
    "Quarterly Report",
    "Trading Update",
    "Financial Statements",
    "Information Document",
    "Admission Document",
    "Prospectus",
    "Other"
] as const;

export type ReportType = typeof REPORT_TYPES[number];

/** What the AI thinks the uploaded document is. */
export const DOCUMENT_TYPES = [
    "Financial Report",
    "Financial Statements",
    "Investor Presentation",
    "CV / Resume",
    "Cover Letter",
    "Invoice / Receipt",
    "Bank Statement",
    "Payslip",
    "Contract / Legal",
    "Academic / Research",
    "Other Non-Financial"
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

/** Document types that may be stored. Everything else is rejected. */
export const FINANCIAL_DOCUMENT_TYPES: readonly DocumentType[] = [
    "Financial Report",
    "Financial Statements",
    "Investor Presentation"
];

/** Minimum AI confidence required to accept a document as a financial report. */
export const MIN_CLASSIFICATION_CONFIDENCE = 0.7;

export interface DocumentClassification {
    isFinancialReport: boolean;
    documentType: DocumentType;
    confidence: number;
    reason: string;
}

export interface FinancialPeriod {
    period: string;
    periodEnd: string | null;
    periodLabel: string;
    revenue: number | null;
    grossProfit: number | null;
    operatingProfit: number | null;
    ebitda: number | null;
    netProfit: number | null;
    cash: number | null;
    debt: number | null;
    customers: number | null;
    netAssets: number | null;
    operatingCashFlow: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    eps: number | null;
}

export interface FinancialReport {
    classification: DocumentClassification;
    company: string;
    reportName: string;
    reportType: ReportType;
    reportDate: string | null;
    currency: string | null;
    source: string | null;
    periods: FinancialPeriod[];
}

export const PERIOD_PATTERN = /^(?:FY\d{4}|(?:Q[1-4]|H[12]|YTD|M(?:3|6|9|12))_\d{4})$/;
const METRIC_KEYS = [
    "revenue",
    "grossProfit",
    "operatingProfit",
    "ebitda",
    "netProfit",
    "cash",
    "debt",
    "customers",
    "netAssets",
    "operatingCashFlow",
    "totalAssets",
    "totalLiabilities",
    "eps"
] as const;

type MetricKey = typeof METRIC_KEYS[number];

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(
    value: unknown,
    field: string,
    maxLength: number
): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new ReportValidationError(`The extracted ${field} is missing.`);
    }

    const trimmed = value.trim();

    if (trimmed.length > maxLength) {
        throw new ReportValidationError(`The extracted ${field} is too long.`);
    }

    return trimmed;
}

function nullableString(
    value: unknown,
    field: string,
    maxLength: number
): string | null {
    if (value === null) return null;
    if (typeof value !== "string") {
        throw new ReportValidationError(`The extracted ${field} is invalid.`);
    }

    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > maxLength) {
        throw new ReportValidationError(`The extracted ${field} is too long.`);
    }

    return trimmed;
}

function nullableDate(value: unknown, field: string): string | null {
    const date = nullableString(value, field, 10);
    if (date === null) return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ReportValidationError(`The extracted ${field} must use YYYY-MM-DD.`);
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new ReportValidationError(`The extracted ${field} is not a real date.`);
    }

    return date;
}

function nullableMetric(value: unknown, field: MetricKey): number | null {
    if (value === null) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ReportValidationError(`The extracted metric ${field} is invalid.`);
    }
    if (Math.abs(value) > 1e18) {
        throw new ReportValidationError(`The extracted metric ${field} is outside the supported range.`);
    }
    if (field === "customers" && value < 0) {
        throw new ReportValidationError("The extracted customer count cannot be negative.");
    }
    if (field === "customers" && !Number.isInteger(value)) {
        throw new ReportValidationError("The extracted customer count must be a whole number.");
    }

    return value;
}

function validatePeriod(value: unknown, index: number): FinancialPeriod {
    if (!isRecord(value)) {
        throw new ReportValidationError(`Financial period ${index + 1} is invalid.`);
    }

    const period = requiredString(value.period, "period", 32);
    if (!PERIOD_PATTERN.test(period)) {
        throw new ReportValidationError(`The extracted period '${period}' has an unsupported format.`);
    }

    const result: FinancialPeriod = {
        period,
        periodEnd: nullableDate(value.periodEnd, "period end"),
        periodLabel: requiredString(value.periodLabel, "period label", 120),
        revenue: null,
        grossProfit: null,
        operatingProfit: null,
        ebitda: null,
        netProfit: null,
        cash: null,
        debt: null,
        customers: null,
        netAssets: null,
        operatingCashFlow: null,
        totalAssets: null,
        totalLiabilities: null,
        eps: null
    };

    for (const key of METRIC_KEYS) {
        result[key] = nullableMetric(value[key], key);
    }

    return result;
}

function validateClassification(value: unknown): DocumentClassification {
    if (!isRecord(value)) {
        throw new NotFinancialReportError(
            "The document could not be classified, so it was not saved."
        );
    }

    const documentType = typeof value.documentType === "string"
        ? value.documentType.trim()
        : "";
    const confidence = value.confidence;
    const reason = typeof value.reason === "string"
        ? value.reason.trim().slice(0, 300)
        : "";

    if (
        typeof value.isFinancialReport !== "boolean" ||
        !DOCUMENT_TYPES.includes(documentType as DocumentType) ||
        typeof confidence !== "number" ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 1
    ) {
        throw new NotFinancialReportError(
            "The document could not be classified, so it was not saved."
        );
    }

    return {
        isFinancialReport: value.isFinancialReport,
        documentType: documentType as DocumentType,
        confidence,
        reason
    };
}

function assertIsFinancialDocument(classification: DocumentClassification): void {
    const detail = classification.reason ? ` ${classification.reason}` : "";

    if (
        !classification.isFinancialReport ||
        !FINANCIAL_DOCUMENT_TYPES.includes(classification.documentType)
    ) {
        throw new NotFinancialReportError(
            `This document does not look like a financial report ` +
            `(detected: ${classification.documentType}), so it was not saved.${detail}`
        );
    }

    if (classification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
        throw new NotFinancialReportError(
            "We could not confirm this is a financial report, so it was not saved." +
            detail
        );
    }
}

/** Monetary metrics that identify real financial statements. */
const CORE_METRICS = [
    "revenue",
    "grossProfit",
    "operatingProfit",
    "netProfit",
    "totalAssets",
    "operatingCashFlow",
    "netAssets"
] as const;

const MONETARY_METRICS = METRIC_KEYS.filter(
    key => key !== "customers" && key !== "eps"
);

/**
 * Deterministic checks that do not rely on the AI's own classification:
 * at least one period must carry at least two monetary figures, one of which
 * is a core statement figure, and the figures must be plausible.
 */
export function assertFinancialContent(periods: FinancialPeriod[]): void {
    const hasSubstantivePeriod = periods.some(period => {
        const monetaryCount = MONETARY_METRICS
            .filter(key => period[key] !== null).length;
        const hasCore = CORE_METRICS.some(key => period[key] !== null);

        return hasCore && monetaryCount >= 2;
    });

    if (!hasSubstantivePeriod) {
        throw new NotFinancialReportError(
            "No core financial figures (such as revenue, profit or total assets) " +
            "were found, so the document was not saved."
        );
    }

    for (const period of periods) {
        if (period.revenue !== null && period.revenue < 0) {
            throw new ReportValidationError(
                `The extracted revenue for ${period.period} is negative.`
            );
        }

        if (period.totalAssets !== null && period.totalAssets < 0) {
            throw new ReportValidationError(
                `The extracted total assets for ${period.period} are negative.`
            );
        }

        if (
            period.revenue !== null &&
            period.grossProfit !== null &&
            period.revenue > 0 &&
            period.grossProfit > period.revenue
        ) {
            throw new ReportValidationError(
                `The extracted gross profit for ${period.period} exceeds revenue.`
            );
        }
    }
}

export function parseAndValidateReport(aiResponse: string): FinancialReport {
    let parsed: unknown;

    try {
        parsed = JSON.parse(aiResponse);
    } catch {
        throw new ReportValidationError("The analysis service returned invalid JSON.");
    }

    if (!isRecord(parsed)) {
        throw new ReportValidationError("The analysis service returned an invalid report.");
    }

    // Classification is checked first: a non-financial document (e.g. a CV)
    // must be rejected before anything else is interpreted or stored.
    const classification = validateClassification(parsed.classification);
    assertIsFinancialDocument(classification);

    const reportType = requiredString(parsed.reportType, "report type", 80);
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
        throw new ReportValidationError(`The extracted report type '${reportType}' is unsupported.`);
    }

    const currency = nullableString(parsed.currency, "currency", 3);
    if (currency !== null && !/^[A-Z]{3}$/.test(currency)) {
        throw new ReportValidationError("The extracted currency must be a three-letter uppercase code.");
    }

    if (!Array.isArray(parsed.periods) || parsed.periods.length === 0) {
        throw new NotFinancialReportError("No financial reporting periods were found in the uploaded PDF.");
    }
    if (parsed.periods.length > 40) {
        throw new ReportValidationError("The document contains too many reporting periods.");
    }

    const periods = parsed.periods.map(validatePeriod);
    const uniquePeriods = new Set(periods.map(period => period.period));
    if (uniquePeriods.size !== periods.length) {
        throw new ReportValidationError("The analysis returned duplicate reporting periods.");
    }

    assertFinancialContent(periods);

    return {
        classification,
        company: requiredString(parsed.company, "company", 255),
        reportName: requiredString(parsed.reportName, "report name", 300),
        reportType: reportType as ReportType,
        reportDate: nullableDate(parsed.reportDate, "report date"),
        currency,
        source: nullableString(parsed.source, "source", 500),
        periods
    };
}
