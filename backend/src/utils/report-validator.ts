import { ReportValidationError } from "./errors";

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
}

export interface FinancialReport {
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
    "netAssets"
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
        netAssets: null
    };

    for (const key of METRIC_KEYS) {
        result[key] = nullableMetric(value[key], key);
    }

    return result;
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

    const reportType = requiredString(parsed.reportType, "report type", 80);
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
        throw new ReportValidationError(`The extracted report type '${reportType}' is unsupported.`);
    }

    const currency = nullableString(parsed.currency, "currency", 3);
    if (currency !== null && !/^[A-Z]{3}$/.test(currency)) {
        throw new ReportValidationError("The extracted currency must be a three-letter uppercase code.");
    }

    if (!Array.isArray(parsed.periods) || parsed.periods.length === 0) {
        throw new ReportValidationError("No financial reporting periods were found in the uploaded PDF.");
    }
    if (parsed.periods.length > 40) {
        throw new ReportValidationError("The document contains too many reporting periods.");
    }

    const periods = parsed.periods.map(validatePeriod);
    const uniquePeriods = new Set(periods.map(period => period.period));
    if (uniquePeriods.size !== periods.length) {
        throw new ReportValidationError("The analysis returned duplicate reporting periods.");
    }

    return {
        company: requiredString(parsed.company, "company", 255),
        reportName: requiredString(parsed.reportName, "report name", 300),
        reportType: reportType as ReportType,
        reportDate: nullableDate(parsed.reportDate, "report date"),
        currency,
        source: nullableString(parsed.source, "source", 500),
        periods
    };
}
