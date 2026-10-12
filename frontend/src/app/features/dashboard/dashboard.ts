import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { AiInsightComponent } from '../../shared/components/ai-insight/ai-insight';
import { MarginsChartComponent } from '../../shared/components/margins-chart/margins-chart';
import { hasSeries, isPresent } from '../../shared/utils/chart-data';
import { RevenueChartComponent } from '../../shared/components/revenue-chart/revenue-chart';

export interface KpiCard {
  title: string;
  format: 'currency' | 'number' | 'percent';
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
  { title: 'Earnings per Share', format: 'number', value: f => f.eps, change: c => c.epsGrowth },
  { title: 'Operating Cash Flow', format: 'currency', value: f => f.operatingCashFlow, change: c => c.operatingCashFlowGrowth },
  { title: 'Cash', format: 'currency', value: f => f.cash, change: c => c.cashGrowth },
  { title: 'Debt', format: 'currency', value: f => f.debt, change: c => c.debtGrowth },
  { title: 'Total Assets', format: 'currency', value: f => f.totalAssets, change: c => c.totalAssetsGrowth },
  { title: 'Total Liabilities', format: 'currency', value: f => f.totalLiabilities, change: c => c.totalLiabilitiesGrowth },
  { title: 'Net Assets (Equity)', format: 'currency', value: f => f.netAssets, change: c => c.netAssetGrowth },
  { title: 'Customers', format: 'number', value: f => f.customers, change: c => c.customerGrowth },
  { title: 'Gross Margin', format: 'percent', value: (_f, m) => m?.grossMargin },
  { title: 'Operating Margin', format: 'percent', value: (_f, m) => m?.operatingMargin },
  { title: 'Net Margin', format: 'percent', value: (_f, m) => m?.netMargin },
  { title: 'Operating Cash Flow Margin', format: 'percent', value: (_f, m) => m?.operatingCashFlowMargin },
  { title: 'Return on Equity', format: 'percent', value: (_f, m) => m?.returnOnEquity },
  { title: 'Return on Assets', format: 'percent', value: (_f, m) => m?.returnOnAssets },
  { title: 'Debt to Equity', format: 'number', value: (_f, m) => m?.debtToEquity },
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

interface PeriodRequest {
  companyId: number;
  period: string;
  compareTo?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DropdownSelectComponent,
    KpiCardComponent,
    RevenueChartComponent,
    CustomerChartComponent,
    MarginsChartComponent,
    AiInsightComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

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

  // Current dashboard selections.
  selectedCompany: DropdownOption<number> | null = null;
  selectedPeriod: DropdownOption<string> | null = null;
  selectedComparePeriod: DropdownOption<string> | null = null;

  financialPeriod: FinancialPeriod | null = null;
  kpiCards: KpiCard[] = [];
  companyName = '';

  // Charts are only rendered when the company has data for them.
  showRevenueChart = false;
  showCustomerChart = false;
  showMarginsChart = false;

  // View state.
  isLoadingCompanies = false;
  isLoadingCompany = false;
  isLoadingPeriod = false;
  emptyData = false;
  errorMessage: string | null = null;

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

    this.loadCompanies();
  }

  onCompanySelected(company: DropdownOption<number>): void {
    this.selectedCompany = company;
    this.companyName = company.label;

    // Clear old dashboard data before loading the new company.
    this.selectedPeriod = null;
    this.selectedComparePeriod = null;
    this.setFinancialPeriod(null);
    this.periods = [];
    this.comparePeriods = [];
    this.setHistory([]);

    this.companyChanges.next(company.value);
  }

  onPeriodSelected(period: DropdownOption<string>): void {
    this.selectedPeriod = period;
    this.selectedComparePeriod = null;

    // Don't allow a period to compare against itself.
    this.comparePeriods = this.periods.filter(option => option.value !== period.value);

    if (!this.selectedCompany) return;

    this.periodChanges.next({
      companyId: this.selectedCompany.value,
      period: period.value
    });
  }

  onComparePeriodSelected(comparePeriod: DropdownOption<string>): void {
    this.selectedComparePeriod = comparePeriod;

    if (!this.selectedCompany || !this.selectedPeriod) return;

    this.periodChanges.next({
      companyId: this.selectedCompany.value,
      period: this.selectedPeriod.value,
      compareTo: comparePeriod.value
    });
  }

  retry(): void {
    this.errorMessage = null;

    if (!this.companies.length) {
      this.loadCompanies();
    } else if (this.selectedCompany) {
      this.onCompanySelected(this.selectedCompany);
    }
  }

  private setFinancialPeriod(financialPeriod: FinancialPeriod | null): void {
    this.financialPeriod = financialPeriod;
    this.kpiCards = buildKpiCards(financialPeriod);
  }

  private setHistory(history: HistoryPeriod[]): void {
    this.history = history;
    this.showRevenueChart = hasSeries(history, 'revenue');
    this.showCustomerChart = hasSeries(history, 'customers');
    this.showMarginsChart =
      hasSeries(history, 'grossMargin') ||
      hasSeries(history, 'operatingMargin') ||
      hasSeries(history, 'ebitdaMargin') ||
      hasSeries(history, 'netMargin');
  }

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
          this.companies = companies.map(company => ({
            label: company.companyName,
            value: company.companyId
          }));

          this.emptyData = companies.length === 0;
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
        this.setHistory(history);
      }),
      catchError(error => {
        this.errorMessage = errorMessage(error, 'Failed to load company data.');
        return EMPTY;
      }),
      finalize(() => (this.isLoadingCompany = false))
    );
  }

  private loadFinancialPeriod(request: PeriodRequest): Observable<unknown> {
    return this.companyService
      .getFinancialPeriod(request.companyId, request.period, request.compareTo)
      .pipe(
        tap(financialPeriod => this.setFinancialPeriod(financialPeriod)),
        catchError(error => {
          this.setFinancialPeriod(null);
          this.errorMessage = errorMessage(error, 'Failed to load the financial period.');
          return EMPTY;
        }),
        finalize(() => (this.isLoadingPeriod = false))
      );
  }
}
