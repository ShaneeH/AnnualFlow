import { AiInsight } from '../../core/models/ai-insight.model';
import { HistoryPeriod } from '../../core/models/history-period.model';
import { boardReportChartConfigs } from './board-report-charts';
import {
  BoardReportData,
  boardReportFileName,
  buildBoardReportPdf,
  findPreviousPeriod,
  formatChange,
  splitKpis
} from './board-report';

const financialPeriod = {
  financials: {
    companyId: 1, companyName: 'WWE', period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31',
    revenue: 1_800_000_000, grossProfit: null, operatingProfit: 410_000_000, ebitda: null,
    netProfit: 330_000_000, cash: 650_000_000, debt: 420_000_000, customers: 8_500_000, netAssets: 1_400_000_000
  },
  metrics: {
    grossMargin: null, operatingMargin: 22.78, ebitdaMargin: null, netMargin: 18.33,
    cashToDebtRatio: 1.55, netCash: 230_000_000, revenuePerCustomer: 211.76, roce: null,
    debtServiceCoverageRatio: null, debtToEquity: 0.3
  },
  comparison: { revenueGrowth: 5.2, netProfitGrowth: -3.1 } as any
} as any;

const insight: AiInsight = {
  companyId: 1, period: 'FY2025', model: 'gpt-test', generatedAt: '2026-10-12T00:00:00Z',
  content: {
    performanceSummary: 'Revenue reached 1.8bn.',
    marketFactors: ['Live events demand may have helped.'],
    economicPoliticalFactors: ['Rates could affect spending.'],
    socialFactors: ['Streaming habits may matter.'],
    improvements: ['Improve cash conversion.'],
    risks: ['Watch leverage.']
  }
};

function data(overrides: Partial<BoardReportData> = {}): BoardReportData {
  return {
    companyName: 'WWE', period: 'FY2025', periodLabel: 'FY 2025', previousPeriodLabel: 'FY 2024',
    financialPeriod, history: [], insight, generatedAt: new Date('2026-10-12T09:00:00Z'),
    ...overrides
  };
}

function row(overrides: Partial<HistoryPeriod>): HistoryPeriod {
  return {
    period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31', revenue: null, grossProfit: null,
    operatingProfit: null, ebitda: null, netProfit: null, cash: null, debt: null, customers: null,
    netAssets: null, operatingCashFlow: null, totalAssets: null, totalLiabilities: null, eps: null,
    grossMargin: null, operatingMargin: null, ebitdaMargin: null, netMargin: null, ...overrides
  };
}

describe('board report', () => {
  it('builds a safe ReportHub_<Company>_<Period>.pdf file name', () => {
    expect(boardReportFileName('WWE', 'FY2025')).toBe('ReportHub_WWE_FY2025.pdf');
    expect(boardReportFileName('Société Générale / plc', 'Q1_2025'))
      .toBe('ReportHub_Societe_Generale_plc_Q1_2025.pdf');
  });

  it('chooses the like-for-like previous period, else the closest earlier one', () => {
    const periods = [
      { period: 'FY2025', periodEnd: '2025-12-31' },
      { period: 'H1_2025', periodEnd: '2025-06-30' },
      { period: 'FY2024', periodEnd: '2024-12-31' }
    ];
    expect(findPreviousPeriod(periods, 'FY2025')).toBe('FY2024');
    expect(findPreviousPeriod(periods, 'H1_2025')).toBe('FY2024');
    expect(findPreviousPeriod(periods, 'FY2024')).toBeNull();
  });

  it('splits headline KPIs (with change) from margins and ratios, skipping missing data', () => {
    const { headline, ratios } = splitKpis(financialPeriod);

    expect(headline.map(c => c.title)).toContain('Revenue');
    expect(headline.map(c => c.title)).not.toContain('Gross Profit');
    expect(headline.find(c => c.title === 'Revenue')?.change).toBe(5.2);
    expect(ratios.map(c => c.title)).toEqual(['Operating Margin', 'Net Margin', 'Debt to Equity']);
    expect(formatChange(-3.14)).toBe('▼ 3.1%');
    expect(formatChange(null)).toBe('—');
  });

  it('only includes charts that have data', () => {
    expect(boardReportChartConfigs([])).toEqual([]);

    const titles = boardReportChartConfigs([
      row({ revenue: 100, netMargin: 10 }),
      row({ period: 'FY2025', periodLabel: 'FY 2025', revenue: 120 })
    ]).map(c => c.title);

    expect(titles).toEqual(['Revenue', 'Profit margins (%)']);
  });

  it('renders title page, KPIs, ratios, the AI insight and the disclaimer', async () => {
    const doc = await buildBoardReportPdf(data(), []);
    const raw = doc.output();

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    for (const text of [
      'Board Report', 'WWE', 'Reporting period: FY 2025', 'Compared with: FY 2024',
      'Key figures', 'Change vs FY 2024', 'Revenue', '+5.2%', 'Margins & ratios',
      'AI Insight', 'Performance summary', 'Risks to watch', 'not financial advice'
    ]) {
      expect(raw).toContain(text);
    }
  });

  it('omits the AI insight section when none is cached', async () => {
    const raw = (await buildBoardReportPdf(data({ insight: null, previousPeriodLabel: null }), [])).output();

    expect(raw).not.toContain('AI Insight');
    expect(raw).not.toContain('Compared with');
    expect(raw).toContain('not financial advice');
  });
});
