import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { provideRouter } from '@angular/router';

import { Dashboard, buildKpiCards } from './dashboard';
import { CompanyService } from '../../core/services/company.service';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const companyService = {
    getCompanies: vi.fn(),
    getPeriods: vi.fn(),
    getFinancialPeriod: vi.fn(),
    getHistory: vi.fn()
  };

  beforeEach(async () => {
    // Reset mocks before every test.
    vi.clearAllMocks();

    companyService.getCompanies.mockReturnValue(of([]));
    companyService.getPeriods.mockReturnValue(of([]));
    companyService.getHistory.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: companyService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load companies when the dashboard starts', () => {
    expect(companyService.getCompanies).toHaveBeenCalled();
  });

  it('should convert companies into dropdown options', () => {
    companyService.getCompanies.mockReturnValue(of([
      {
        companyId: 1,
        companyName: 'Senus PLC'
      }
    ]));

    component.ngOnInit();

    expect(component.companies).toEqual([
      {
        label: 'Senus PLC',
        value: 1
      }
    ]);
  });

  it('should load periods and history when a company is selected', () => {
    component.onCompanySelected({
      label: 'Senus PLC',
      value: 1
    });

    expect(companyService.getPeriods).toHaveBeenCalledWith(1);
    expect(companyService.getHistory).toHaveBeenCalledWith(1);
  });

  it('should clear old data when a new company is selected', () => {
    component.selectedPeriod = {
      label: 'FY2025',
      value: 'FY2025'
    };

    component.selectedComparePeriod = {
      label: 'FY2024',
      value: 'FY2024'
    };

    component.onCompanySelected({
      label: 'Senus PLC',
      value: 1
    });

    expect(component.selectedPeriod).toBeNull();
    expect(component.selectedComparePeriod).toBeNull();
    expect(component.financialPeriod).toBeNull();
  });

  it('should remove the selected period from comparison options', () => {
    component.periods = [
      { label: 'FY2023', value: 'FY2023' },
      { label: 'FY2024', value: 'FY2024' },
      { label: 'FY2025', value: 'FY2025' }
    ];

    component.onPeriodSelected({
      label: 'FY2025',
      value: 'FY2025'
    });

    expect(component.comparePeriods).toEqual([
      { label: 'FY2023', value: 'FY2023' },
      { label: 'FY2024', value: 'FY2024' }
    ]);
  });

  it('should load financial data for the selected period', () => {
    const financialPeriod = {
      financials: {},
      comparison: null
    } as any;

    component.selectedCompany = {
      label: 'Senus PLC',
      value: 1
    };

    companyService.getFinancialPeriod.mockReturnValue(of(financialPeriod));

    component.onPeriodSelected({
      label: 'FY2025',
      value: 'FY2025'
    });

    expect(companyService.getFinancialPeriod)
      .toHaveBeenCalledWith(1, 'FY2025', undefined);

    expect(component.financialPeriod).toBe(financialPeriod);
  });

  it('should load comparison data', () => {
    const financialPeriod = {
      financials: {},
      comparison: {}
    } as any;

    component.selectedCompany = {
      label: 'Senus PLC',
      value: 1
    };

    component.selectedPeriod = {
      label: 'FY2025',
      value: 'FY2025'
    };

    companyService.getFinancialPeriod.mockReturnValue(of(financialPeriod));

    component.onComparePeriodSelected({
      label: 'FY2024',
      value: 'FY2024'
    });

    expect(companyService.getFinancialPeriod)
      .toHaveBeenCalledWith(1, 'FY2025', 'FY2024');
  });

  it('should ignore a stale period response after a newer selection', () => {
    const slow = new Subject<any>();
    const fast = { financials: { period: 'FY2024' } } as any;

    component.selectedCompany = { label: 'Senus PLC', value: 1 };

    companyService.getFinancialPeriod.mockReturnValueOnce(slow);
    component.onPeriodSelected({ label: 'FY2025', value: 'FY2025' });

    companyService.getFinancialPeriod.mockReturnValueOnce(of(fast));
    component.onPeriodSelected({ label: 'FY2024', value: 'FY2024' });

    // The earlier, slower request finishes last but must not win.
    slow.next({ financials: { period: 'FY2025' } });

    expect(component.financialPeriod).toBe(fast);
  });

  it('should show an error message when companies fail to load', () => {
    const failing = new Subject<never>();
    companyService.getCompanies.mockReturnValue(failing);

    component.ngOnInit();
    failing.error(new Error('offline'));

    expect(component.errorMessage).toBe('Failed to load companies.');
    expect(component.isLoadingCompanies).toBe(false);
  });

  it('should link the hero button to the create report flow', () => {
    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a.create-report-button');

    expect(link?.textContent).toContain('Create new report');
    expect(link?.getAttribute('href')).toBe('/documents/new');
  });

  it('should only build KPI cards for metrics that exist', () => {
    const cards = buildKpiCards({
      financials: {
        revenue: 1000,
        grossProfit: null,
        netProfit: 100,
        totalAssets: 5000,
        eps: null
      },
      metrics: { netMargin: 10, grossMargin: null, returnOnEquity: null },
      comparison: { revenueGrowth: 5 }
    } as any);

    expect(cards.map(card => card.title)).toEqual([
      'Revenue',
      'Net Profit',
      'Total Assets',
      'Net Margin'
    ]);
    expect(cards[0].change).toBe(5);
    expect(cards[1].change).toBeNull();
  });

  it('should hide charts that have no data', () => {
    companyService.getPeriods.mockReturnValue(of([]));
    companyService.getHistory.mockReturnValue(of([
      { period: 'FY2024', periodLabel: 'FY 2024', revenue: 100, customers: null, grossMargin: null, operatingMargin: null, ebitdaMargin: null, netMargin: 12 },
      { period: 'FY2025', periodLabel: 'FY 2025', revenue: 120, customers: null, grossMargin: null, operatingMargin: null, ebitdaMargin: null, netMargin: null }
    ]));

    component.onCompanySelected({ label: 'Senus PLC', value: 1 });

    expect(component.showRevenueChart).toBe(true);
    expect(component.showMarginsChart).toBe(true);
    expect(component.showCustomerChart).toBe(false);
  });

  it('should show the AI Insight robot only once a period is selected', () => {
    const robot = () => fixture.nativeElement.querySelector('button[aria-label="AI Insight"]');
    expect(robot()).toBeNull();

    companyService.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 },
      metrics: {}
    }));
    component.selectedCompany = { label: 'Senus PLC', value: 1 };
    component.emptyData = false;
    component.companies = [{ label: 'Senus PLC', value: 1 }];
    component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
    fixture.detectChanges();

    expect(robot()).toBeTruthy();
  });
});
