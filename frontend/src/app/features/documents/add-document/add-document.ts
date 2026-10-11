import { Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { errorCode, errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { UploadReportResponse } from '../../../core/models/upload-report.model';
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

  readonly documentAdded = output<void>();

  selectedFile: File | null = null;
  uploadedFileName: string | null = null;
  isUploading = false;

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

  resetUpload(): void {
    this.selectedFile = null;
    this.uploadedFileName = null;
    this.successMessage = null;
    this.errorMessage = null;
    this.conflictMessage = null;
    this.rejectionMessage = null;
  }
}
