import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError } from '../interceptors/api-error.interceptor';
import { BoardReportService } from './board-report.service';
import { CompanyService } from './company.service';
import { InsightService } from './insight.service';

describe('BoardReportService', () => {
  const companies = { getPeriods: vi.fn(), getFinancialPeriod: vi.fn(), getHistory: vi.fn() };
  const insights = { getInsight: vi.fn(), generateInsight: vi.fn() };
  let service: BoardReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyService, useValue: companies },
        { provide: InsightService, useValue: insights }
      ]
    });
    service = TestBed.inject(BoardReportService);

    companies.getPeriods.mockReturnValue(of([
      { periodId: 1, period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31' },
      { periodId: 2, period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31' }
    ]));
    companies.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'WWE', periodLabel: 'FY 2025', revenue: 1 }, metrics: {}
    }));
    companies.getHistory.mockReturnValue(of([]));
  });

  it('compares with the previous period and includes a cached insight', async () => {
    insights.getInsight.mockReturnValue(of({ content: {} }));

    const data = await firstValueFrom(service.loadData(1, 'FY2025', 'WWE'));

    expect(companies.getFinancialPeriod).toHaveBeenCalledWith(1, 'FY2025', 'FY2024');
    expect(data.previousPeriodLabel).toBe('FY 2024');
    expect(data.insight).not.toBeNull();
  });

  it('omits the insight when none is cached and never generates one', async () => {
    insights.getInsight.mockReturnValue(throwError(() => new ApiError('Not found', 404, null)));

    const data = await firstValueFrom(service.loadData(1, 'FY2025', 'WWE'));

    expect(data.insight).toBeNull();
    expect(insights.generateInsight).not.toHaveBeenCalled();
  });
});
