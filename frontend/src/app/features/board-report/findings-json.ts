import { AiInsight } from '../../core/models/ai-insight.model';
import { FinancialDocument } from '../../core/models/document.model';
import { FinancialPeriod } from '../../core/models/financial-period.model';
import { periodKind } from '../../shared/utils/period-kind';
import { sortPeriodsChronologically } from '../../shared/utils/period-sort';
import { boardReportFileName } from './board-report';
import { companyReportFileName } from './company-report';

/**
 * Annualflow "financial findings" JSON export.
 *
 * Bump SCHEMA_VERSION on any breaking change to the shape below.
 * Every figure/metric key is always present; null means "not reported or not calculable".
 */
export const FINDINGS_SCHEMA_VERSION = '1.0';

export const FIGURE_KEYS = [
  'revenue', 'grossProfit', 'operatingProfit', 'ebitda', 'netProfit', 'cash', 'debt',
  'customers', 'netAssets', 'operatingCashFlow', 'totalAssets', 'totalLiabilities', 'eps'
] as const;

export const DERIVED_KEYS = [
  'grossMargin', 'operatingMargin', 'ebitdaMargin', 'netMargin', 'operatingCashFlowMargin',
  'cashToDebtRatio', 'netCash', 'revenuePerCustomer', 'roce', 'debtServiceCoverageRatio',
  'cashConversion', 'returnOnEquity', 'returnOnAssets', 'debtToEquity', 'liabilitiesToAssets'
] as const;

export const CHANGE_KEYS = [
  'revenueGrowth', 'grossProfitGrowth', 'operatingProfitGrowth', 'ebitdaGrowth', 'netProfitGrowth',
  'cashGrowth', 'debtGrowth', 'customerGrowth', 'netAssetGrowth', 'operatingCashFlowGrowth',
  'totalAssetsGrowth', 'totalLiabilitiesGrowth', 'epsGrowth'
] as const;

export interface FindingsPeriodInput {
  financialPeriod: FinancialPeriod;
  /** Label of the period the comparison was made against (like-for-like prior year if stored). */
  comparedWith: { period: string; label: string } | null;
  insight: AiInsight | null;
}

export interface FindingsInput {
  scope: 'period' | 'allPeriods';
  companyId: number;
  companyName: string;
  periods: FindingsPeriodInput[];
  documents: FinancialDocument[];
  generatedAt: Date;
}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function pick(source: object | undefined, keys: readonly string[]): Record<string, number | null> {
  const record = (source ?? {}) as Record<string, unknown>;
  return Object.fromEntries(keys.map(key => [key, num(record[key])]));
}

/** Builds the documented export object (pure; no network). */
export function buildFindings(input: FindingsInput) {
  const sorted = sortPeriodsChronologically(
    input.periods.map(p => ({ ...p, period: p.financialPeriod.financials.period, periodEnd: p.financialPeriod.financials.periodEnd }))
  );
  const exportedPeriods = new Set(sorted.map(p => p.period));
  const documents = [...input.documents]
    .filter(d => d.companyId === input.companyId)
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? -1 : 1));
  const currencies = [...new Set(documents.map(d => d.currency).filter((c): c is string => !!c))];

  return {
    schemaVersion: FINDINGS_SCHEMA_VERSION,
    generator: 'Annualflow',
    generatedAt: input.generatedAt.toISOString(),
    scope: input.scope,
    notes: {
      currency: currencies.length
        ? `Monetary values are in ${currencies.join(' / ')} as reported in the source documents.`
        : 'Monetary values are in the reporting currency of the source documents (not stated).',
      units:
        'Monetary values are absolute amounts (not thousands or millions). Margins, growth and other ' +
        'percentages are in percent units (14.1 means 14.1%). Ratios are plain numbers. eps is per share.',
      nulls: 'null means the figure was not reported, or the metric could not be calculated.',
      derived: 'figures are extracted from the documents; derived metrics and changes are calculated by Annualflow.',
      aiInsight: 'aiInsight is the cached AI commentary for the period, if one was generated. It is not financial advice.'
    },
    company: { id: input.companyId, name: input.companyName, currencies },
    periods: sorted.map(({ financialPeriod, comparedWith, insight, period }) => {
      const f = financialPeriod.financials;
      const sources = documents.filter(d => d.periods.some(p => p.period === period));
      return {
        period,
        label: f.periodLabel || period,
        periodEnd: f.periodEnd,
        kind: periodKind(period),
        figures: pick(f, FIGURE_KEYS),
        derived: pick(financialPeriod.metrics, DERIVED_KEYS),
        comparison: comparedWith && financialPeriod.comparison
          ? {
              against: comparedWith.period,
              againstLabel: comparedWith.label,
              likeForLike: comparedWith.period.replace(/\d{4}$/, '') === period.replace(/\d{4}$/, ''),
              changePercent: pick(financialPeriod.comparison, CHANGE_KEYS)
            }
          : null,
        enrichment: {
          sourceDocumentCount: f.sourceDocumentCount ?? sources.length,
          enriched: (f.sourceDocumentCount ?? sources.length) > 1,
          sourceDocumentIds: sources.map(d => d.documentId)
        },
        aiInsight: insight
          ? { model: insight.model, generatedAt: insight.generatedAt, content: insight.content }
          : null
      };
    }),
    sourceDocuments: documents
      .filter(d => input.scope === 'allPeriods' || d.periods.some(p => exportedPeriods.has(p.period)))
      .map(d => ({
        documentId: d.documentId,
        name: d.reportName,
        type: d.reportType,
        reportDate: d.reportDate,
        currency: d.currency,
        uploadedAt: d.uploadedAt,
        sha256: d.documentHash ?? null,
        source: d.source,
        periods: d.periods.map(p => p.period)
      })),
    enrichment: {
      description:
        'Data Enrichment: uploads that cover an already-stored period update that one record instead of ' +
        'creating a duplicate. New figures fill gaps or replace values; missing figures never erase stored ones.',
      conflicts: null,
      conflictsNote: 'Value conflicts are reported at upload time and are not stored, so they are not included here.'
    }
  };
}

export type FindingsExport = ReturnType<typeof buildFindings>;

/** annualflow-<Company>_<Period>.json or annualflow-<Company>_All_Periods.json. */
export function findingsFileName(companyName: string, period: string | null): string {
  const pdfName = period ? boardReportFileName(companyName, period) : companyReportFileName(companyName);
  return pdfName.replace(/\.pdf$/, '.json');
}

export function findingsToJson(findings: FindingsExport): string {
  return `${JSON.stringify(findings, null, 2)}\n`;
}
