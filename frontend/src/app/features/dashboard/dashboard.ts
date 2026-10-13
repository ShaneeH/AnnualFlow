<<<<<<< HEAD
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
=======
import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, forkJoin, switchMap, tap } from 'rxjs';

import { errorMessage } from '../../core/interceptors/api-error.interceptor';
import { CompanyPeriod } from '../../core/models/company-period.model';
import { CompanyService } from '../../core/services/company.service';
import { FinancialPeriod } from '../../core/models/financial-period.model';
import { HistoryPeriod } from '../../core/models/history-period.model';

import { CustomerChartComponent } from '../../shared/components/customer-chart/customer-chart';
import { DropdownOption, DropdownSelectComponent } from '../../shared/components/dropdown-selector/dropdown-selector';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';
<<<<<<< HEAD
import { RevenueChartComponent } from '../../shared/components/revenue-chart/revenue-chart';

=======
import { AiInsightComponent } from '../../shared/components/ai-insight/ai-insight';
import { MarginsChartComponent } from '../../shared/components/margins-chart/margins-chart';
import { hasSeries, isPresent } from '../../shared/utils/chart-data';
import { ValueFormat } from '../../shared/utils/number-format';
import {
  availablePeriodKinds, choosePeriodKind, PERIOD_KIND_LABELS, periodKind, PeriodKind
} from '../../shared/utils/period-kind';
import { CashFlowChartComponent } from '../../shared/components/cash-flow-chart/cash-flow-chart';
import { BoardReportService } from '../../core/services/board-report.service';
import { CompanyReportService } from '../../core/services/company-report.service';
import { FindingsExportService } from '../../core/services/findings-export.service';
import { DashboardState, loadDashboardState, saveDashboardState } from './dashboard-state';
import { RevenueChartComponent } from '../../shared/components/revenue-chart/revenue-chart';

export interface KpiCard {
  title: string;
  format: ValueFormat;
  value: number;
  change: number | null;
}

type Financials = FinancialPeriod['financials'];
type Metrics = FinancialPeriod['metrics'];
type Comparison = NonNullable<FinancialPeriod['comparison']>;

interface KpiDefinition {
  title: string;
  format: KpiCard['format'];
  value: (f: Financials, m: Metrics) => number | null | undefined;
  change?: (c: Comparison) => number | null | undefined;
}

// Order matters: headline P&L first, then cash flow, balance sheet and ratios.
const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  { title: 'Revenue', format: 'currency', value: f => f.revenue, change: c => c.revenueGrowth },
  { title: 'Gross Profit', format: 'currency', value: f => f.grossProfit, change: c => c.grossProfitGrowth },
  { title: 'Operating Profit', format: 'currency', value: f => f.operatingProfit, change: c => c.operatingProfitGrowth },
  { title: 'EBITDA', format: 'currency', value: f => f.ebitda, change: c => c.ebitdaGrowth },
  { title: 'Net Profit', format: 'currency', value: f => f.netProfit, change: c => c.netProfitGrowth },
  { title: 'Earnings per Share', format: 'perShare', value: f => f.eps, change: c => c.epsGrowth },
  { title: 'Operating Cash Flow', format: 'currency', value: f => f.operatingCashFlow, change: c => c.operatingCashFlowGrowth },
  { title: 'Cash', format: 'currency', value: f => f.cash, change: c => c.cashGrowth },
  { title: 'Debt', format: 'currency', value: f => f.debt, change: c => c.debtGrowth },
  { title: 'Total Assets', format: 'currency', value: f => f.totalAssets, change: c => c.totalAssetsGrowth },
  { title: 'Total Liabilities', format: 'currency', value: f => f.totalLiabilities, change: c => c.totalLiabilitiesGrowth },
  { title: 'Net Assets (Equity)', format: 'currency', value: f => f.netAssets, change: c => c.netAssetGrowth },
  { title: 'Customers', format: 'count', value: f => f.customers, change: c => c.customerGrowth },
  { title: 'Gross Margin', format: 'percent', value: (_f, m) => m?.grossMargin },
  { title: 'Operating Margin', format: 'percent', value: (_f, m) => m?.operatingMargin },
  { title: 'Net Margin', format: 'percent', value: (_f, m) => m?.netMargin },
  { title: 'Operating Cash Flow Margin', format: 'percent', value: (_f, m) => m?.operatingCashFlowMargin },
  { title: 'Return on Equity', format: 'percent', value: (_f, m) => m?.returnOnEquity },
  { title: 'Return on Assets', format: 'percent', value: (_f, m) => m?.returnOnAssets },
  { title: 'Debt to Equity', format: 'ratio', value: (_f, m) => m?.debtToEquity },
  { title: 'Liabilities to Assets', format: 'percent', value: (_f, m) => m?.liabilitiesToAssets }
];

