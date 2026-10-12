import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, ReplaySubject, catchError, of, switchMap, takeWhile, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { errorMessage } from '../interceptors/api-error.interceptor';
import { isTerminalJob, ReportJob } from '../models/report-job.model';
import { ToastService } from './toast.service';

/** How often job status is polled, and for how long at most. */
export const JOB_POLL_INTERVAL_MS = 2000;
export const JOB_POLL_MAX_ATTEMPTS = 450; // ~15 minutes

/**
 * Tracks background upload jobs. Polling lives in this root service (not in
 * the page component) so the user still gets a toast when the job finishes
 * after they have navigated elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class UploadJobsService {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(ToastService);
  private readonly tracked = new Map<string, ReplaySubject<ReportJob>>();

  pollIntervalMs = JOB_POLL_INTERVAL_MS;

  getJob(jobId: string): Observable<ReportJob> {
    return this.http.get<ReportJob>(`${environment.apiUrl}/reports/jobs/${encodeURIComponent(jobId)}`);
  }

  /** Starts (or joins) polling; emits each status and completes when finished. */
  track(jobId: string, fileName: string): Observable<ReportJob> {
    const existing = this.tracked.get(jobId);
    if (existing) return existing.asObservable();

    const updates = new ReplaySubject<ReportJob>(1);
    this.tracked.set(jobId, updates);
    let attempts = 0;
    let transientErrors = 0;

    timer(0, this.pollIntervalMs)
      .pipe(
        switchMap(() => {
          attempts += 1;
          return this.getJob(jobId).pipe(
            catchError(error => {
              // Tolerate brief network blips; give up after several in a row.
              transientErrors += 1;
              if (transientErrors < 5 && attempts < JOB_POLL_MAX_ATTEMPTS) return of(null);
              return of(this.failedJob(jobId, fileName, errorMessage(error, 'Lost contact with the server.')));
            })
          );
        }),
        takeWhile(job => {
          if (job === null) return true;
          transientErrors = 0;
          return !isTerminalJob(job) && attempts < JOB_POLL_MAX_ATTEMPTS;
        }, true)
      )
      .subscribe({
        next: job => {
          if (!job) return;
          const final = !isTerminalJob(job) && attempts >= JOB_POLL_MAX_ATTEMPTS
            ? this.failedJob(jobId, fileName, 'Still processing after 15 minutes. Check My Reports later.')
            : job;
          updates.next(final);
          if (isTerminalJob(final)) this.notify(final, fileName);
        },
        complete: () => {
          updates.complete();
          this.tracked.delete(jobId);
        }
      });

    return updates.asObservable();
  }

  private failedJob(jobId: string, fileName: string, error: string): ReportJob {
    return {
      jobId, status: 'failed', originalName: fileName, error, errorCode: null,
      documentId: null, createdAt: '', startedAt: null, finishedAt: null
    };
  }

  private notify(job: ReportJob, fileName: string): void {
    switch (job.status) {
      case 'succeeded':
        this.toasts.show('success', 'Report added', `${fileName} was analysed and added to your dashboard.`);
        break;
      case 'rejected':
        this.toasts.show(
          'warning',
          job.errorCode === 'NOT_FINANCIAL_REPORT' ? 'Not a financial report' : 'Upload rejected',
          job.error ?? `${fileName} was not saved.`,
          9000
        );
        break;
      default:
        this.toasts.show('error', 'Processing failed', job.error ?? `${fileName} could not be processed.`, 9000);
    }
  }
}
