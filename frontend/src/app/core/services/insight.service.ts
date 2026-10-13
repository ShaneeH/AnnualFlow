import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AiInsight } from '../models/ai-insight.model';

@Injectable({ providedIn: 'root' })
export class InsightService {
  private readonly http = inject(HttpClient);

  private url(companyId: number, period: string): string {
    return `${environment.apiUrl}/insights/companies/${companyId}/periods/${encodeURIComponent(period)}`;
  }

  /** Cached insight only (404 when none has been generated yet). */
  getInsight(companyId: number, period: string): Observable<AiInsight> {
    return this.http.get<AiInsight>(this.url(companyId, period));
  }

  /** Generate on demand; regenerate=true forces a fresh insight. */
  generateInsight(companyId: number, period: string, regenerate = false): Observable<AiInsight> {
    const params = regenerate ? new HttpParams().set('regenerate', 'true') : undefined;
    return this.http.post<AiInsight>(this.url(companyId, period), null, { params });
  }
}
