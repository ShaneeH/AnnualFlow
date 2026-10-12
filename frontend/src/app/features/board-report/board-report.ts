import { AiInsight } from '../../core/models/ai-insight.model';
import { FinancialPeriod } from '../../core/models/financial-period.model';
import { HistoryPeriod } from '../../core/models/history-period.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format-pipe';
import { buildKpiCards, KpiCard } from '../dashboard/dashboard';
import { INSIGHT_DISCLAIMER, INSIGHT_SECTIONS } from '../../shared/components/ai-insight/ai-insight';

/** Everything needed to render one board report. */
export interface BoardReportData {
  companyName: string;
  period: string;
  periodLabel: string;
  previousPeriodLabel: string | null;
  financialPeriod: FinancialPeriod;
  history: HistoryPeriod[];
  insight: AiInsight | null;
  generatedAt: Date;
}

export interface BoardReportChart {
  title: string;
  /** PNG data URL. */
  image: string;
}

interface PeriodRef {
  period: string;
  periodEnd: string | null;
}

/**
 * Same rule as the backend insight service: like-for-like period one year
 * earlier (FY2025 -> FY2024) if present, else the closest earlier period.
 */
export function findPreviousPeriod(periods: PeriodRef[], target: string): string | null {
  const match = /^(.*?)(\d{4})$/.exec(target);
  if (match) {
    const likeForLike = `${match[1]}${Number(match[2]) - 1}`;
    if (periods.some(p => p.period === likeForLike)) return likeForLike;
  }

  const current = periods.find(p => p.period === target);
  if (!current?.periodEnd) return null;

  const earlier = periods
    .filter(p => p.period !== target && p.periodEnd && p.periodEnd < current.periodEnd!)
    .sort((a, b) => (a.periodEnd! < b.periodEnd! ? 1 : -1));

  return earlier[0]?.period ?? null;
}

/** ReportHub_<Company>_<Period>.pdf with filesystem-safe parts. */
export function boardReportFileName(companyName: string, period: string): string {
  const safe = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'Unknown';

  return `ReportHub_${safe(companyName)}_${safe(period)}.pdf`;
}

const currency = new CurrencyFormatPipe();

export function formatKpiValue(card: Pick<KpiCard, 'format' | 'value'>): string {
  switch (card.format) {
    case 'currency':
      return currency.transform(card.value);
    case 'percent':
      return `${card.value.toFixed(1)}%`;
    default:
      return card.value.toLocaleString('en-IE', { maximumFractionDigits: 2 });
  }
}

export function formatChange(change: number | null): string {
  if (change === null) return '—';
  return `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`;
}

/** Splits KPI cards into the headline table and the margins/ratios table. */
export function splitKpis(financialPeriod: FinancialPeriod): {
  headline: KpiCard[];
  ratios: KpiCard[];
} {
  const cards = buildKpiCards(financialPeriod);
  const isRatio = (card: KpiCard) => card.format === 'percent' || card.title === 'Debt to Equity';

  return {
    headline: cards.filter(card => !isRatio(card)),
    ratios: cards.filter(isRatio)
  };
}

// ---------------------------------------------------------------- PDF ----

type JsPdf = import('jspdf').jsPDF;

const BRAND = { r: 0, g: 166, b: 255 };
const INK = 30;
const MUTED = 110;
const PAGE = { width: 210, height: 297, margin: 18 };

