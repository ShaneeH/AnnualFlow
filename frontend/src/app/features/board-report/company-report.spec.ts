import { AiInsight } from '../../core/models/ai-insight.model';
import { FinancialDocument } from '../../core/models/document.model';
import { HistoryPeriod } from '../../core/models/history-period.model';
import {
  buildCompanyReportPdf,
  CompanyReportData,
  companyReportFileName,
  splitHistoryByKind,
  yearOverYear
} from './company-report';
import { PDF_OPTIONS } from './board-report';

function row(overrides: Partial<HistoryPeriod>): HistoryPeriod {
  return {
    period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31', revenue: null, grossProfit: null,
    operatingProfit: null, ebitda: null, netProfit: null, cash: null, debt: null, customers: null,
    netAssets: null, operatingCashFlow: null, totalAssets: null, totalLiabilities: null, eps: null,
    grossMargin: null, operatingMargin: null, ebitdaMargin: null, netMargin: null, ...overrides
  };
}

const history = [
  row({ period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31', revenue: 248_600_000, netProfit: 20_000_000, netMargin: 8.05 }),
  row({ period: 'Q1_2025', periodLabel: 'Q1 2025', periodEnd: '2025-03-31', revenue: 60_000_000 }),
  row({ period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31', revenue: 200_000_000, netProfit: 25_000_000 }),
  row({ period: 'H1_2025', periodLabel: 'H1 2025', periodEnd: '2025-06-30', revenue: 120_000_000 })
];

const document: FinancialDocument = {
  documentId: 1, companyId: 1, companyName: 'Northwind Analytics plc', reportName: 'Annual Report FY2025',
  reportType: 'Annual Report', reportDate: '2025-12-31', currency: 'EUR', source: null,
  uploadedAt: '2026-10-01T10:00:00Z',
  periods: [{ periodId: 1, period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31' }]
};

const insight: AiInsight = {
  companyId: 1, period: 'FY2025', model: 'gpt-test', generatedAt: '2026-10-12T00:00:00Z',
  content: {
    performanceSummary: 'Revenue grew strongly.', marketFactors: ['Demand held up.'],
    economicPoliticalFactors: [], socialFactors: [], improvements: ['Improve cash conversion.'], risks: ['Watch costs.']
  }
};

function data(overrides: Partial<CompanyReportData> = {}): CompanyReportData {
  return {
    companyName: 'Northwind Analytics plc', history, documents: [document],
    insights: { FY2025: insight }, generatedAt: new Date('2026-10-12T09:00:00Z'), ...overrides
  };
}

const RAW = { ...PDF_OPTIONS, compress: false };

describe('company report', () => {
  it('builds annualflow-<Company>_All_Periods.pdf', () => {
    expect(companyReportFileName('Northwind Analytics plc')).toBe('annualflow-Northwind_Analytics_plc_All_Periods.pdf');
    expect(companyReportFileName('Société / Générale')).toBe('annualflow-Societe_Generale_All_Periods.pdf');
  });

  it('keeps annual, quarterly and other periods apart, oldest first', () => {
    const split = splitHistoryByKind(history);
    expect(split.annual.map(r => r.period)).toEqual(['FY2024', 'FY2025']);
    expect(split.quarterly.map(r => r.period)).toEqual(['Q1_2025']);
    expect(split.other.map(r => r.period)).toEqual(['H1_2025']);
  });

  it('computes like-for-like year-over-year changes', () => {
    const yoy = yearOverYear(history);
    expect(yoy).toHaveLength(1);
    expect(yoy[0].period).toBe('FY2025');
    expect(yoy[0].changes[0]).toBeCloseTo(24.3, 1);
    expect(yoy[0].changes[2]).toBeCloseTo(-20, 5);
    expect(yoy[0].changes[3]).toBeNull();
  });

  it('renders title, summary, separate tables, YoY, insights, sources and disclaimer', async () => {
    const doc = await buildCompanyReportPdf(data(), { annual: [], quarterly: [] }, RAW);
    const raw = doc.output();

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    for (const text of [
      'Company Report', 'Northwind Analytics plc', 'All reporting periods', 'Summary', 'Key figures',
      'Annual', 'Quarterly', 'Other periods', '248.6m', 'Year-over-year changes', '+24.3%', '-20.0%',
      'Insights by period', 'Revenue grew strongly.', 'Source documents', 'Annual Report FY2025',
      'not financial advice'
    ]) {
      expect(raw).toContain(text);
    }
  });

  it('omits insights when none are cached and handles an empty company', async () => {
    const raw = (await buildCompanyReportPdf(data({ insights: {} }), { annual: [], quarterly: [] }, RAW)).output();
    expect(raw).not.toContain('Insights by period');

    const empty = (await buildCompanyReportPdf(data({ history: [], documents: [], insights: {} }), { annual: [], quarterly: [] }, RAW)).output();
    expect(empty).toContain('No financial periods are stored');
  });
});
