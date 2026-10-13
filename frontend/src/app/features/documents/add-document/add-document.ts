<<<<<<< HEAD
import { Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { UploadReportResponse } from '../../../core/models/upload-report.model';
import { CompanyService } from '../../../core/services/company.service';
=======
import { Component, DestroyRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { errorCode, errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { QueuedUploadResponse, ReportJob } from '../../../core/models/report-job.model';
import { UploadReportResponse } from '../../../core/models/upload-report.model';
import { UploadJobsService } from '../../../core/services/upload-jobs.service';
import { CompanyService } from '../../../core/services/company.service';
import { MascotComponent } from '../../../shared/components/mascot/mascot';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

// Matches the backend default MAX_PDF_SIZE_MB.
const MAX_PDF_SIZE_MB = 20;
const MAX_PDF_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-add-document',
  standalone: true,
<<<<<<< HEAD
  imports: [RouterLink],
=======
  imports: [RouterLink, MascotComponent],
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  templateUrl: './add-document.html',
  styleUrl: './add-document.scss'
})
export class AddDocument {
  private readonly companyService = inject(CompanyService);
<<<<<<< HEAD

  readonly documentAdded = output<void>();
=======
  private readonly uploadJobs = inject(UploadJobsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly documentAdded = output<void>();
  readonly maxSizeMb = MAX_PDF_SIZE_MB;
  isDragging = false;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

  selectedFile: File | null = null;
  uploadedFileName: string | null = null;
  isUploading = false;
<<<<<<< HEAD
=======
  // True while a queued background job is being analysed.
  isProcessing = false;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

  successMessage: string | null = null;
  errorMessage: string | null = null;
  conflictMessage: string | null = null;
<<<<<<< HEAD
=======
  // Set when the backend refused the file because it is not a financial report.
  rejectionMessage: string | null = null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;
<<<<<<< HEAD

=======
    if (!this.acceptFile(file)) input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    // Ignore leave events fired when moving over child elements.
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    if (files.length > 1) {
      this.errorMessage = 'Please drop one PDF at a time.';
      return;
    }
    this.acceptFile(files[0]);
  }

  fileSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  removeFile(input?: HTMLInputElement): void {
    this.selectedFile = null;
    this.errorMessage = null;
    if (input) input.value = '';
  }

  /** Shared checks for the file picker and drag-and-drop. Returns false if the file was refused. */
  private acceptFile(file: File): boolean {
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    // Some browsers report an empty MIME type for PDFs, so accept either
    // a PDF MIME type or a .pdf extension, and require the extension.
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const hasPdfType = file.type === '' || file.type === 'application/pdf';

    if (!hasPdfExtension || !hasPdfType) {
      this.errorMessage = 'Please select a PDF document.';
      this.selectedFile = null;
<<<<<<< HEAD
      input.value = '';
      return;
=======
      return false;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    }

    if (file.size > MAX_PDF_BYTES) {
      this.errorMessage = `The PDF is larger than the ${MAX_PDF_SIZE_MB} MB limit.`;
      this.selectedFile = null;
<<<<<<< HEAD
      input.value = '';
      return;
=======
      return false;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    }

    this.selectedFile = file;
    this.uploadedFileName = null;
<<<<<<< HEAD
    this.errorMessage = null;
    this.successMessage = null;
=======
    this.rejectionMessage = null;
    this.errorMessage = null;
    this.successMessage = null;
    return true;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
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
<<<<<<< HEAD

    this.companyService.addDocument(this.selectedFile).subscribe({
      next: (response: UploadReportResponse) => {
        this.uploadedFileName = this.selectedFile?.name ?? null;
        this.successMessage = 'Document analysed and added successfully.';

        const conflicts = response.conflicts ?? [];
        if (conflicts.length) {
          const fields = conflicts.map(c => `${c.period} ${c.field}`).join(', ');
          this.conflictMessage =
            `This upload updated figures that were already stored: ${fields}.`;
        }
        this.selectedFile = null;
        this.isUploading = false;
        this.documentAdded.emit();
      },

      error: (error: unknown) => {
=======
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

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        this.errorMessage = errorMessage(
          error,
          'Something went wrong while analysing the document.'
        );

        this.isUploading = false;
      }
    });
  }

<<<<<<< HEAD
=======
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

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  resetUpload(): void {
    this.selectedFile = null;
    this.uploadedFileName = null;
    this.successMessage = null;
    this.errorMessage = null;
    this.conflictMessage = null;
<<<<<<< HEAD
=======
    this.rejectionMessage = null;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  }
}
