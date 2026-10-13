import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';

import { HistoryPeriod } from '../../../core/models/history-period.model';
import { formatMoney } from '../../utils/number-format';

Chart.register(...registerables);

/** Grouped bars per period: operating cash flow next to net profit. */
@Component({
  selector: 'app-cash-flow-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <section class="chart-section">
      <div class="chart-container">
        <canvas baseChart type="bar" [data]="chartData" [options]="chartOptions"></canvas>
      </div>
    </section>
  `,
  styleUrl: '../customer-chart/customer-chart.css'
})
export class CashFlowChartComponent {
  @Input()
  set history(history: HistoryPeriod[]) {
    this.chartData = buildCashFlowChartData(history);
  }

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#a1a1aa', boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label}: ${formatMoney(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#a1a1aa' }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: '#a1a1aa', callback: value => formatMoney(Number(value), 0) },
        grid: { color: '#27272a' }
      }
    }
  };
}

export function buildCashFlowChartData(history: HistoryPeriod[]): ChartConfiguration<'bar'>['data'] {
  return {
    labels: history.map(period => period.periodLabel),
    datasets: [
      {
        label: 'Operating cash flow',
        data: history.map(period => period.operatingCashFlow ?? null),
        backgroundColor: '#00a6ff',
        borderRadius: 4,
        maxBarThickness: 36
      },
      {
        label: 'Net profit',
        data: history.map(period => period.netProfit ?? null),
        backgroundColor: '#71717a',
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}
