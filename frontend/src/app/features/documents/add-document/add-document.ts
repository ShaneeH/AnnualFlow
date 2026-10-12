import { Component, DestroyRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { errorCode, errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { QueuedUploadResponse, ReportJob } from '../../../core/models/report-job.model';
import { UploadReportResponse } from '../../../core/models/upload-report.model';
import { UploadJobsService } from '../../../core/services/upload-jobs.service';
import { CompanyService } from '../../../core/services/company.service';

// Matches the backend default MAX_PDF_SIZE_MB.
const MAX_PDF_SIZE_MB = 20;
const MAX_PDF_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-add-document',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './add-document.html',
  styleUrl: './add-document.scss'
})
export class AddDocument {
  private readonly companyService = inject(CompanyService);
  private readonly uploadJobs = inject(UploadJobsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly documentAdded = output<void>();

  selectedFile: File | null = null;
  uploadedFileName: string | null = null;
  isUploading = false;
  // True while a queued background job is being analysed.
  isProcessing = false;

  successMessage: string | null = null;
  errorMessage: string | null = null;
  conflictMessage: string | null = null;
  // Set when the backend refused the file because it is not a financial report.
  rejectionMessage: string | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Some browsers report an empty MIME type for PDFs, so accept either
    // a PDF MIME type or a .pdf extension, and require the extension.
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const hasPdfType = file.type === '' || file.type === 'application/pdf';

    if (!hasPdfExtension || !hasPdfType) {
      this.errorMessage = 'Please select a PDF document.';
      this.selectedFile = null;
      input.value = '';
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      this.errorMessage = `The PDF is larger than the ${MAX_PDF_SIZE_MB} MB limit.`;
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.selectedFile = file;
    this.uploadedFileName = null;
    this.rejectionMessage = null;
    this.errorMessage = null;
    this.successMessage = null;
  }

  uploadDocument(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a document first.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.conflictMessage = null;
    this.rejectionMessage = null;

    this.companyService.addDocument(this.selectedFile).subscribe({
      next: (response: UploadReportResponse | QueuedUploadResponse) => {
        if ('jobId' in response && response.jobId) {
          this.followJob(response.jobId, this.selectedFile?.name ?? 'document.pdf');
          return;
        }

        this.showSuccess(response as UploadReportResponse);
      },

      error: (error: unknown) => {
        if (errorCode(error) === 'NOT_FINANCIAL_REPORT') {
          this.rejectionMessage = errorMessage(
            error,
            'This document does not look like a financial report, so it was not saved.'
          );
          this.selectedFile = null;
          this.isUploading = false;
          return;
        }

        this.errorMessage = errorMessage(
          error,
          'Something went wrong while analysing the document.'
        );

        this.isUploading = false;
      }
    });
  }

  private showSuccess(response: Pick<UploadReportResponse, 'conflicts'>): void {
    this.uploadedFileName = this.selectedFile?.name ?? this.uploadedFileName;
    this.successMessage = 'Document analysed and added successfully.';

    const conflicts = response.conflicts ?? [];
    if (conflicts.length) {
      const fields = conflicts.map(c => `${c.period} ${c.field}`).join(', ');
      this.conflictMessage = `This upload updated figures that were already stored: ${fields}.`;
    }

    this.selectedFile = null;
    this.isUploading = false;
    this.isProcessing = false;
    this.documentAdded.emit();
  }

  /** Background mode: show "Processing…" and follow the job until it finishes. */
  private followJob(jobId: string, fileName: string): void {
    this.isProcessing = true;
    this.uploadedFileName = fileName;

    this.uploadJobs
      .track(jobId, fileName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(job => this.onJobUpdate(job));
  }

  private onJobUpdate(job: ReportJob): void {
    if (job.status === 'queued' || job.status === 'processing') return;

    this.isUploading = false;
    this.isProcessing = false;

    if (job.status === 'succeeded') {
      this.showSuccess({ conflicts: [] });
      return;
    }

    this.selectedFile = null;

    if (job.errorCode === 'NOT_FINANCIAL_REPORT') {
      this.rejectionMessage = job.error ?? 'This document does not look like a financial report, so it was not saved.';
    } else {
      this.errorMessage = job.error ?? 'The document could not be processed.';
    }
  }

  resetUpload(): void {
    this.selectedFile = null;
    this.uploadedFileName = null;
    this.successMessage = null;
    this.errorMessage = null;
    this.conflictMessage = null;
    this.rejectionMessage = null;
  }
}
