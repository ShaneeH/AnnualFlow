import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { FinancialDocument } from '../../../core/models/document.model';
import { CompanyService } from '../../../core/services/company.service';
import { CompanyReportService } from '../../../core/services/company-report.service';
import { FindingsExportService } from '../../../core/services/findings-export.service';
import { companyHue, periodTagClass, reportTypeLabel, ViewDocuments } from './view-documents';

describe('ViewDocuments', () => {
  let component: ViewDocuments;
  let fixture: ComponentFixture<ViewDocuments>;

  const document: FinancialDocument = {
    documentId: 12,
    companyId: 1,
    companyName: 'Senus PLC',
    isOwned: true,
    reportName: 'Annual Report 2025',
    reportType: 'Annual Report',
    reportDate: '2025-12-31',
    currency: 'EUR',
    source: 'https://example.com/report.pdf',
    uploadedAt: '2026-09-04T20:00:00.000Z',
    periods: [
      {
        periodId: 7,
        period: 'FY2025',
        periodLabel: 'Full Year 2025',
        periodEnd: '2025-12-31'
      }
    ]
  };

  const companyService = {
    getDocuments: vi.fn(),
    deleteDocument: vi.fn()
  };

  const companyReports = { download: vi.fn() };
  const findingsExport = { download: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    companyService.getDocuments.mockReturnValue(of([document]));

    await TestBed.configureTestingModule({
      imports: [ViewDocuments],
      providers: [
        { provide: CompanyService, useValue: companyService },
        { provide: CompanyReportService, useValue: companyReports },
        { provide: FindingsExportService, useValue: findingsExport }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewDocuments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and display the uploaded documents', () => {
    expect(companyService.getDocuments).toHaveBeenCalledTimes(1);
    expect(component.documents).toEqual([document]);
    expect(fixture.nativeElement.textContent).toContain('Annual Report 2025');
    expect(fixture.nativeElement.textContent).toContain('Senus PLC');
    expect(fixture.nativeElement.textContent).toContain('FY2025');
  });

  it('should delete a confirmed document', () => {
    companyService.deleteDocument.mockReturnValue(of({
      success: true,
      message: 'Document deleted successfully.'
    }));

    component.requestDelete(document.documentId);
    component.confirmDelete(document);

    expect(companyService.deleteDocument).toHaveBeenCalledWith(12);
    expect(component.documents).toEqual([]);
    expect(component.successMessage).toBe('Document deleted successfully.');
  });

  it('should show the backend message when loading fails', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { error: 'Failed to retrieve documents.' }
    });

    companyService.getDocuments.mockReturnValue(throwError(() => error));
    component.loadDocuments();

    expect(component.errorMessage).toBe('Failed to retrieve documents.');
    expect(component.isLoading).toBe(false);
  });

  it('sorts periods (FY first) and collapses extras into "+N more"', () => {
    const many: FinancialDocument = {
      ...document,
      documentId: 13,
      periods: [
        { periodId: 1, period: 'Q1_2025', periodLabel: 'Q1 2025', periodEnd: '2025-03-31' },
        { periodId: 2, period: 'H1_2025', periodLabel: 'H1 2025', periodEnd: '2025-06-30' },
        { periodId: 3, period: 'FY2024', periodLabel: 'FY 2024', periodEnd: '2024-12-31' },
        { periodId: 4, period: 'Q2_2025', periodLabel: 'Q2 2025', periodEnd: '2025-06-30' },
        { periodId: 5, period: 'FY2025', periodLabel: 'FY 2025', periodEnd: '2025-12-31' }
      ]
    };
    companyService.getDocuments.mockReturnValue(of([many]));
    component.loadDocuments();
    fixture.detectChanges();

    const loaded = component.documents[0];
    expect(loaded.periods.map(p => p.period)).toEqual(['FY2025', 'FY2024', 'Q2_2025', 'Q1_2025', 'H1_2025']);
    expect(component.visiblePeriods(loaded)).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('+2 more');

    component.togglePeriods(13);
    expect(component.visiblePeriods(loaded)).toHaveLength(5);
  });

  it('has an accessible delete icon button and downloads the company report', async () => {
    const del = fixture.nativeElement.querySelector('button[aria-label="Delete Annual Report 2025"]');
    expect(del).toBeTruthy();

    companyReports.download.mockResolvedValue('annualflow-Senus_PLC_All_Periods.pdf');
    await component.downloadCompanyReport(component.documents[0]);
    expect(companyReports.download).toHaveBeenCalledWith(1, 'Senus PLC');
    expect(component.generatingCompanyId).toBeNull();
  });

  it('colours period tags by kind, plain report type labels and avatars by name', () => {
    expect(periodTagClass('FY2025')).toBe('kind-annual');
    expect(periodTagClass('Q3_2025')).toBe('kind-quarterly');
    expect(periodTagClass('H1_2025')).toBe('kind-other');
    expect(reportTypeLabel('Annual Report', ['FY2025', 'Q1_2025'])).toBe('Annual');
    expect(reportTypeLabel('Quarterly Update', ['Q2_2025'])).toBe('Q2');
    expect(reportTypeLabel('Quarterly Update', ['Q2_2025', 'Q1_2025'])).toBe('Q1, Q2');
    expect(reportTypeLabel('Interim Report', ['H1_2025'])).toBe('H1');
    expect(reportTypeLabel('Interim Report', [])).toBe('Half-year');
    expect(reportTypeLabel('Press release', [])).toBe('Press release');
    expect(reportTypeLabel('Trading Statement', ['Q3_2025'])).toBe('Q3');
    expect(fixture.nativeElement.querySelector('.type-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pdf-tile')).toBeNull();
    expect(fixture.nativeElement.querySelector('.report-meta')?.textContent).not.toContain('PDF');
    expect(companyHue('Senus PLC')).toBe(companyHue('Senus PLC'));
    expect(fixture.nativeElement.querySelector('.tag.kind-annual')?.textContent).toContain('FY2025');
    expect(fixture.nativeElement.querySelector('.avatar')?.textContent?.trim()).toBe('S');
  });

  it('exports the company findings as JSON from a row', async () => {
    findingsExport.download.mockResolvedValue('x.json');
    expect(fixture.nativeElement.querySelector('button[aria-label="Export JSON for Senus PLC"]')).toBeTruthy();
    await component.exportCompanyJson(component.documents[0]);
    expect(findingsExport.download).toHaveBeenCalledWith(1, 'Senus PLC', null);
    expect(component.exportingJsonCompanyId).toBeNull();
  });
});
