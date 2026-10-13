import { buildCashFlowChartData } from './cash-flow-chart';
import { HistoryPeriod } from '../../../core/models/history-period.model';

describe('buildCashFlowChartData', () => {
  it('builds grouped operating cash flow and net profit series per period', () => {
    const rows = [
      { period: 'FY2024', periodLabel: 'FY 2024', operatingCashFlow: 38_200_000, netProfit: 24_446_000 },
      { period: 'FY2025', periodLabel: 'FY 2025', operatingCashFlow: null, netProfit: 35_140_000 }
    ] as HistoryPeriod[];

    const data = buildCashFlowChartData(rows);

    expect(data.labels).toEqual(['FY 2024', 'FY 2025']);
    expect(data.datasets.map(d => d.label)).toEqual(['Operating cash flow', 'Net profit']);
    expect(data.datasets[0].data).toEqual([38_200_000, null]);
    expect(data.datasets[1].data).toEqual([24_446_000, 35_140_000]);
  });
});
