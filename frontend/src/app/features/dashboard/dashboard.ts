import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
import { RevenueChartComponent } from '../../shared/components/revenue-chart/revenue-chart';

interface PeriodRequest {
  companyId: number;
  period: string;
  compareTo?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DropdownSelectComponent, KpiCardComponent, RevenueChartComponent, CustomerChartComponent],
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
  companyName = '';

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
    this.financialPeriod = null;
    this.periods = [];
    this.comparePeriods = [];
    this.history = [];

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
        this.history = history;
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
        tap(financialPeriod => (this.financialPeriod = financialPeriod)),
        catchError(error => {
          this.financialPeriod = null;
          this.errorMessage = errorMessage(error, 'Failed to load the financial period.');
          return EMPTY;
        }),
        finalize(() => (this.isLoadingPeriod = false))
      );
  }
}
