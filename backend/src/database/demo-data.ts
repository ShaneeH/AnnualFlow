/**
 * FICTIONAL demo dataset for "Northwind Analytics plc".
 * Northwind Analytics plc is not a real company; every figure is made up
 * for demonstrating Report Hub. Source figures are in EUR thousands and are
 * stored here as full EUR (x1000), matching how extracted reports are stored.
 * EPS (per share) and customer counts are not scaled.
 */

export const DEMO_COMPANY_NAME = "Northwind Analytics plc";
export const DEMO_DOCUMENT_HASH = "demo:northwind-analytics-plc:v1";
export const DEMO_REPORT_NAME = "Northwind Analytics plc - Annual Report 2025 (FICTIONAL DEMO DATA)";
export const DEMO_SOURCE = "Fictional demo dataset generated for Report Hub (not a real company)";

export interface DemoPeriod {
    period: string;
    periodLabel: string;
    periodEnd: string;
    revenue: number | null;
    grossProfit: number | null;
    operatingProfit: number | null;
    ebitda: number | null;
    netProfit: number | null;
    eps: number | null;
    cash: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    netAssets: number | null;
    operatingCashFlow: number | null;
    customers: number | null;
}

const k = (thousands: number | null) => (thousands === null ? null : thousands * 1000);

function annual(
    period: string, periodEnd: string,
    v: { revenue: number; gp: number; op: number; ebitda: number; np: number; eps: number;
        cash: number; assets: number; liabilities: number; equity: number; ocf: number; customers: number }
): DemoPeriod {
    return {
        period,
        periodLabel: `Full Year ${period.slice(2)}`,
        periodEnd,
        revenue: k(v.revenue),
        grossProfit: k(v.gp),
        operatingProfit: k(v.op),
        ebitda: k(v.ebitda),
        netProfit: k(v.np),
        eps: v.eps,
        cash: k(v.cash),
        totalAssets: k(v.assets),
        totalLiabilities: k(v.liabilities),
        netAssets: k(v.equity),
        operatingCashFlow: k(v.ocf),
        customers: v.customers
    };
}

function quarter(
    q: 1 | 2 | 3 | 4, periodEnd: string,
    v: { revenue: number; gp: number; op: number; np: number; ocf: number; customers: number }
): DemoPeriod {
    return {
        period: `Q${q}_2025`,
        periodLabel: `Q${q} 2025`,
        periodEnd,
        revenue: k(v.revenue),
        grossProfit: k(v.gp),
        operatingProfit: k(v.op),
        ebitda: null,
        netProfit: k(v.np),
        eps: null,
        cash: null,
        totalAssets: null,
        totalLiabilities: null,
        netAssets: null,
        operatingCashFlow: k(v.ocf),
        customers: v.customers
    };
}

export const DEMO_PERIODS: DemoPeriod[] = [
    annual("FY2024", "2024-12-31", {
        revenue: 210_700, gp: 122_206, op: 30_876, ebitda: 43_100, np: 24_446, eps: 0.61,
        cash: 48_900, assets: 276_800, liabilities: 133_500, equity: 143_300, ocf: 38_200, customers: 3_540
    }),
    annual("FY2025", "2025-12-31", {
        revenue: 248_600, gp: 149_160, op: 44_200, ebitda: 58_900, np: 35_140, eps: 0.88,
        cash: 62_300, assets: 312_400, liabilities: 141_700, equity: 170_700, ocf: 51_800, customers: 4_120
    }),
    quarter(1, "2025-03-31", { revenue: 57_200, gp: 33_700, op: 9_300, np: 7_300, ocf: 11_200, customers: 3_690 }),
    quarter(2, "2025-06-30", { revenue: 60_400, gp: 36_100, op: 10_600, np: 8_400, ocf: 12_500, customers: 3_850 }),
    quarter(3, "2025-09-30", { revenue: 63_100, gp: 38_000, op: 11_400, np: 9_100, ocf: 13_300, customers: 3_990 }),
    quarter(4, "2025-12-31", { revenue: 67_900, gp: 41_360, op: 12_900, np: 10_340, ocf: 14_800, customers: 4_120 })
];
