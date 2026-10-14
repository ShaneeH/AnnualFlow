import { FinancialPeriod } from "../utils/report-validator";

export interface FinancialMetrics {
    grossMargin: number | null;
    operatingMargin: number | null;
    ebitdaMargin: number | null;
    netMargin: number | null;
    cashToDebtRatio: number | null;
    netCash: number | null;
    revenuePerCustomer: number | null;
    roce: number | null;
    debtServiceCoverageRatio: number | null;
    operatingCashFlowMargin: number | null;
    cashConversion: number | null;
    returnOnEquity: number | null;
    returnOnAssets: number | null;
    debtToEquity: number | null;
    liabilitiesToAssets: number | null;
}

type MetricInput = Pick<
    FinancialPeriod,
    | "revenue"
    | "grossProfit"
    | "operatingProfit"
    | "ebitda"
    | "netProfit"
    | "cash"
    | "debt"
    | "customers"
    | "netAssets"
> & Partial<Pick<
    FinancialPeriod,
    "operatingCashFlow" | "totalAssets" | "totalLiabilities"
>>;

export function calculateFinancialMetrics(
    period: MetricInput
): FinancialMetrics {
    const operatingCashFlow = period.operatingCashFlow ?? null;
    const totalAssets = period.totalAssets ?? null;
    const totalLiabilities = period.totalLiabilities ?? null;
    // Ratios on negative equity are not meaningful, so only use positive equity.
    const positiveEquity =
        period.netAssets !== null && period.netAssets > 0 ? period.netAssets : null;

    return {
        grossMargin: calculatePercentage(period.grossProfit, period.revenue),
        operatingMargin: calculatePercentage(period.operatingProfit, period.revenue),
        ebitdaMargin: calculatePercentage(period.ebitda, period.revenue),
        netMargin: calculatePercentage(period.netProfit, period.revenue),

        cashToDebtRatio: calculateRatio(period.cash, period.debt),
        netCash: calculateDifference(period.cash, period.debt),

        revenuePerCustomer: calculateRatio(period.revenue, period.customers),

        // These need more financial data before they can be calculated
        roce: null,
        debtServiceCoverageRatio: null,

        // All derived deterministically here from extracted figures; the AI is
        // instructed never to calculate these itself.
        operatingCashFlowMargin: calculatePercentage(operatingCashFlow, period.revenue),
        cashConversion: calculateRatio(operatingCashFlow, period.netProfit),
        returnOnEquity: calculatePercentage(period.netProfit, positiveEquity),
        returnOnAssets: calculatePercentage(period.netProfit, totalAssets),
        debtToEquity: calculateRatio(period.debt, positiveEquity),
        liabilitiesToAssets: calculatePercentage(totalLiabilities, totalAssets)
    };
}

export interface PeriodMargins {
    grossMargin: number | null;
    operatingMargin: number | null;
    ebitdaMargin: number | null;
    netMargin: number | null;
}

/** Margins only, used for the history charts. */
export function calculateMargins(period: MetricInput): PeriodMargins {
    const { grossMargin, operatingMargin, ebitdaMargin, netMargin } =
        calculateFinancialMetrics(period);

    return { grossMargin, operatingMargin, ebitdaMargin, netMargin };
}

function calculatePercentage(
    numerator: number | null,
    denominator: number | null
): number | null {
    if (numerator === null || denominator === null || denominator === 0) {
        return null;
    }

    return roundToTwoDecimals((numerator / denominator) * 100);
}

function calculateRatio(
    numerator: number | null,
    denominator: number | null
): number | null {
    if (numerator === null || denominator === null || denominator === 0) {
        return null;
    }

    return roundToTwoDecimals(numerator / denominator);
}

function calculateDifference(
    firstValue: number | null,
    secondValue: number | null
): number | null {
    if (firstValue === null || secondValue === null) {
        return null;
    }

    return roundToTwoDecimals(firstValue - secondValue);
}

function roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}