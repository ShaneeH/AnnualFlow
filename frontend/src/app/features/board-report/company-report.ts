import { AiInsight } from '../../core/models/ai-insight.model';
import { FinancialDocument } from '../../core/models/document.model';
import { HistoryPeriod } from '../../core/models/history-period.model';
import { INSIGHT_DISCLAIMER, INSIGHT_SECTIONS } from '../../shared/components/ai-insight/ai-insight';
import {
  EMPTY_VALUE,
  formatChange,
  formatCount,
  formatMoney,
  formatPercent,
  formatPerShare
} from '../../shared/utils/number-format';
import { periodKind, PERIOD_KIND_LABELS } from '../../shared/utils/period-kind';
import { sortPeriodsChronologically } from '../../shared/utils/period-sort';
import { addChartImage, BoardReportChart, drawMascot, PDF_OPTIONS } from './board-report';

/** Everything needed to render the all-periods company report. */
export interface CompanyReportData {
  companyName: string;
  /** Every stored period with its figures (from /history). */
  history: HistoryPeriod[];
  /** Source documents that belong to this company. */
  documents: FinancialDocument[];
  /** Cached AI insights by period code (only those that exist). */
  insights: Record<string, AiInsight>;
  generatedAt: Date;
}

export interface CompanyReportCharts {
  annual: BoardReportChart[];
  quarterly: BoardReportChart[];
}

/** annualflow-<Company>_All_Periods.pdf with a filesystem-safe company part. */
export function companyReportFileName(companyName: string): string {
  const safe = companyName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Unknown';
  return `annualflow-${safe}_All_Periods.pdf`;
}

/** Splits history into annual / quarterly / other, each oldest first. */
export function splitHistoryByKind(history: readonly HistoryPeriod[]): {
  annual: HistoryPeriod[];
  quarterly: HistoryPeriod[];
  other: HistoryPeriod[];
} {
  const sorted = sortPeriodsChronologically(history);
  return {
    annual: sorted.filter(row => periodKind(row.period) === 'annual'),
    quarterly: sorted.filter(row => periodKind(row.period) === 'quarterly'),
    other: sorted.filter(row => periodKind(row.period) === 'other')
  };
}

export const FIGURE_COLUMNS: ReadonlyArray<{ title: string; format: (row: HistoryPeriod) => string }> = [
  { title: 'Revenue', format: r => formatMoney(r.revenue) },
  { title: 'Op. profit', format: r => formatMoney(r.operatingProfit) },
  { title: 'Net profit', format: r => formatMoney(r.netProfit) },
  { title: 'Net margin', format: r => formatPercent(r.netMargin) },
  { title: 'Cash flow', format: r => formatMoney(r.operatingCashFlow) },
  { title: 'Cash', format: r => formatMoney(r.cash) },
  { title: 'Debt', format: r => formatMoney(r.debt) }
];

const CHANGE_METRICS = [
  { title: 'Revenue', key: 'revenue' },
  { title: 'Op. profit', key: 'operatingProfit' },
  { title: 'Net profit', key: 'netProfit' },
  { title: 'Cash', key: 'cash' },
  { title: 'Customers', key: 'customers' }
] as const;

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface YearOverYearRow {
  period: string;
  periodLabel: string;
  previousLabel: string;
  changes: Array<number | null>;
}

/**
 * Like-for-like change versus the same period one year earlier
 * (FY2025 vs FY2024, Q2_2025 vs Q2_2024). Periods with no prior-year match are skipped.
 */
export function yearOverYear(history: readonly HistoryPeriod[]): YearOverYearRow[] {
  const byPeriod = new Map(history.map(row => [row.period, row]));
  const rows: YearOverYearRow[] = [];

  for (const row of sortPeriodsChronologically(history)) {
    const match = /^(.*?)(\d{4})$/.exec(row.period);
    if (!match) continue;
    const previous = byPeriod.get(`${match[1]}${Number(match[2]) - 1}`);
    if (!previous) continue;
    rows.push({
      period: row.period,
      periodLabel: row.periodLabel,
      previousLabel: previous.periodLabel,
      changes: CHANGE_METRICS.map(m => percentChange(row[m.key], previous[m.key]))
    });
  }
  return rows;
}

// ---------------------------------------------------------------- PDF ----

type JsPdf = import('jspdf').jsPDF;

const BRAND = { r: 0, g: 166, b: 255 };
const INK = 30;
const MUTED = 110;
const PAGE = { width: 210, height: 297, margin: 18 };

