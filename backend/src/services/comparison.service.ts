import { FinancialPeriod } from "../utils/report-validator";

export interface FinancialComparison {
    revenueGrowth: number | null;
    grossProfitGrowth: number | null;
    operatingProfitGrowth: number | null;
    ebitdaGrowth: number | null;
    netProfitGrowth: number | null;
    cashGrowth: number | null;
    debtGrowth: number | null;
    customerGrowth: number | null;
    netAssetGrowth: number | null;
<<<<<<< HEAD
=======
    operatingCashFlowGrowth: number | null;
    totalAssetsGrowth: number | null;
    totalLiabilitiesGrowth: number | null;
    epsGrowth: number | null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
}

export function compareFinancialPeriods( current: FinancialPeriod, previous: FinancialPeriod): FinancialComparison {
    // Compare the main financial figures between the two periods
    return {
        revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
        grossProfitGrowth: calculateGrowth(current.grossProfit, previous.grossProfit),
        operatingProfitGrowth: calculateGrowth(
            current.operatingProfit,
            previous.operatingProfit
        ),
        ebitdaGrowth: calculateGrowth(current.ebitda, previous.ebitda),
        netProfitGrowth: calculateGrowth(current.netProfit, previous.netProfit),
        cashGrowth: calculateGrowth(current.cash, previous.cash),
        debtGrowth: calculateGrowth(current.debt, previous.debt),
        customerGrowth: calculateGrowth(current.customers, previous.customers),
<<<<<<< HEAD
        netAssetGrowth: calculateGrowth(current.netAssets, previous.netAssets)
=======
        netAssetGrowth: calculateGrowth(current.netAssets, previous.netAssets),
        operatingCashFlowGrowth: calculateGrowth(
            current.operatingCashFlow,
            previous.operatingCashFlow
        ),
        totalAssetsGrowth: calculateGrowth(current.totalAssets, previous.totalAssets),
        totalLiabilitiesGrowth: calculateGrowth(
            current.totalLiabilities,
            previous.totalLiabilities
        ),
        epsGrowth: calculateGrowth(current.eps, previous.eps)
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    };
}

// Returns the percentage change from the previous period
function calculateGrowth(
    current: number | null,
    previous: number | null
): number | null {
    if (current === null || previous === null || previous === 0) {
        return null;
    }

    const growth = ((current - previous) / previous) * 100;

    return roundToTwoDecimals(growth);
}

// Keeps calculated values consistent across the report
function roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}