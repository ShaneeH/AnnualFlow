import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';

import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  registerables
} from 'chart.js';

import { HistoryPeriod } from '../../../core/models/history-period.model';
import { formatMoney } from '../../utils/number-format';

// Register all Chart.js components so line charts work out of the box.
Chart.register(...registerables);

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './revenue-chart.html',
  styleUrl: './revenue-chart.css'
})
export class RevenueChartComponent {

  // Rebuild the chart whenever new history data is passed in.
  @Input()
  set history(history: HistoryPeriod[]) {

    this.chartData = {
      // X-axis labels (e.g. "Jan 2024", "Feb 2024", …)
      labels: history.map(item => item.periodLabel),

      datasets: [
        {
          label: 'Revenue',
          data: history.map(item => item.revenue ?? null),
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 2,
          tension: 0.35,              // Soft curve between points
          fill: true,                 // Fill area under the line
          pointRadius: 4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#18181b',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }
      ]
    };
  }

  // Initial empty chart data (populated by the history setter above).
  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  // Chart.js configuration for a clean, responsive line chart.
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,

    // Show tooltip for the nearest x-axis point (not just on exact hover).
    interaction: {
      mode: 'index',
      intersect: false
    },

    plugins: {
      // Hide the default legend – we only have one series.
      legend: {
        display: false
      },

      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#ffffff',
        bodyColor: '#d4d4d8',
        borderColor: '#3f3f46',
        borderWidth: 1,

        callbacks: {
          // Format revenue values as compact euro amounts.
          label: context => `Revenue: ${formatMoney(context.parsed.y)}`
        }
      }
    },

    scales: {
      x: {
        ticks: {
          color: '#a1a1aa'
        },
        grid: {
          display: false          // No vertical grid lines
        },
        border: {
          color: '#27272a'
        }
      },

      y: {
        beginAtZero: true,

        ticks: {
          color: '#a1a1aa',

          // Keep the axis readable when revenue values get large.
          callback: value => formatMoney(Number(value), 0)
        },

        grid: {
          color: '#27272a'
        },
        border: {
          display: false
        }
      }
    }
  };
}