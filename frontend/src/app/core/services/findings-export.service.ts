import { inject, Injectable } from '@angular/core';
import { Observable, catchError, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';

import { findPreviousPeriod } from '../../features/board-report/board-report';
import {
  buildFindings,
  FindingsExport,
  findingsFileName,
  FindingsPeriodInput,
  findingsToJson
} from '../../features/board-report/findings-json';
import { findingsToXlsx, findingsXlsxFileName } from '../../features/board-report/findings-xlsx';
import { AiInsight } from '../models/ai-insight.model';
import { CompanyPeriod } from '../models/company-period.model';
import { CompanyService } from './company.service';
import { InsightService } from './insight.service';

/** JSON export of the stored financial findings. Reads cached insights only (never calls OpenAI). */
@Injectable({ providedIn: 'root' })
export class FindingsExportService {
  private readonly companies = inject(CompanyService);
  private readonly insights = inject(InsightService);

  private loadPeriod(companyId: number, period: string, all: CompanyPeriod[]): Observable<FindingsPeriodInput> {
    const previous = findPreviousPeriod(all, period);
    return forkJoin({
      financialPeriod: this.companies.getFinancialPeriod(companyId, period, previous ?? undefined),
      insight: this.insights.getInsight(companyId, period).pipe(catchError(() => of(null as AiInsight | null)))
    }).pipe(
      map(({ financialPeriod, insight }) => ({
        financialPeriod,
        insight,
        comparedWith: previous
          ? { period: previous, label: all.find(p => p.period === previous)?.periodLabel ?? previous }
          : null
      }))
    );
  }

  /** One period (period given) or every stored period (period null). */
  load(companyId: number, companyName: string, period: string | null): Observable<FindingsExport> {
    return this.companies.getPeriods(companyId).pipe(
      switchMap(all => {
        const wanted = period ? [period] : all.map(p => p.period);
        return forkJoin({
          periods: wanted.length ? forkJoin(wanted.map(p => this.loadPeriod(companyId, p, all))) : of([]),
          documents: this.companies.getDocuments().pipe(catchError(() => of([])))
        });
      }),
      map(({ periods, documents }) =>
        buildFindings({
          scope: period ? 'period' : 'allPeriods',
          companyId,
          companyName: periods[0]?.financialPeriod.financials.companyName || companyName,
          periods,
          documents,
          generatedAt: new Date()
        })
      )
    );
  }

  async download(companyId: number, companyName: string, period: string | null, format: 'json' | 'xlsx' = 'json'): Promise<string> {
    const findings = await firstValueFrom(this.load(companyId, companyName, period));
    const fileName = format === 'xlsx'
      ? findingsXlsxFileName(findings.company.name, period)
      : findingsFileName(findings.company.name, period);
    const blob = format === 'xlsx'
      ? await findingsToXlsx(findings)
      : new Blob([findingsToJson(findings)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
  }
}
