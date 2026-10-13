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

<<<<<<< HEAD
=======
    operatingCashFlow: number | null;

    totalAssets: number | null;

    totalLiabilities: number | null;

    eps: number | null;

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
}