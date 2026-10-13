import type { Workbook, Worksheet } from 'exceljs';

import { CHANGE_KEYS, DERIVED_KEYS, FIGURE_KEYS, FindingsExport, findingsFileName } from './findings-json';

/** Excel (.xlsx) version of the findings export. Same data as the JSON export, one sheet per section. */

const PERCENT_KEYS = new Set<string>([
  'grossMargin', 'operatingMargin', 'ebitdaMargin', 'netMargin', 'operatingCashFlowMargin',
  'roce', 'cashConversion', 'returnOnEquity', 'returnOnAssets'
]);
const COUNT_KEYS = new Set<string>(['customers']);
const RATIO_KEYS = new Set<string>(['cashToDebtRatio', 'debtServiceCoverageRatio', 'debtToEquity', 'liabilitiesToAssets', 'eps']);

/** Values are already in percent units (14.1 = 14.1%), so the format appends a literal % sign. */
function numberFormat(key: string): string {
  if (PERCENT_KEYS.has(key) || (CHANGE_KEYS as readonly string[]).includes(key)) return '0.0"%"';
  if (COUNT_KEYS.has(key)) return '#,##0';
  if (RATIO_KEYS.has(key)) return '0.00';
  return '#,##0';
}

/** "operatingCashFlow" -> "Operating cash flow". */
export function humanize(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1)
    .replace(/\broce\b/, 'ROCE').replace(/\bebitda\b/, 'EBITDA').replace(/\beps\b/, 'EPS');
}

function styleHeader(sheet: Worksheet): void {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function fillWorkbook(workbook: Workbook, findings: FindingsExport): void {
  workbook.creator = 'Annualflow';
  workbook.created = new Date(findings.generatedAt);
  const periods = findings.periods;

  // Summary: one row per figure/metric, one column per period.
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Section', key: 'section', width: 14 },
    ...periods.map((p, i) => ({ header: p.label, key: `p${i}`, width: 16 }))
  ];
  const sections: [string, readonly string[], (p: FindingsExport['periods'][number]) => Record<string, number | null> | undefined][] = [
    ['Figure', FIGURE_KEYS, p => p.figures],
    ['Derived', DERIVED_KEYS, p => p.derived],
    ['Change %', CHANGE_KEYS, p => p.comparison?.changePercent]
  ];
  for (const [section, keys, get] of sections) {
    for (const key of keys) {
      const row = summary.addRow({ metric: humanize(key), section });
      periods.forEach((p, i) => {
        const cell = row.getCell(i + 3);
        const value = get(p)?.[key];
        cell.value = value ?? null;
        cell.numFmt = numberFormat(key);
      });
    }
  }
  styleHeader(summary);

  // Periods: one row per period, figures and derived metrics as columns.
  const byPeriod = workbook.addWorksheet('Periods');
  const metricKeys = [...FIGURE_KEYS, ...DERIVED_KEYS];
  byPeriod.columns = [
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Label', key: 'label', width: 18 },
    { header: 'Period end', key: 'periodEnd', width: 13 },
    { header: 'Kind', key: 'kind', width: 10 },
    { header: 'Compared with', key: 'against', width: 15 },
    { header: 'Source documents', key: 'sources', width: 17 },
    ...metricKeys.map(key => ({ header: humanize(key), key, width: Math.max(14, humanize(key).length + 2) }))
  ];
  for (const p of periods) {
    const row = byPeriod.addRow({
      period: p.period,
      label: p.label,
      periodEnd: p.periodEnd ?? null,
      kind: p.kind,
      against: p.comparison?.againstLabel ?? null,
      sources: p.enrichment.sourceDocumentCount,
      ...p.figures,
      ...p.derived
    });
    for (const key of metricKeys) row.getCell(key).numFmt = numberFormat(key);
  }
  styleHeader(byPeriod);

  // Documents: source documents behind the exported periods.
  const docs = workbook.addWorksheet('Documents');
  docs.columns = [
    { header: 'ID', key: 'documentId', width: 8 },
    { header: 'Name', key: 'name', width: 40 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Report date', key: 'reportDate', width: 13 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Uploaded', key: 'uploadedAt', width: 22 },
    { header: 'Periods', key: 'periods', width: 24 },
    { header: 'Source', key: 'source', width: 14 },
    { header: 'SHA-256', key: 'sha256', width: 66 }
  ];
  for (const d of findings.sourceDocuments) {
    docs.addRow({ ...d, source: typeof d.source === 'string' ? d.source : JSON.stringify(d.source ?? null), periods: d.periods.join(', ') });
  }
  styleHeader(docs);

  // Notes: the same units/currency notes as the JSON export.
  const notes = workbook.addWorksheet('Notes');
  notes.columns = [{ header: 'Note', key: 'k', width: 14 }, { header: 'Detail', key: 'v', width: 110 }];
  notes.addRow({ k: 'Company', v: findings.company.name });
  notes.addRow({ k: 'Generated', v: findings.generatedAt });
  for (const [k, v] of Object.entries(findings.notes)) notes.addRow({ k: humanize(k), v });
  styleHeader(notes);
}

export function findingsXlsxFileName(companyName: string, period: string | null): string {
  return findingsFileName(companyName, period).replace(/\.json$/, '.xlsx');
}

/** Lazy-loads exceljs so it is only downloaded when someone exports to Excel. */
export async function findingsToXlsx(findings: FindingsExport): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  fillWorkbook(workbook, findings);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