/** Builds KPI cards, leaving out any metric the selected report does not have. */
export function buildKpiCards(financialPeriod: FinancialPeriod | null): KpiCard[] {
  if (!financialPeriod?.financials) return [];

  const { financials, metrics, comparison } = financialPeriod;

  return KPI_DEFINITIONS.flatMap(definition => {
    const value = definition.value(financials, metrics);
    if (!isPresent(value)) return [];

    const change = comparison && definition.change ? definition.change(comparison) : null;

    return [{
      title: definition.title,
      format: definition.format,
      value,
      change: isPresent(change) ? change : null
    }];
  });
}

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
interface PeriodRequest {
  companyId: number;
  period: string;
  compareTo?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
<<<<<<< HEAD
  imports: [DropdownSelectComponent, KpiCardComponent, RevenueChartComponent, CustomerChartComponent],
=======
  imports: [
    RouterLink,
    DropdownSelectComponent,
    KpiCardComponent,
    RevenueChartComponent,
    CustomerChartComponent,
    MarginsChartComponent,
    CashFlowChartComponent,
    AiInsightComponent
  ],
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly companyService = inject(CompanyService);
<<<<<<< HEAD
  private readonly destroyRef = inject(DestroyRef);
=======
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly boardReports = inject(BoardReportService);
  private readonly companyReports = inject(CompanyReportService);
  private readonly findingsExport = inject(FindingsExportService);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

  // Selections flow through these subjects. switchMap cancels the previous
  // request, so a slow response for an old selection can never overwrite
  // the data for the current one.
  private readonly companyChanges = new Subject<number>();
  private readonly periodChanges = new Subject<PeriodRequest>();

  // Dropdown data loaded from the backend.
  companies: DropdownOption<number>[] = [];
  periods: DropdownOption<string>[] = [];
  comparePeriods: DropdownOption<string>[] = [];

  // Full history is used by the dashboard charts.
  history: HistoryPeriod[] = [];

<<<<<<< HEAD
  // Current dashboard selections.
  selectedCompany: DropdownOption<number> | null = null;
=======
  // Charts show one kind of period at a time (Annual / Quarterly).
  chartHistory: HistoryPeriod[] = [];
  chartPeriodKinds: PeriodKind[] = [];
  chartPeriodKind: PeriodKind | null = null;
  private preferredChartKind: PeriodKind | null = null;
  showCashFlowChart = false;

  // Current dashboard selections.
  selectedCompany: DropdownOption<number> | null = null;

  // Set when opened via ?companyId=: select the company's latest period.
  private restoreLatestPeriod = false;

  /** Number of source documents merged into the selected period (Data Enrichment). */
  get sourceDocumentCount(): number {
    return this.financialPeriod?.financials.sourceDocumentCount ?? 0;
  }

  // Companies seeded as the fictional example dataset (shown with an "Example dataset" badge).
  exampleCompanyIds = new Set<number>();

  get isExampleCompany(): boolean {
    return !!this.selectedCompany && this.exampleCompanyIds.has(this.selectedCompany.value);
  }
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  selectedPeriod: DropdownOption<string> | null = null;
  selectedComparePeriod: DropdownOption<string> | null = null;

  financialPeriod: FinancialPeriod | null = null;
<<<<<<< HEAD
  companyName = '';

=======
  kpiCards: KpiCard[] = [];
  companyName = '';

  // Charts are only rendered when the company has data for them.
  showRevenueChart = false;
  showCustomerChart = false;
  showMarginsChart = false;

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  // View state.
  isLoadingCompanies = false;
  isLoadingCompany = false;
  isLoadingPeriod = false;
  emptyData = false;
  errorMessage: string | null = null;

<<<<<<< HEAD
=======
  // Board report PDF export state.
  isGeneratingReport = false;
  isGeneratingCompanyReport = false;
  exportingJson: 'period' | 'all' | null = null;
  exportMenuOpen = false;
  @ViewChild('exportTrigger') private exportTrigger?: ElementRef<HTMLButtonElement>;
  private readonly host = inject(ElementRef<HTMLElement>);

