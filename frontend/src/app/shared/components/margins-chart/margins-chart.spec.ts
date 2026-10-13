import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryPeriod } from '../../../core/models/history-period.model';
import { MarginsChartComponent } from './margins-chart';

function row(overrides: Partial<HistoryPeriod>): HistoryPeriod {
  return {
    period: 'FY2024',
    periodLabel: 'FY 2024',
    periodEnd: '2024-12-31',
    revenue: null,
    grossProfit: null,
    operatingProfit: null,
    ebitda: null,
    netProfit: null,
    cash: null,
    debt: null,
    customers: null,
    netAssets: null,
    operatingCashFlow: null,
    totalAssets: null,
    totalLiabilities: null,
    eps: null,
    grossMargin: null,
    operatingMargin: null,
    ebitdaMargin: null,
    netMargin: null,
    ...overrides
  };
}

describe('MarginsChartComponent', () => {
  let fixture: ComponentFixture<MarginsChartComponent>;
  let component: MarginsChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarginsChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MarginsChartComponent);
    component = fixture.componentInstance;
  });

  it('only draws margin series that have data', () => {
    component.history = [
      row({ grossMargin: 40, netMargin: 10 }),
      row({ period: 'FY2025', periodLabel: 'FY 2025', grossMargin: 42, netMargin: null })
    ];

    expect(component.chartData.datasets.map(d => d.label))
      .toEqual(['Gross margin', 'Net margin']);
    expect(component.chartData.datasets[1].data).toEqual([10, null]);
  });
});