/** Builds the all-periods company PDF (does not save it). */
export async function buildCompanyReportPdf(
  data: CompanyReportData,
  charts: CompanyReportCharts,
  /** Tests pass compress: false to read the text streams. */
  pdfOptions: { unit: 'mm'; format: 'a4'; compress: boolean } = PDF_OPTIONS
): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF(pdfOptions);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const bottom = PAGE.height - PAGE.margin - 10;
  let y = PAGE.margin;

  const ensureSpace = (height: number) => {
    if (y + height > bottom) {
      doc.addPage();
      y = PAGE.margin + 4;
    }
  };

  const heading = (text: string, newPage = false) => {
    if (newPage) {
      doc.addPage();
      y = PAGE.margin + 4;
    }
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(INK);
    doc.text(text, PAGE.margin, y);
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.6);
    doc.line(PAGE.margin, y + 2, PAGE.margin + 18, y + 2);
    y += 9;
  };

  const subheading = (text: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(text, PAGE.margin, y);
    y += 6;
  };

  const paragraph = (text: string, size = 10, colour = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(colour);
    for (const line of doc.splitTextToSize(text, contentWidth) as string[]) {
      ensureSpace(6);
      doc.text(line, PAGE.margin, y);
      y += size * 0.45;
    }
  };

  /** Generic table: first column left-aligned, the rest right-aligned. */
  const table = (
    headers: string[],
    rows: string[][],
    widths: number[],
    options: { changeColumns?: boolean; fontSize?: number; leftColumns?: number } = {}
  ) => {
    const rowHeight = 7;
    const fontSize = options.fontSize ?? 9;
    const leftColumns = options.leftColumns ?? 1;
    const cellX = (x: number, i: number) => (i < leftColumns ? x + 2 : x + widths[i] - 2);
    const align = (i: number) => (i < leftColumns ? 'left' : 'right') as 'left' | 'right';
    const fit = (text: string, i: number) => {
      const max = widths[i] - 3;
      if (doc.getTextWidth(text) <= max) return text;
      let t = text;
      while (t.length > 1 && doc.getTextWidth(`${t}...`) > max) t = t.slice(0, -1);
      return `${t}...`;
    };

    const drawHeader = () => {
      doc.setFillColor(240, 247, 252);
      doc.rect(PAGE.margin, y - 5, contentWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize - 0.5);
      doc.setTextColor(MUTED);
      let x = PAGE.margin;
      headers.forEach((header, i) => {
        doc.text(fit(header, i), cellX(x, i), y, { align: align(i) });
        x += widths[i];
      });
      y += rowHeight;
    };

    ensureSpace(rowHeight * 2);
    drawHeader();

    rows.forEach((row, index) => {
      if (y + rowHeight > bottom) {
        doc.addPage();
        y = PAGE.margin + 5;
        drawHeader();
      }
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(PAGE.margin, y - 5, contentWidth, rowHeight, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      let x = PAGE.margin;
      row.forEach((cell, i) => {
        if (options.changeColumns && i >= leftColumns && cell !== EMPTY_VALUE) {
          const up = cell.startsWith('+');
          doc.setTextColor(up ? 22 : 200, up ? 140 : 40, up ? 70 : 40);
        } else {
          doc.setTextColor(INK);
        }
        doc.text(fit(cell, i), cellX(x, i), y, { align: align(i) });
        x += widths[i];
      });
      y += rowHeight;
    });
    y += 5;
  };

  const { annual, quarterly, other } = splitHistoryByKind(data.history);
  const allPeriods = [...annual, ...quarterly, ...other];
  const documents = [...data.documents].sort((a, b) => (a.uploadedAt < b.uploadedAt ? -1 : 1));
  const insightPeriods = allPeriods.filter(row => data.insights[row.period]);
  const firstLast = (rows: HistoryPeriod[]) =>
    rows.length ? `${rows[0].periodLabel} – ${rows[rows.length - 1].periodLabel}` : '';

  // ---- Title page
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE.width, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  drawMascot(doc, PAGE.margin, 22, 12);
  doc.text('ANNUALFLOW', PAGE.margin, 40);
  doc.setFontSize(30);
  doc.setTextColor(INK);
  doc.text('Company Report', PAGE.margin, 58);
  doc.setFontSize(20);
  const nameLines = doc.splitTextToSize(data.companyName, contentWidth) as string[];
  doc.text(nameLines, PAGE.margin, 76);
  let ty = 76 + nameLines.length * 9 + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(MUTED);
  doc.text('All reporting periods', PAGE.margin, ty);
  ty += 8;
  doc.setFontSize(11);
  const coverage = [
    `${allPeriods.length} ${allPeriods.length === 1 ? 'period' : 'periods'} from ${documents.length} source ${documents.length === 1 ? 'document' : 'documents'}`,
    annual.length ? `Annual: ${firstLast(annual)}` : '',
    quarterly.length ? `Quarterly: ${firstLast(quarterly)}` : ''
  ].filter(Boolean);
  for (const line of coverage) {
    doc.text(line, PAGE.margin, ty);
    ty += 6;
  }
  doc.text(
    `Generated ${data.generatedAt.toLocaleString('en-IE', { dateStyle: 'long', timeStyle: 'short' })}`,
    PAGE.margin,
    PAGE.height - 30
  );
  doc.setFontSize(9);
  doc.text('Figures are extracted from the uploaded reports; ratios are calculated by Annualflow.', PAGE.margin, PAGE.height - 24);

  // ---- Summary of periods
  doc.addPage();
  y = PAGE.margin + 4;
  heading('Summary');
  if (allPeriods.length) {
    const sourcesFor = (period: string) =>
      documents.filter(d => d.periods.some(p => p.period === period)).length;
    table(
      ['Period', 'Type', 'Period end', 'Sources', 'Insights'],
      allPeriods.map(row => [
        row.periodLabel,
        PERIOD_KIND_LABELS[periodKind(row.period)],
        row.periodEnd ? new Date(row.periodEnd).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : EMPTY_VALUE,
        String(sourcesFor(row.period)),
        data.insights[row.period] ? 'Yes' : EMPTY_VALUE
      ]),
      [56, 34, 34, 25, contentWidth - 149],
      { leftColumns: 2 }
    );
  } else {
    paragraph('No financial periods are stored for this company yet.', 10, MUTED);
  }

  // ---- Figures tables (annual, quarterly, other kept separate)
  const widths = [contentWidth - 7 * 20, ...Array(7).fill(20)];
  const figuresTable = (title: string, rows: HistoryPeriod[]) => {
    if (!rows.length) return;
    subheading(title);
    table(
      ['Period', ...FIGURE_COLUMNS.map(c => c.title)],
      rows.map(row => [row.periodLabel, ...FIGURE_COLUMNS.map(c => c.format(row))]),
      widths,
      { fontSize: 8.5 }
    );
  };
  if (allPeriods.length) {
    heading('Key figures');
    figuresTable('Annual', annual);
    figuresTable('Quarterly', quarterly);
    figuresTable('Other periods', other);

    const extras = allPeriods.filter(r => r.customers !== null || r.eps !== null);
    if (extras.length) {
      subheading('Customers & earnings per share');
      table(
        ['Period', 'Customers', 'EPS', 'Gross margin', 'Op. margin'],
        extras.map(r => [r.periodLabel, formatCount(r.customers), formatPerShare(r.eps), formatPercent(r.grossMargin), formatPercent(r.operatingMargin)]),
        [contentWidth - 4 * 30, 30, 30, 30, 30],
        { fontSize: 8.5 }
      );
    }
  }

  // ---- Year-over-year changes
  const yoy = yearOverYear(data.history);
  if (yoy.length) {
    heading('Year-over-year changes');
    table(
      ['Period', 'vs', ...CHANGE_METRICS.map(m => m.title)],
      yoy.map(r => [r.periodLabel, r.previousLabel, ...r.changes.map(c => formatChange(c))]),
      [32, 32, ...Array(5).fill((contentWidth - 64) / 5)],
      { changeColumns: true, fontSize: 8.5, leftColumns: 2 }
    );
  }

  // ---- Charts (annual and quarterly never mixed)
  const chartGroup = (label: string, group: BoardReportChart[]) => {
    for (const chart of group) {
      const height = contentWidth * 0.45;
      ensureSpace(height + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(MUTED);
      doc.text(`${chart.title} · ${label}`, PAGE.margin, y);
      y += 3;
      addChartImage(doc, chart.image, PAGE.margin, y, contentWidth, height);
      y += height + 8;
    }
  };
  if (charts.annual.length || charts.quarterly.length) {
    heading('Performance over time', true);
    chartGroup('Annual', charts.annual);
    chartGroup('Quarterly', charts.quarterly);
  }

  // ---- Cached AI insights (never generated here)
  if (insightPeriods.length) {
    heading('Insights by period', true);
    for (const row of insightPeriods) {
      const content = data.insights[row.period].content;
      ensureSpace(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      doc.text(row.periodLabel, PAGE.margin, y);
      y += 6;
      subheading('Performance summary');
      paragraph(content.performanceSummary, 10, 60);
      y += 2;
      for (const section of INSIGHT_SECTIONS) {
        if (content[section.key].length) {
          subheading(section.title);
          content[section.key].forEach(point => paragraph(`• ${point}`, 10, 60));
          y += 2;
        }
      }
      y += 4;
    }
  }

  // ---- Source documents
  if (documents.length) {
    heading('Source documents');
    table(
      ['Report', 'Type', 'Periods', 'Uploaded'],
      documents.map(d => [
        d.reportName,
        d.reportType,
        d.periods.map(p => p.period.replace('_', ' ')).join(', ') || EMPTY_VALUE,
        new Date(d.uploadedAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
      ]),
      [70, 32, 44, contentWidth - 146],
      { fontSize: 8.5, leftColumns: 3 }
    );
  }

  // ---- Disclaimer + footers
  y += 2;
  paragraph(
    `${INSIGHT_DISCLAIMER} This report is for information only and is not financial advice.`,
    8.5,
    MUTED
  );

  const pages = doc.getNumberOfPages();
  for (let page = 2; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`Annualflow · ${data.companyName} · All periods`, PAGE.margin, PAGE.height - 10);
    doc.text(`Page ${page} of ${pages} · Not financial advice`, PAGE.width - PAGE.margin, PAGE.height - 10, { align: 'right' });
  }

  return doc;
}