  get isExporting(): boolean {
    return this.isGeneratingReport || this.isGeneratingCompanyReport || this.exportingJson !== null;
  }

  toggleExportMenu(): void {
    if (this.exportMenuOpen) this.closeExportMenu();
    else this.openExportMenu();
  }

  openExportMenu(event?: Event): void {
    event?.preventDefault();
    this.exportMenuOpen = true;
    setTimeout(() => this.menuItems()[0]?.focus());
  }

  closeExportMenu(returnFocus = false): void {
    if (!this.exportMenuOpen) return;
    this.exportMenuOpen = false;
    if (returnFocus) this.exportTrigger?.nativeElement.focus();
  }

  onExportMenuFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !(event.currentTarget as HTMLElement).contains(next)) this.closeExportMenu();
  }

  onExportMenuKeydown(event: KeyboardEvent): void {
    const items = this.menuItems();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in move) || !items.length) return;
    event.preventDefault();
    items[(move[event.key] + items.length) % items.length].focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.exportMenuOpen) return;
    const menu = this.host.nativeElement.querySelector('.export-menu');
    if (menu && !menu.contains(event.target as Node)) this.closeExportMenu();
  }

  async runExport(kind: 'pdf-period' | 'pdf-all' | 'json-period' | 'json-all' | 'xlsx-period' | 'xlsx-all'): Promise<void> {
    this.closeExportMenu(true);
    if (kind === 'pdf-period') return this.downloadBoardReport();
    if (kind === 'pdf-all') return this.downloadCompanyReport();
    const format = kind.startsWith('xlsx') ? 'xlsx' : 'json';
    return this.exportJson(kind.endsWith('period') ? 'period' : 'all', format);
  }

  private menuItems(): HTMLButtonElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll('.export-menu-list [role="menuitem"]'));
  }
  reportError: string | null = null;

  // Whether the Insights panel is open (persisted and restored).
  insightOpen = false;

  // Saved selections waiting to be validated against freshly loaded data.
  private pendingRestore: DashboardState | null = null;

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  ngOnInit(): void {
    this.companyChanges
      .pipe(
        tap(() => {
          this.isLoadingCompany = true;
          this.errorMessage = null;
        }),
        switchMap(companyId => this.loadCompanyData(companyId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    this.periodChanges
      .pipe(
        tap(() => {
          this.isLoadingPeriod = true;
          this.errorMessage = null;
        }),
        switchMap(request => this.loadFinancialPeriod(request)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

<<<<<<< HEAD
=======
    const saved = loadDashboardState();
    this.preferredChartKind = saved.chartPeriodKind ?? null;
    this.pendingRestore = saved.companyId !== null ? saved : null;

    // Deep link from the landing page ("Explore the example dataset"): /dashboard?companyId=N
    // opens that company on its latest period, overriding the saved state.
    const linkedId = Number(this.route?.snapshot.queryParamMap.get('companyId'));
    if (Number.isInteger(linkedId) && linkedId > 0) {
      this.pendingRestore = { companyId: linkedId, period: null, comparePeriod: null, insightOpen: false };
      this.restoreLatestPeriod = true;
    }

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    this.loadCompanies();
  }

  onCompanySelected(company: DropdownOption<number>): void {
    this.selectedCompany = company;
    this.companyName = company.label;

    // Clear old dashboard data before loading the new company.
    this.selectedPeriod = null;
    this.selectedComparePeriod = null;
<<<<<<< HEAD
    this.financialPeriod = null;
    this.periods = [];
    this.comparePeriods = [];
    this.history = [];
=======
    this.setFinancialPeriod(null);
    this.periods = [];
    this.comparePeriods = [];
    this.setHistory([]);

    if (!this.pendingRestore) this.insightOpen = false;
    this.persist();
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    this.companyChanges.next(company.value);
  }

  onPeriodSelected(period: DropdownOption<string>): void {
    this.selectedPeriod = period;
    this.selectedComparePeriod = null;

    // Don't allow a period to compare against itself.
    this.comparePeriods = this.periods.filter(option => option.value !== period.value);

    if (!this.selectedCompany) return;
<<<<<<< HEAD
=======
    this.persist();
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    this.periodChanges.next({
      companyId: this.selectedCompany.value,
      period: period.value
    });
  }

  onComparePeriodSelected(comparePeriod: DropdownOption<string>): void {
    this.selectedComparePeriod = comparePeriod;

    if (!this.selectedCompany || !this.selectedPeriod) return;
<<<<<<< HEAD
=======
    this.persist();
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

    this.periodChanges.next({
      companyId: this.selectedCompany.value,
      period: this.selectedPeriod.value,
      compareTo: comparePeriod.value
    });
  }

<<<<<<< HEAD
=======
  async downloadBoardReport(): Promise<void> {
    if (!this.selectedCompany || !this.selectedPeriod || this.isGeneratingReport) return;

    this.isGeneratingReport = true;
    this.reportError = null;

    try {
      await this.boardReports.download(
        this.selectedCompany.value,
        this.selectedPeriod.value,
        this.selectedCompany.label
      );
    } catch (error) {
      this.reportError = errorMessage(error, 'The board report could not be generated.');
    } finally {
      this.isGeneratingReport = false;
    }
  }

  /** All-periods PDF for the selected company (cached insights only, no OpenAI). */
  async downloadCompanyReport(): Promise<void> {
    if (!this.selectedCompany || this.isGeneratingCompanyReport) return;

    this.isGeneratingCompanyReport = true;
    this.reportError = null;

    try {
      await this.companyReports.download(this.selectedCompany.value, this.selectedCompany.label);
    } catch (error) {
      this.reportError = errorMessage(error, 'The company report could not be generated.');
    } finally {
      this.isGeneratingCompanyReport = false;
    }
  }

  /** JSON export of the findings: the selected period, or every stored period. */
  async exportJson(scope: 'period' | 'all', format: 'json' | 'xlsx' = 'json'): Promise<void> {
    if (!this.selectedCompany || this.exportingJson) return;
    const period = scope === 'period' ? this.selectedPeriod?.value ?? null : null;
    if (scope === 'period' && !period) return;

    this.exportingJson = scope;
    this.reportError = null;
    try {
      await this.findingsExport.download(this.selectedCompany.value, this.selectedCompany.label, period, format);
    } catch (error) {
      this.reportError = errorMessage(error, `The ${format === 'xlsx' ? 'Excel' : 'JSON'} export could not be generated.`);
    } finally {
      this.exportingJson = null;
    }
  }

  onInsightOpenChange(open: boolean): void {
    this.insightOpen = open;
    this.persist();
  }

  /** Saves the current selections (skipped while a restore is in progress). */
  private persist(): void {
    if (this.pendingRestore) return;

    saveDashboardState({
      companyId: this.selectedCompany?.value ?? null,
      period: this.selectedPeriod?.value ?? null,
      comparePeriod: this.selectedComparePeriod?.value ?? null,
      insightOpen: this.insightOpen,
      chartPeriodKind: this.preferredChartKind
    });
  }

  /** Step 1 of restore: re-select the saved company if it still exists. */
  private restoreCompany(): void {
    const saved = this.pendingRestore;
    if (!saved) return;

    const company = this.companies.find(option => option.value === saved.companyId);
    if (!company) {
      // Stale company (e.g. its reports were deleted): drop the saved state.
      this.pendingRestore = null;
      this.persist();
      return;
    }

    this.onCompanySelected(company);
  }

  /** Step 2 of restore: re-select period, comparison and panel state if still valid. */
  private restorePeriods(): void {
    const saved = this.pendingRestore;
    if (!saved) return;

    const period = this.periods.find(option => option.value === saved.period)
      ?? (this.restoreLatestPeriod ? this.periods[0] : undefined);
    this.restoreLatestPeriod = false;
    const compare = this.periods.find(
      option => option.value === saved.comparePeriod && option.value !== saved.period
    );

    // Clear before selecting so the selections below are persisted.
    this.pendingRestore = null;

    if (!period) {
      this.insightOpen = false;
      this.persist();
      return;
    }

    this.insightOpen = saved.insightOpen;
    this.onPeriodSelected(period);

    if (compare) {
      this.onComparePeriodSelected(compare);
    }
  }

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  retry(): void {
    this.errorMessage = null;

    if (!this.companies.length) {
      this.loadCompanies();
    } else if (this.selectedCompany) {
      this.onCompanySelected(this.selectedCompany);
    }
  }

<<<<<<< HEAD
=======
  private setFinancialPeriod(financialPeriod: FinancialPeriod | null): void {
    this.financialPeriod = financialPeriod;
    this.kpiCards = buildKpiCards(financialPeriod);
  }

  private setHistory(history: HistoryPeriod[]): void {
    this.history = history;
    this.chartPeriodKinds = availablePeriodKinds(history);
    this.chartPeriodKind = choosePeriodKind(this.chartPeriodKinds, this.preferredChartKind);
    this.applyChartPeriodKind();
  }

  periodKindLabel(kind: PeriodKind): string {
    return PERIOD_KIND_LABELS[kind];
  }

  /** User picked Annual / Quarterly: remember it and redraw every chart. */
  onChartPeriodKindSelected(kind: PeriodKind): void {
    if (!this.chartPeriodKinds.includes(kind)) return;
    this.chartPeriodKind = kind;
    this.preferredChartKind = kind;
    this.applyChartPeriodKind();
    this.persist();
  }

  private applyChartPeriodKind(): void {
    const kind = this.chartPeriodKind;
    const rows = kind ? this.history.filter(row => periodKind(row.period) === kind) : [];

    this.chartHistory = rows;
    this.showRevenueChart = hasSeries(rows, 'revenue');
    this.showCustomerChart = hasSeries(rows, 'customers');
    this.showCashFlowChart = hasSeries(rows, 'operatingCashFlow') && hasSeries(rows, 'netProfit');
    this.showMarginsChart =
      hasSeries(rows, 'grossMargin') ||
      hasSeries(rows, 'operatingMargin') ||
      hasSeries(rows, 'ebitdaMargin') ||
      hasSeries(rows, 'netMargin');
  }

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  private loadCompanies(): void {
    this.isLoadingCompanies = true;
    this.errorMessage = null;

    this.companyService
      .getCompanies()
      .pipe(
        finalize(() => (this.isLoadingCompanies = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: companies => {
<<<<<<< HEAD
          this.companies = companies.map(company => ({
            label: company.companyName,
=======
          this.exampleCompanyIds = new Set(
            companies.filter(company => company.isExample).map(company => company.companyId)
          );
          this.companies = companies.map(company => ({
            label: company.isExample ? `${company.companyName} (example dataset)` : company.companyName,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            value: company.companyId
          }));

          this.emptyData = companies.length === 0;
<<<<<<< HEAD
=======
          this.restoreCompany();
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        },
        error: error => {
          this.errorMessage = errorMessage(error, 'Failed to load companies.');
        }
      });
  }

  private loadCompanyData(companyId: number): Observable<unknown> {
    return forkJoin({
      periods: this.companyService.getPeriods(companyId),
      history: this.companyService.getHistory(companyId)
    }).pipe(
      tap(({ periods, history }: { periods: CompanyPeriod[]; history: HistoryPeriod[] }) => {
        this.periods = periods.map(period => ({
          label: period.periodLabel,
          value: period.period
        }));
<<<<<<< HEAD
        this.history = history;
      }),
      catchError(error => {
        this.errorMessage = errorMessage(error, 'Failed to load company data.');
=======
        this.setHistory(history);
        this.restorePeriods();
      }),
      catchError(error => {
        this.errorMessage = errorMessage(error, 'Failed to load company data.');
        this.pendingRestore = null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        return EMPTY;
      }),
      finalize(() => (this.isLoadingCompany = false))
    );
  }

  private loadFinancialPeriod(request: PeriodRequest): Observable<unknown> {
    return this.companyService
      .getFinancialPeriod(request.companyId, request.period, request.compareTo)
      .pipe(
<<<<<<< HEAD
        tap(financialPeriod => (this.financialPeriod = financialPeriod)),
        catchError(error => {
          this.financialPeriod = null;
=======
        tap(financialPeriod => this.setFinancialPeriod(financialPeriod)),
        catchError(error => {
          this.setFinancialPeriod(null);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
          this.errorMessage = errorMessage(error, 'Failed to load the financial period.');
          return EMPTY;
        }),
        finalize(() => (this.isLoadingPeriod = false))
      );
  }
}
