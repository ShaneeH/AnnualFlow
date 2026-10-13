import { FinancialDocument } from '../../core/models/document.model';
import {
  buildFindings,
  DERIVED_KEYS,
  FIGURE_KEYS,
  FINDINGS_SCHEMA_VERSION,
  findingsFileName,
  findingsToJson
} from './findings-json';

const fp = (period: string, periodEnd: string, revenue: number | null, extra: object = {}) => ({
  financials: { companyId: 1, companyName: 'Northwind Analytics plc', period, periodLabel: period.replace('_', ' '), periodEnd, revenue, netProfit: 10, cash: null, sourceDocumentCount: 2 },
  metrics: { netMargin: 12.5, grossMargin: null },
  ...extra
}) as any;

const doc: FinancialDocument = {
  documentId: 7, companyId: 1, companyName: 'Northwind Analytics plc', reportName: 'Annual Report FY2025',
  reportType: 'Annual Report', reportDate: '2025-12-31', currency: 'EUR', source: null,
  uploadedAt: '2026-10-01T10:00:00Z', documentHash: 'abc123',
  periods: [{ periodId: 1, period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31' }]
};
const other = { ...doc, documentId: 8, companyId: 2, companyName: 'Other' };

function build(scope: 'period' | 'allPeriods' = 'allPeriods') {
  return buildFindings({
    scope, companyId: 1, companyName: 'Northwind Analytics plc', documents: [doc, other],
    generatedAt: new Date('2026-10-12T02:00:00Z'),
    periods: [
      { financialPeriod: fp('FY2025', '2025-12-31', 248_600_000, { comparison: { revenueGrowth: 18 } }), comparedWith: { period: 'FY2024', label: 'Full Year 2024' }, insight: null },
      { financialPeriod: fp('FY2024', '2024-12-31', 210_700_000), comparedWith: null, insight: {
        companyId: 1, period: 'FY2024', model: 'gpt-test', generatedAt: '2026-10-01T00:00:00Z',
        content: { performanceSummary: 'Solid.', marketFactors: [], economicPoliticalFactors: [], socialFactors: [], improvements: [], risks: [] }
      } }
    ]
  });
}

describe('findings JSON export', () => {
  it('names files annualflow-<Company>_<Period|All_Periods>.json', () => {
    expect(findingsFileName('Northwind Analytics plc', 'FY2025')).toBe('annualflow-Northwind_Analytics_plc_FY2025.json');
    expect(findingsFileName('Northwind Analytics plc', null)).toBe('annualflow-Northwind_Analytics_plc_All_Periods.json');
  });

  it('documents the schema and lists periods oldest first with every key present (null when missing)', () => {
    const json = build();
    expect(json.schemaVersion).toBe(FINDINGS_SCHEMA_VERSION);
    expect(json.generatedAt).toBe('2026-10-12T02:00:00.000Z');
    expect(json.notes.currency).toContain('EUR');
    expect(json.periods.map(p => p.period)).toEqual(['FY2024', 'FY2025']);
    const fy25 = json.periods[1];
    expect(Object.keys(fy25.figures)).toEqual([...FIGURE_KEYS]);
    expect(Object.keys(fy25.derived)).toEqual([...DERIVED_KEYS]);
    expect(fy25.figures['cash']).toBeNull();
    expect(fy25.derived['netMargin']).toBe(12.5);
    expect(fy25.comparison?.likeForLike).toBe(true);
    expect(fy25.comparison?.changePercent['revenueGrowth']).toBe(18);
    expect(fy25.comparison?.changePercent['epsGrowth']).toBeNull();
    expect(fy25.enrichment).toEqual({ sourceDocumentCount: 2, enriched: true, sourceDocumentIds: [7] });
  });

  it('includes cached insights, source documents with hash, and only this company', () => {
    const json = build();
    expect(json.periods[0].aiInsight?.content.performanceSummary).toBe('Solid.');
    expect(json.periods[1].aiInsight).toBeNull();
    expect(json.sourceDocuments).toEqual([expect.objectContaining({ documentId: 7, sha256: 'abc123', periods: ['FY2025'] })]);
    expect(json.enrichment.conflicts).toBeNull();
    expect(JSON.parse(findingsToJson(json)).scope).toBe('allPeriods');
  });
});
