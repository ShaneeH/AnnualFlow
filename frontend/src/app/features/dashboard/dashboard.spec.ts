import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Dashboard, buildKpiCards } from './dashboard';
import { BoardReportService } from '../../core/services/board-report.service';
import { CompanyReportService } from '../../core/services/company-report.service';
import { FindingsExportService } from '../../core/services/findings-export.service';
import { DASHBOARD_STATE_KEY, loadDashboardState } from './dashboard-state';
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
    // Reset mocks and persisted state before every test.
    vi.clearAllMocks();
    localStorage.clear();

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

  it('should label example dataset companies and show a Example dataset badge for them', () => {
    companyService.getCompanies.mockReturnValue(of([
      { companyId: 1, companyName: 'Senus PLC', isExample: false },
      { companyId: 2, companyName: 'Northwind Analytics plc', isExample: true }
    ]));

    component.ngOnInit();

    expect(component.companies.map(c => c.label)).toEqual(['Senus PLC', 'Northwind Analytics plc (example dataset)']);
    component.selectedCompany = component.companies[1];
    expect(component.isExampleCompany).toBe(true);
    component.selectedCompany = component.companies[0];
    expect(component.isExampleCompany).toBe(false);
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

  it('should show the Get insights button only once a period is selected', () => {
    const robot = () => fixture.nativeElement.querySelector('button[aria-label="Get insights"]');
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

  it('shows the source document count and an Enriched badge for merged periods', () => {
    const select = (count: number) => {
      companyService.getFinancialPeriod.mockReturnValue(of({
        financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100, sourceDocumentCount: count },
        metrics: {}
      }));
      component.selectedCompany = { label: 'Senus PLC', value: 1 };
      component.emptyData = false;
      component.companies = [{ label: 'Senus PLC', value: 1 }];
      component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    let el = select(1);
    expect(el.querySelector('.source-meta')?.textContent).toContain('Sources: 1 document');
    expect(el.querySelector('.enriched-text')).toBeNull();

    el = select(3);
    expect(el.querySelector('.source-meta')?.textContent).toContain('Sources: 3 documents');
    expect(el.querySelector('.enriched-text')?.textContent).toContain('Enriched');
  });

  describe('Annual / Quarterly chart toggle', () => {
    const row = (period: string, periodLabel: string, extra: object = {}) => ({
      period, periodLabel, periodEnd: null, revenue: 100, grossProfit: null, operatingProfit: null,
      ebitda: null, netProfit: 10, cash: null, debt: null, customers: null, netAssets: null,
      operatingCashFlow: 12, totalAssets: null, totalLiabilities: null, eps: null,
      grossMargin: null, operatingMargin: null, ebitdaMargin: null, netMargin: null, ...extra
    });
    const history = [row('FY2024', 'FY 2024'), row('FY2025', 'FY 2025'), row('Q1_2025', 'Q1 2025'), row('Q2_2025', 'Q2 2025')];

    function load(rows = history) {
      companyService.getPeriods.mockReturnValue(of([]));
      companyService.getHistory.mockReturnValue(of(rows));
      component.onCompanySelected({ label: 'Senus PLC', value: 1 });
      fixture.detectChanges();
    }

    it('defaults to Annual and never mixes annual and quarterly periods', () => {
      load();
      expect(component.chartPeriodKinds).toEqual(['annual', 'quarterly']);
      expect(component.chartPeriodKind).toBe('annual');
      expect(component.chartHistory.map(r => r.period)).toEqual(['FY2024', 'FY2025']);

      component.onChartPeriodKindSelected('quarterly');
      expect(component.chartHistory.map(r => r.period)).toEqual(['Q1_2025', 'Q2_2025']);
      expect(loadDashboardState().chartPeriodKind).toBe('quarterly');
    });

    it('falls back to Quarterly and hides the toggle when only one kind exists', () => {
      load([row('Q1_2025', 'Q1 2025'), row('Q2_2025', 'Q2 2025')]);
      expect(component.chartPeriodKind).toBe('quarterly');
      expect(fixture.nativeElement.querySelector('.period-kind-toggle')).toBeNull();
    });

    it('shows the toggle and the cash flow chart when data exists', () => {
      load();
      companyService.getFinancialPeriod.mockReturnValue(of({
        financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 }, metrics: {}
      }));
      component.emptyData = false;
      component.companies = [{ label: 'Senus PLC', value: 1 }];
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const buttons = Array.from(el.querySelectorAll('.period-kind-toggle button')).map(b => b.textContent?.trim());
      expect(buttons).toEqual(['Annual', 'Quarterly']);
      expect(component.showCashFlowChart).toBe(true);
      expect(el.textContent).toContain('Cash Flow vs Net Profit');
    });

    it('hides the cash flow chart without operating cash flow data', () => {
      load([row('FY2024', 'FY 2024', { operatingCashFlow: null }), row('FY2025', 'FY 2025', { operatingCashFlow: null })]);
      expect(component.showCashFlowChart).toBe(false);
      expect(component.showRevenueChart).toBe(true);
    });

    it('restores the saved chart period kind', () => {
      localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({ chartPeriodKind: 'quarterly' }));
      fixture = TestBed.createComponent(Dashboard);
      component = fixture.componentInstance;
      fixture.detectChanges();
      load();
      expect(component.chartPeriodKind).toBe('quarterly');
    });
  });

  describe('state persistence', () => {
    const companies = [{ companyId: 1, companyName: 'Senus PLC' }, { companyId: 2, companyName: 'Other' }];
    const periods = [
      { periodId: 1, period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31' },
      { periodId: 2, period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31' }
    ];
    const financial = { financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 1 }, metrics: {} };

    function restart(saved: object) {
      localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(saved));
      companyService.getCompanies.mockReturnValue(of(companies));
      companyService.getPeriods.mockReturnValue(of(periods));
      companyService.getHistory.mockReturnValue(of([]));
      companyService.getFinancialPeriod.mockReturnValue(of(financial));

      fixture = TestBed.createComponent(Dashboard);
      component = fixture.componentInstance;
      fixture.detectChanges();
    }

    it('a ?companyId= deep link (Explore the example dataset) opens that company on its latest period', async () => {
      localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({ companyId: 1, period: 'FY2024', comparePeriod: null, insightOpen: false }));
      companyService.getCompanies.mockReturnValue(of(companies));
      companyService.getPeriods.mockReturnValue(of(periods));
      companyService.getFinancialPeriod.mockReturnValue(of(financial));

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Dashboard],
        providers: [
          provideRouter([]),
          { provide: CompanyService, useValue: companyService },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ companyId: '2' }) } } }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(Dashboard);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.selectedCompany?.value).toBe(2);
      expect(component.selectedPeriod?.value).toBe('FY2025');
    });

    it('saves selections as the user makes them', () => {
      component.companies = [{ label: 'Senus PLC', value: 1 }];
      companyService.getPeriods.mockReturnValue(of(periods));
      companyService.getFinancialPeriod.mockReturnValue(of(financial));

      component.onCompanySelected({ label: 'Senus PLC', value: 1 });
      component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
      component.onComparePeriodSelected({ label: 'FY 2024', value: 'FY2024' });
      component.onInsightOpenChange(true);

      expect(loadDashboardState()).toEqual({
        companyId: 1, period: 'FY2025', comparePeriod: 'FY2024', insightOpen: true, chartPeriodKind: null
      });
    });

    it('restores company, period, comparison and the insight panel', () => {
      restart({ companyId: 1, period: 'FY2025', comparePeriod: 'FY2024', insightOpen: true });

      expect(component.selectedCompany?.value).toBe(1);
      expect(component.selectedPeriod?.value).toBe('FY2025');
      expect(component.selectedComparePeriod?.value).toBe('FY2024');
      expect(component.insightOpen).toBe(true);
      expect(companyService.getFinancialPeriod).toHaveBeenLastCalledWith(1, 'FY2025', 'FY2024');
    });

    it('drops a stale company id gracefully', () => {
      restart({ companyId: 99, period: 'FY2025', comparePeriod: null, insightOpen: true });

      expect(component.selectedCompany).toBeNull();
      expect(companyService.getPeriods).not.toHaveBeenCalled();
      expect(loadDashboardState().companyId).toBeNull();
    });

    it('keeps the company but drops a stale period and comparison', () => {
      restart({ companyId: 1, period: 'FY2019', comparePeriod: 'FY2018', insightOpen: true });

      expect(component.selectedCompany?.value).toBe(1);
      expect(component.selectedPeriod).toBeNull();
      expect(component.insightOpen).toBe(false);
      expect(loadDashboardState()).toEqual({
        companyId: 1, period: null, comparePeriod: null, insightOpen: false, chartPeriodKind: null
      });
    });
  });

  it('shows a Board report button for a selected period and downloads the PDF', async () => {
    const boardReports = TestBed.inject(BoardReportService);
    const download = vi.spyOn(boardReports, 'download').mockResolvedValue('annualflow-Senus_PLC_FY2025.pdf');

    companyService.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 },
      metrics: {}
    }));
    component.companies = [{ label: 'Senus PLC', value: 1 }];
    component.emptyData = false;
    component.selectedCompany = { label: 'Senus PLC', value: 1 };
    component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
    fixture.detectChanges();

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('button.export-trigger');
    expect(button?.textContent).toContain('Export');

    await component.downloadBoardReport();
    expect(download).toHaveBeenCalledWith(1, 'FY2025', 'Senus PLC');
    expect(component.isGeneratingReport).toBe(false);
  });

  it('shows a Company report button and downloads the all-periods PDF', async () => {
    const companyReports = TestBed.inject(CompanyReportService);
    const download = vi.spyOn(companyReports, 'download').mockResolvedValue('annualflow-Senus_PLC_All_Periods.pdf');

    companyService.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 },
      metrics: {}
    }));
    component.companies = [{ label: 'Senus PLC', value: 1 }];
    component.emptyData = false;
    component.selectedCompany = { label: 'Senus PLC', value: 1 };
    component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.report-header-actions > .board-report-button').length).toBe(0);
    // The comparison is chosen in the toolbar dropdown; no 'vs' box in the action stack.
    component.selectedComparePeriod = { label: 'FY 2024', value: 'FY2024' };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-header-actions .compare-pill')).toBeNull();
    expect(fixture.nativeElement.querySelector('.report-header-actions')?.textContent).not.toContain('vs');

    await component.downloadCompanyReport();
    expect(download).toHaveBeenCalledWith(1, 'Senus PLC');
    expect(component.isGeneratingCompanyReport).toBe(false);
  });

  it('exports JSON for the selected period and for all periods', async () => {
    const download = vi.spyOn(TestBed.inject(FindingsExportService), 'download').mockResolvedValue('x.json');
    companyService.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 }, metrics: {}
    }));
    component.companies = [{ label: 'Senus PLC', value: 1 }];
    component.emptyData = false;
    component.selectedCompany = { label: 'Senus PLC', value: 1 };
    component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
    fixture.detectChanges();

    await component.exportJson('period');
    await component.exportJson('all');
    expect(download).toHaveBeenNthCalledWith(1, 1, 'Senus PLC', 'FY2025', 'json');
    expect(download).toHaveBeenNthCalledWith(2, 1, 'Senus PLC', null, 'json');
    expect(component.exportingJson).toBeNull();
  });

  it('groups PDF and JSON exports in one accessible Export menu', async () => {
    const boardReports = TestBed.inject(BoardReportService);
    const pdf = vi.spyOn(boardReports, 'download').mockResolvedValue('x.pdf');
    const json = vi.spyOn(TestBed.inject(FindingsExportService), 'download').mockResolvedValue('x.json');
    companyService.getFinancialPeriod.mockReturnValue(of({
      financials: { companyName: 'Senus PLC', periodLabel: 'FY 2025', revenue: 100 }, metrics: {}
    }));
    component.companies = [{ label: 'Senus PLC', value: 1 }];
    component.emptyData = false;
    component.selectedCompany = { label: 'Senus PLC', value: 1 };
    component.onPeriodSelected({ label: 'FY 2025', value: 'FY2025' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector<HTMLButtonElement>('button.export-trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(el.querySelector('[role="menu"]')).toBeNull();

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const groups = Array.from(el.querySelectorAll('[role="menu"] [role="group"]'))
      .map(g => Array.from(g.children).map(c => c.textContent!.trim()).join(' '));
    expect(groups).toEqual(['PDF This period All periods', 'JSON This period All periods', 'Excel This period All periods']);

    el.querySelector('.export-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).toBeNull();

    trigger.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(component.exportMenuOpen).toBe(false);

    trigger.click();
    fixture.detectChanges();
    el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[0].click();
    await fixture.whenStable();
    expect(pdf).toHaveBeenCalledWith(1, 'FY2025', 'Senus PLC');
    expect(component.exportMenuOpen).toBe(false);
    await component.runExport('json-all');
    expect(json).toHaveBeenCalledWith(1, 'Senus PLC', null, 'json');
  });
});
