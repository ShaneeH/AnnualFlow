import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { ReportJob } from '../models/report-job.model';
import { ToastService } from './toast.service';
import { UploadJobsService } from './upload-jobs.service';

describe('UploadJobsService', () => {
  let service: UploadJobsService;
  let http: HttpTestingController;
  let toasts: ToastService;
  const url = `${environment.apiUrl}/reports/jobs/job-1`;

  const job = (status: ReportJob['status'], extra: Partial<ReportJob> = {}): ReportJob => ({
    jobId: 'job-1', status, originalName: 'report.pdf', error: null, errorCode: null,
    documentId: null, createdAt: '', startedAt: null, finishedAt: null, ...extra
  });

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UploadJobsService);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('polls until the job finishes, then shows a success toast and stops', () => {
    const seen: string[] = [];
    let completed = false;
    service.track('job-1', 'report.pdf').subscribe({ next: j => seen.push(j.status), complete: () => (completed = true) });

    vi.advanceTimersByTime(0);
    http.expectOne(url).flush(job('queued'));
    vi.advanceTimersByTime(2000);
    http.expectOne(url).flush(job('processing'));
    vi.advanceTimersByTime(2000);
    http.expectOne(url).flush(job('succeeded', { documentId: 3 }));
    vi.advanceTimersByTime(4000);
    http.expectNone(url);

    expect(seen).toEqual(['queued', 'processing', 'succeeded']);
    expect(completed).toBe(true);
    expect(toasts.toasts()[0]).toMatchObject({ kind: 'success', title: 'Report added' });
  });

  it('shows a warning toast for a rejected (non-financial) document', () => {
    service.track('job-1', 'cv.pdf').subscribe();
    vi.advanceTimersByTime(0);
    http.expectOne(url).flush(job('rejected', { errorCode: 'NOT_FINANCIAL_REPORT', error: 'Looks like a CV.' }));

    expect(toasts.toasts()[0]).toMatchObject({ kind: 'warning', title: 'Not a financial report', message: 'Looks like a CV.' });
  });

  it('shows an error toast for a failed job', () => {
    service.track('job-1', 'report.pdf').subscribe();
    vi.advanceTimersByTime(0);
    http.expectOne(url).flush(job('failed', { error: 'Model not found.' }));

    expect(toasts.toasts()[0]).toMatchObject({ kind: 'error', message: 'Model not found.' });
  });

  it('shares one poll between subscribers of the same job', () => {
    service.track('job-1', 'report.pdf').subscribe();
    service.track('job-1', 'report.pdf').subscribe();
    vi.advanceTimersByTime(0);
    http.expectOne(url).flush(job('succeeded'));
    expect(toasts.toasts().length).toBe(1);
  });
});

describe('ToastService', () => {
  it('adds and auto-dismisses toasts', () => {
    vi.useFakeTimers();
    const service = new ToastService();
    service.show('info', 'Hi', 'There', 1000);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(service.toasts().length).toBe(0);
    vi.useRealTimers();
  });
});
