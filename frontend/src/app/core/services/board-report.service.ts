import { inject, Injectable } from '@angular/core';
import { Observable, catchError, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';

import { renderBoardReportCharts } from '../../features/board-report/board-report-charts';
import {
  BoardReportData,
  boardReportFileName,
  buildBoardReportPdf,
  findPreviousPeriod
} from '../../features/board-report/board-report';
import { AiInsight } from '../models/ai-insight.model';
import { CompanyService } from './company.service';
import { InsightService } from './insight.service';

@Injectable({ providedIn: 'root' })
export class BoardReportService {
  private readonly companies = inject(CompanyService);
  private readonly insights = inject(InsightService);

  /**
   * Loads the period, previous-period comparison, history and the CACHED AI
   * insight. Never generates an insight (GET only; 404 -> omitted).
   */
  loadData(companyId: number, period: string, companyName: string): Observable<BoardReportData> {
    return this.companies.getPeriods(companyId).pipe(
      switchMap(periods => {
        const previous = findPreviousPeriod(periods, period);
        const previousLabel = periods.find(p => p.period === previous)?.periodLabel ?? null;

        return forkJoin({
          financialPeriod: this.companies.getFinancialPeriod(companyId, period, previous ?? undefined),
          history: this.companies.getHistory(companyId).pipe(catchError(() => of([]))),
          // No insight cached (404) or any failure: the section is omitted.
          insight: this.insights
            .getInsight(companyId, period)
            .pipe(catchError(() => of(null as AiInsight | null)))
        }).pipe(
          map(({ financialPeriod, history, insight }) => ({
            companyName: financialPeriod.financials.companyName || companyName,
            period,
            periodLabel: financialPeriod.financials.periodLabel || period,
            previousPeriodLabel: previous ? previousLabel ?? previous : null,
            financialPeriod,
            history,
            insight,
            generatedAt: new Date()
          }))
        );
      })
    );
  }

  /** Builds and downloads ReportHub_<Company>_<Period>.pdf. */
  async download(companyId: number, period: string, companyName: string): Promise<string> {
    const data = await firstValueFrom(this.loadData(companyId, period, companyName));
    const doc = await buildBoardReportPdf(data, renderBoardReportCharts(data.history));
    const fileName = boardReportFileName(data.companyName, data.period);

    doc.save(fileName);
    return fileName;
  }
}
