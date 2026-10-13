import { inject, Injectable } from '@angular/core';
import { Observable, catchError, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';

import { renderBoardReportCharts } from '../../features/board-report/board-report-charts';
import {
  buildCompanyReportPdf,
  CompanyReportData,
  companyReportFileName,
  splitHistoryByKind
} from '../../features/board-report/company-report';
import { AiInsight } from '../models/ai-insight.model';
import { CompanyService } from './company.service';
import { InsightService } from './insight.service';

@Injectable({ providedIn: 'root' })
export class CompanyReportService {
  private readonly companies = inject(CompanyService);
  private readonly insights = inject(InsightService);

  /**
   * Loads every period, the company's source documents and any CACHED AI
   * insights. Never generates an insight (GET only; 404 -> omitted).
   */
  loadData(companyId: number, companyName: string): Observable<CompanyReportData> {
    return forkJoin({
      history: this.companies.getHistory(companyId),
      documents: this.companies.getDocuments().pipe(catchError(() => of([])))
    }).pipe(
      switchMap(({ history, documents }) => {
        const insightRequests = history.map(row =>
          this.insights.getInsight(companyId, row.period).pipe(
            map(insight => [row.period, insight] as const),
            catchError(() => of([row.period, null] as const))
          )
        );
        return (insightRequests.length ? forkJoin(insightRequests) : of([])).pipe(
          map(pairs => {
            const insights: Record<string, AiInsight> = {};
            for (const [period, insight] of pairs) if (insight) insights[period] = insight;
            const own = documents.filter(d => d.companyId === companyId);
            return {
              companyName: own[0]?.companyName || companyName,
              history,
              documents: own,
              insights,
              generatedAt: new Date()
            };
          })
        );
      })
    );
  }

  /** Builds and downloads annualflow-<Company>_All_Periods.pdf. */
  async download(companyId: number, companyName: string): Promise<string> {
    const data = await firstValueFrom(this.loadData(companyId, companyName));
    const { annual, quarterly } = splitHistoryByKind(data.history);
    const doc = await buildCompanyReportPdf(data, {
      annual: renderBoardReportCharts(annual),
      quarterly: renderBoardReportCharts(quarterly)
    });
    const fileName = companyReportFileName(data.companyName);
    doc.save(fileName);
    return fileName;
  }
}