/** Builds the PDF document (does not save it). */
export async function buildBoardReportPdf(
  data: BoardReportData,
  charts: BoardReportChart[]
): Promise<JsPdf> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentWidth = PAGE.width - PAGE.margin * 2;
  let y = PAGE.margin;

  const ensureSpace = (height: number) => {
    if (y + height > PAGE.height - PAGE.margin - 10) {
      doc.addPage();
      y = PAGE.margin;
    }
  };

  const heading = (text: string) => {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(INK);
    doc.text(text, PAGE.margin, y);
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.6);
    doc.line(PAGE.margin, y + 2, PAGE.margin + 18, y + 2);
    y += 9;
  };

  const paragraph = (text: string, size = 10, colour = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(colour);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, PAGE.margin, y);
      y += size * 0.45;
    }
  };

  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const rowHeight = 7;
    const drawHeader = () => {
      doc.setFillColor(240, 247, 252);
      doc.rect(PAGE.margin, y - 5, contentWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(MUTED);
      let x = PAGE.margin + 2;
      headers.forEach((header, i) => {
        doc.text(header, i === 0 ? x : x + widths[i] - 4, y, { align: i === 0 ? 'left' : 'right' });
        x += widths[i];
      });
      y += rowHeight;
    };

    ensureSpace(rowHeight * 2);
    drawHeader();

    rows.forEach((row, index) => {
      if (y + rowHeight > PAGE.height - PAGE.margin - 10) {
        doc.addPage();
        y = PAGE.margin + 5;
        drawHeader();
      }
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(PAGE.margin, y - 5, contentWidth, rowHeight, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let x = PAGE.margin + 2;
      row.forEach((cell, i) => {
        const isChange = i === 2 && cell !== '—';
        if (isChange) {
          doc.setTextColor(cell.startsWith('▲') ? 22 : 200, cell.startsWith('▲') ? 140 : 40, cell.startsWith('▲') ? 70 : 40);
        } else {
          doc.setTextColor(INK);
        }
        // Helvetica has no ▲▼ glyphs: use +/- in the PDF.
        const text = cell.replace('▲ ', '+').replace('▼ ', '-');
        doc.text(text, i === 0 ? x : x + widths[i] - 4, y, { align: i === 0 ? 'left' : 'right' });
        x += widths[i];
      });
      y += rowHeight;
    });
    y += 4;
  };

  // ---- Title page
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE.width, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text('REPORT HUB', PAGE.margin, 40);
  doc.setFontSize(30);
  doc.setTextColor(INK);
  doc.text('Board Report', PAGE.margin, 58);
  doc.setFontSize(20);
  doc.text(doc.splitTextToSize(data.companyName, contentWidth) as string[], PAGE.margin, 76);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(MUTED);
  doc.text(`Reporting period: ${data.periodLabel}`, PAGE.margin, 92);
  if (data.previousPeriodLabel) {
    doc.text(`Compared with: ${data.previousPeriodLabel}`, PAGE.margin, 100);
  }
  doc.setFontSize(11);
  doc.text(
    `Generated ${data.generatedAt.toLocaleString('en-IE', { dateStyle: 'long', timeStyle: 'short' })}`,
    PAGE.margin,
    PAGE.height - 30
  );
  doc.setFontSize(9);
  doc.text('Figures are extracted from the uploaded report; ratios are calculated by Report Hub.', PAGE.margin, PAGE.height - 24);

  // ---- KPI summary
  doc.addPage();
  y = PAGE.margin + 4;
  const { headline, ratios } = splitKpis(data.financialPeriod);
  const changeHeader = data.previousPeriodLabel ? `Change vs ${data.previousPeriodLabel}` : 'Change';

  heading('Key figures');
  if (headline.length) {
    table(
      ['Metric', data.periodLabel, changeHeader],
      headline.map(card => [card.title, formatKpiValue(card), formatChange(card.change)]),
      [80, 50, contentWidth - 130]
    );
  } else {
    paragraph('No financial figures were extracted for this period.', 10, MUTED);
  }

  if (ratios.length) {
    heading('Margins & ratios');
    table(
      ['Measure', data.periodLabel],
      ratios.map(card => [card.title, formatKpiValue(card)]),
      [110, contentWidth - 110]
    );
  }

  // ---- Charts (only those with data)
  if (charts.length) {
    heading('Performance over time');
    for (const chart of charts) {
      const height = contentWidth * 0.45;
      ensureSpace(height + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(MUTED);
      doc.text(chart.title, PAGE.margin, y);
      y += 3;
      doc.addImage(chart.image, 'PNG', PAGE.margin, y, contentWidth, height);
      y += height + 8;
    }
  }

  // ---- Cached AI insight (omitted if none)
  if (data.insight) {
    heading('AI Insight');
    const content = data.insight.content;
    const block = (title: string, body: string[]) => {
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(INK);
      doc.text(title, PAGE.margin, y);
      y += 6;
      body.forEach(text => paragraph(text, 10, 60));
      y += 3;
    };

    block('Performance summary', [content.performanceSummary]);
    for (const section of INSIGHT_SECTIONS) {
      if (content[section.key].length) {
        block(section.title, content[section.key].map(point => `• ${point}`));
      }
    }
  }

  // ---- Disclaimer + footers
  y += 4;
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
    doc.text(`Report Hub · ${data.companyName} · ${data.periodLabel}`, PAGE.margin, PAGE.height - 10);
    doc.text(`Page ${page} of ${pages} · Not financial advice`, PAGE.width - PAGE.margin, PAGE.height - 10, { align: 'right' });
  }

  return doc;
}
