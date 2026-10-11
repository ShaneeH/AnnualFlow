import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';

import { HistoryPeriod } from '../../../core/models/history-period.model';
import { seriesWithData } from '../../utils/chart-data';

Chart.register(...registerables);

type MarginKey = 'grossMargin' | 'operatingMargin' | 'ebitdaMargin' | 'netMargin';

const MARGIN_SERIES: ReadonlyArray<{ key: MarginKey; label: string; colour: string }> = [
  { key: 'grossMargin', label: 'Gross margin', colour: '#60a5fa' },
  { key: 'operatingMargin', label: 'Operating margin', colour: '#34d399' },
  { key: 'ebitdaMargin', label: 'EBITDA margin', colour: '#fbbf24' },
  { key: 'netMargin', label: 'Net margin', colour: '#f472b6' }
];

/** Line chart of profitability margins (%) over time. Only series with data are drawn. */
@Component({
  selector: 'app-margins-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './margins-chart.html',
  styleUrl: './margins-chart.css'
})
export class MarginsChartComponent {
  @Input()
  set history(history: HistoryPeriod[]) {
    const keys = seriesWithData(history, MARGIN_SERIES.map(series => series.key));

    this.chartData = {
      labels: history.map(period => period.periodLabel),
      datasets: MARGIN_SERIES
        .filter(series => keys.includes(series.key))
        .map(series => ({
          label: series.label,
          data: history.map(period => period[series.key] ?? null),
          borderColor: series.colour,
          backgroundColor: series.colour,
          borderWidth: 2,
          tension: 0.3,
          spanGaps: true,
          pointRadius: 3
        }))
    };
  }

  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#d4d4d8', boxWidth: 12 }
      },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label}: ${context.parsed.y?.toFixed(1)}%`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#a1a1aa' },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: '#a1a1aa',
          callback: value => `${value}%`
        },
        grid: { color: '#27272a' }
      }
    }
  };
}
