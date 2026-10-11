export interface FinancialReportPeriod {

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

    operatingCashFlow: number | null;

    totalAssets: number | null;

    totalLiabilities: number | null;

    eps: number | null;

}