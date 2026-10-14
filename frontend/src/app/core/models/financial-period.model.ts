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
    operatingCashFlowGrowth?: number | null;
    totalAssetsGrowth?: number | null;
    totalLiabilitiesGrowth?: number | null;
    epsGrowth?: number | null;
}

export interface FinancialPeriod {

    financials: {
        companyId: number;
        companyName: string;
        period: string;
        periodLabel: string;
        periodEnd: string | null;

        revenue: number | null;
        grossProfit: number | null;
        operatingProfit: number | null;
        ebitda: number | null;
        netProfit: number | null;
        cash: number | null;
        debt: number | null;
        customers: number | null;
        netAssets: number | null;
        operatingCashFlow?: number | null;
        totalAssets?: number | null;
        totalLiabilities?: number | null;
        eps?: number | null;

        // Data Enrichment: number of documents merged into this period record.
        sourceDocumentCount?: number;
    };

    metrics: {
        grossMargin: number | null;
        operatingMargin: number | null;
        ebitdaMargin: number | null;
        netMargin: number | null;
        cashToDebtRatio: number | null;
        netCash: number | null;
        revenuePerCustomer: number | null;
        roce: number | null;
        debtServiceCoverageRatio: number | null;
        operatingCashFlowMargin?: number | null;
        cashConversion?: number | null;
        returnOnEquity?: number | null;
        returnOnAssets?: number | null;
        debtToEquity?: number | null;
        liabilitiesToAssets?: number | null;
    };

    comparison?: FinancialComparison;
}