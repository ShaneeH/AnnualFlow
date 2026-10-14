import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { FinancialDocument } from '../../../core/models/document.model';
import { CompanyReportService } from '../../../core/services/company-report.service';
import { FindingsExportService } from '../../../core/services/findings-export.service';
import { CompanyService } from '../../../core/services/company.service';
import { DocumentPeriod } from '../../../core/models/document.model';
import { sortPeriodsForDisplay } from '../../../shared/utils/period-sort';
import { periodKind } from '../../../shared/utils/period-kind';

/** Tag colour class by period kind: FY blue, quarters teal, halves/other purple. */
export function periodTagClass(period: string): string {
  return `kind-${periodKind(period)}`;
}

/**
 * Plain-text Type column: "Annual" for annual reports, the quarter(s) for quarterly
 * reports ("Q2", "Q1, Q2"), "H1"/"H2" for half-year reports, otherwise a short type.
 */
export function reportTypeLabel(type: string, periods: string[]): string {
  const t = (type || '').toLowerCase();
  const pick = (re: RegExp) => [...new Set(periods.map(p => p.toUpperCase().match(re)?.[1]).filter((x): x is string => !!x))].sort();
  if (/annual|full.?year|\byear/.test(t)) return 'Annual';
  const quarters = pick(/(?:^|[^A-Z0-9])(Q[1-4])(?![0-9])/);
  const halves = pick(/(?:^|[^A-Z0-9])(H[12])(?![0-9])/);
  if (/quarter|q[1-4]|trading/.test(t)) return quarters.length ? quarters.join(', ') : 'Quarterly';
  if (/interim|half|semi|h[12]/.test(t)) return halves.length ? halves.join(', ') : 'Half-year';
  if (!t) return quarters.length ? quarters.join(', ') : halves.length ? halves.join(', ') : '—';
  const short = type.replace(/\s*(report|update|statement)s?$/i, '').trim();
  return short || type;
}

/** Stable soft hue (0-359) derived from a company name, for its initial avatar. */
export function companyHue(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** How many period tags a row shows before collapsing into "+N more". */
export const VISIBLE_PERIOD_TAGS = 3;

@Component({
  selector: 'app-view-documents',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './view-documents.html',
  styleUrl: './view-documents.css'
})
export class ViewDocuments implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly companyReports = inject(CompanyReportService);
  private readonly findingsExport = inject(FindingsExportService);
  exportingJsonCompanyId: number | null = null;

  readonly visiblePeriodTags = VISIBLE_PERIOD_TAGS;
  expandedDocumentIds = new Set<number>();
  generatingCompanyId: number | null = null;

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
        this.documents = documents.map(document => ({
          ...document,
          periods: sortPeriodsForDisplay(document.periods)
        }));
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

  /** Period tags to show: the first few unless the row is expanded. */
  visiblePeriods(document: FinancialDocument): DocumentPeriod[] {
    return this.expandedDocumentIds.has(document.documentId)
      ? document.periods
      : document.periods.slice(0, VISIBLE_PERIOD_TAGS);
  }

  hiddenPeriodCount(document: FinancialDocument): number {
    return Math.max(0, document.periods.length - VISIBLE_PERIOD_TAGS);
  }

  hiddenPeriodsTitle(document: FinancialDocument): string {
    return document.periods.slice(VISIBLE_PERIOD_TAGS).map(p => p.periodLabel).join(', ');
  }

  togglePeriods(documentId: number): void {
    const next = new Set(this.expandedDocumentIds);
    if (next.has(documentId)) next.delete(documentId);
    else next.add(documentId);
    this.expandedDocumentIds = next;
  }

  readonly periodTagClass = periodTagClass;
  typeLabel(document: FinancialDocument): string {
    return reportTypeLabel(document.reportType, (document.periods ?? []).map(p => p.period));
  }

  companyInitial(name: string): string {
    return (name.trim().match(/[A-Za-z0-9]/)?.[0] ?? '?').toUpperCase();
  }

  avatarStyle(name: string): Record<string, string> {
    const hue = companyHue(name);
    return { color: `hsl(${hue} 55% 72%)`, background: `hsl(${hue} 45% 50% / 0.16)`, 'border-color': `hsl(${hue} 45% 55% / 0.35)` };
  }

  formatPeriodTag(period: string): string {
    return period.replace(/_/g, ' ');
  }

  /** Secondary line under the report name, e.g. "EUR · example.com". */
  documentMeta(document: FinancialDocument): string {
    const parts: string[] = [];
    if (document.currency) parts.push(document.currency);
    const url = this.getSourceUrl(document.source);
    if (url) parts.push(new URL(url).hostname.replace(/^www\./, ''));
    return parts.join(' · ');
  }

  /** All-periods company PDF (cached insights only, no OpenAI). */
  async downloadCompanyReport(document: FinancialDocument): Promise<void> {
    if (this.generatingCompanyId !== null) return;
    this.generatingCompanyId = document.companyId;
    this.errorMessage = null;
    this.successMessage = null;
    try {
      await this.companyReports.download(document.companyId, document.companyName);
    } catch (error) {
      this.errorMessage = errorMessage(error, 'The company report could not be generated.');
    } finally {
      this.generatingCompanyId = null;
    }
  }

  /** All-periods findings JSON for the document's company (cached insights only). */
  async exportCompanyJson(document: FinancialDocument): Promise<void> {
    if (this.exportingJsonCompanyId !== null) return;
    this.exportingJsonCompanyId = document.companyId;
    this.errorMessage = null;
    this.successMessage = null;
    try {
      await this.findingsExport.download(document.companyId, document.companyName, null);
    } catch (error) {
      this.errorMessage = errorMessage(error, 'The JSON export could not be generated.');
    } finally {
      this.exportingJsonCompanyId = null;
    }
  }
}
