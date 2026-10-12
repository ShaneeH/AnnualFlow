import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { InsightService } from './insight.service';

describe('InsightService', () => {
  let service: InsightService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/insights/companies/7/periods/Q1_2025`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InsightService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs the cached insight', () => {
    service.getInsight(7, 'Q1_2025').subscribe();
    expect(http.expectOne(base).request.method).toBe('GET');
  });

  it('POSTs to generate without forcing a refresh', () => {
    service.generateInsight(7, 'Q1_2025').subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.has('regenerate')).toBe(false);
  });

  it('POSTs with regenerate=true when regenerating', () => {
    service.generateInsight(7, 'Q1_2025', true).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.params.get('regenerate')).toBe('true');
  });
});
