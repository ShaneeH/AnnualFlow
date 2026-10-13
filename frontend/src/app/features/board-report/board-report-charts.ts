import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { HistoryPeriod } from '../../core/models/history-period.model';
import { hasSeries, seriesWithData } from '../../shared/utils/chart-data';
import { BoardReportChart } from './board-report';

Chart.register(...registerables);

/** Chart image settings for PDFs (kept small: JPEG on a white fill, no transparency). */
export const CHART_CSS_WIDTH = 650;
export const CHART_CSS_HEIGHT = 292;
export const CHART_PIXEL_RATIO = 2;
export const CHART_IMAGE_TYPE = 'image/jpeg';
export const CHART_JPEG_QUALITY = 0.85;

const MARGINS = [
  { key: 'grossMargin', label: 'Gross margin', colour: '#2563eb' },
  { key: 'operatingMargin', label: 'Operating margin', colour: '#059669' },
  { key: 'ebitdaMargin', label: 'EBITDA margin', colour: '#d97706' },
  { key: 'netMargin', label: 'Net margin', colour: '#db2777' }
] as const;

/** Which charts the report should contain (only those with data). */
export function boardReportChartConfigs(history: HistoryPeriod[]): Array<{
  title: string;
  config: ChartConfiguration;
}> {
  const labels = history.map(row => row.periodLabel);
  const configs: Array<{ title: string; config: ChartConfiguration }> = [];
  const base = {
    responsive: false,
    animation: false as const,
    devicePixelRatio: CHART_PIXEL_RATIO,
    plugins: { legend: { display: true, labels: { color: '#333' } } },
    scales: { x: { ticks: { color: '#555' } }, y: { ticks: { color: '#555' } } }
  };

  if (hasSeries(history, 'revenue')) {
    configs.push({
      title: 'Revenue',
      config: {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Revenue', data: history.map(r => r.revenue), borderColor: '#00a6ff', spanGaps: true }]
        },
        options: base
      }
    });
  }

  const marginKeys = seriesWithData(history, MARGINS.map(m => m.key));
  if (marginKeys.length) {
    configs.push({
      title: 'Profit margins (%)',
      config: {
        type: 'line',
        data: {
          labels,
          datasets: MARGINS.filter(m => marginKeys.includes(m.key)).map(m => ({
            label: m.label,
            data: history.map(r => r[m.key]),
            borderColor: m.colour,
            spanGaps: true
          }))
        },
        options: base
      }
    });
  }

  if (hasSeries(history, 'customers')) {
    configs.push({
      title: 'Customers',
      config: {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Customers', data: history.map(r => r.customers), backgroundColor: '#00a6ff' }]
        },
        options: base
      }
    });
  }

  return configs;
}

/** Renders the charts to PNG images on an off-screen canvas (white background). */
export function renderBoardReportCharts(history: HistoryPeriod[]): BoardReportChart[] {
  if (typeof document === 'undefined') return [];

  const images: BoardReportChart[] = [];

  for (const { title, config } of boardReportChartConfigs(history)) {
    const canvas = document.createElement('canvas');
    // CSS size ~ the drawn size in the PDF (174mm wide); devicePixelRatio 2
    // gives ~1300px wide images: crisp in print, small as JPEG.
    canvas.width = CHART_CSS_WIDTH;
    canvas.height = CHART_CSS_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) continue; // e.g. no canvas support

    try {
      const chart = new Chart(context, {
        ...config,
        plugins: [{
          id: 'white-background',
          beforeDraw: c => {
            c.ctx.save();
            c.ctx.fillStyle = '#ffffff';
            c.ctx.fillRect(0, 0, c.width, c.height);
            c.ctx.restore();
          }
        }]
      });
      images.push({ title, image: chart.toBase64Image(CHART_IMAGE_TYPE, CHART_JPEG_QUALITY) });
      chart.destroy();
    } catch {
      // A chart that cannot be rendered is left out rather than failing the report.
    }
  }

  return images;
}
