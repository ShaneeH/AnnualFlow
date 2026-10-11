import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { FinancialDocument } from '../../../core/models/document.model';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-view-documents',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './view-documents.html',
  styleUrl: './view-documents.css'
})
export class ViewDocuments implements OnInit {
  private readonly companyService = inject(CompanyService);

  documents: FinancialDocument[] = [];
  isLoading = false;
  pendingDeleteId: number | null = null;
  deletingDocumentId: number | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.companyService.getDocuments().subscribe({
      next: documents => {
        this.documents = documents;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = errorMessage(
          error,
          'Something went wrong while loading the documents.'
        );
        this.isLoading = false;
      }
    });
  }

  requestDelete(documentId: number): void {
    this.pendingDeleteId = documentId;
    this.errorMessage = null;
    this.successMessage = null;
  }

  cancelDelete(): void {
    this.pendingDeleteId = null;
  }

  confirmDelete(document: FinancialDocument): void {
    this.deletingDocumentId = document.documentId;
    this.errorMessage = null;
    this.successMessage = null;

    this.companyService.deleteDocument(document.documentId).subscribe({
      next: response => {
        this.documents = this.documents.filter(
          item => item.documentId !== document.documentId
        );
        this.successMessage = response.message;
        this.pendingDeleteId = null;
        this.deletingDocumentId = null;
      },
      error: (error: unknown) => {
        this.errorMessage = errorMessage(
          error,
          'Something went wrong while deleting the document.'
        );
        this.deletingDocumentId = null;
      }
    });
  }

  getSourceUrl(source: string | null): string | null {
    if (!source) return null;

    try {
      const url = new URL(source);

      return url.protocol === 'http:' || url.protocol === 'https:'
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }
}
