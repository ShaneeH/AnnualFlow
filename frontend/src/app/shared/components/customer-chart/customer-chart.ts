import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { HistoryPeriod } from '../../../core/models/history-period.model';
<<<<<<< HEAD
=======
import { formatCount } from '../../utils/number-format';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

// Register all Chart.js components so bar charts work out of the box.
Chart.register(...registerables);

@Component({
  selector: 'app-customer-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './customer-chart.html',
  styleUrl: './customer-chart.css'
})
export class CustomerChartComponent {

  // Rebuild the chart whenever new history data is passed in.
  @Input()
  set history(history: HistoryPeriod[]) {
    this.chartData = {
      // X-axis labels (e.g. "Jan 2024", "Feb 2024", …)
      labels: history.map(period => period.periodLabel),

      datasets: [{
        label: 'Customers',
<<<<<<< HEAD
        // Convert each period's customer count to a number (fallback to 0).
        data: history.map(period => Number(period.customers ?? 0)),
=======
        // Missing periods are left as gaps rather than shown as zero.
        data: history.map(period => period.customers ?? null),
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        borderWidth: 1,
        borderRadius: 6,          // Rounded bar corners
        borderSkipped: false,     
        maxBarThickness: 70       
      }]
    };
  }

  // Initial empty chart data (populated by the history setter above).
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  // Chart.js configuration for a clean, responsive bar chart.
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      // Hide the default legend – we only have one series.
      legend: {
        display: false
      },

      tooltip: {
        callbacks: {
          // Format the tooltip value as a readable customer count.
<<<<<<< HEAD
          label: context => {
            const value = context.parsed.y ?? 0;
            return `${value.toLocaleString()} customers`;
          }
=======
          label: context => `${formatCount(context.parsed.y)} customers`
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        }
      }
    },

    scales: {
      x: {
        ticks: {
          color: '#a1a1aa'        // Light gray tick labels
        },
        grid: {
          display: false          // No vertical grid lines
        }
      },

      y: {
        beginAtZero: true,        // Always start the Y-axis at 0

        ticks: {
          color: '#a1a1aa',
          // Format large numbers with thousand separators.
<<<<<<< HEAD
          callback: value => Number(value).toLocaleString()
=======
          callback: value => formatCount(Number(value))
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        },

        grid: {
          color: '#27272a'        // Subtle dark horizontal grid lines
        }
      }
    }
  };
}