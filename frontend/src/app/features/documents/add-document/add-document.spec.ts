import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AddDocument } from './add-document';
import { CompanyService } from '../../../core/services/company.service';
import { UploadJobsService } from '../../../core/services/upload-jobs.service';
import { ReportJob } from '../../../core/models/report-job.model';

describe('AddDocument', () => {
  let component: AddDocument;
  let fixture: ComponentFixture<AddDocument>;

  const companyService = {
    addDocument: vi.fn()
  };

  let jobUpdates: Subject<ReportJob>;
  const uploadJobs = { track: vi.fn() };

  const job = (status: ReportJob['status'], extra: Partial<ReportJob> = {}): ReportJob => ({
    jobId: 'job-1', status, originalName: 'report.pdf', error: null, errorCode: null,
    documentId: null, createdAt: '', startedAt: null, finishedAt: null, ...extra
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    jobUpdates = new Subject<ReportJob>();
    uploadJobs.track.mockReturnValue(jobUpdates.asObservable());

    await TestBed.configureTestingModule({
      imports: [AddDocument],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: companyService },
        { provide: UploadJobsService, useValue: uploadJobs }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddDocument);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept a PDF file', () => {
    const file = new File(['test'], 'report.pdf', {
      type: 'application/pdf'
    });

    const event = {
      target: {
        files: [file]
      }
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile).toBe(file);
    expect(component.errorMessage).toBeNull();
    expect(component.successMessage).toBeNull();
  });

  it('should reject a non PDF file', () => {
    const file = new File(['test'], 'report.txt', {
      type: 'text/plain'
    });

    const event = {
      target: {
        files: [file]
      }
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile).toBeNull();
    expect(component.errorMessage).toBe('Please select a PDF document.');
  });

  it('should show an error if no document is selected', () => {
    component.selectedFile = null;

    component.uploadDocument();

    expect(component.errorMessage).toBe('Please select a document first.');
    expect(companyService.addDocument).not.toHaveBeenCalled();
  });

  it('should upload the selected document', () => {
    const file = new File(['test'], 'report.pdf', {
      type: 'application/pdf'
    });

    const response = {
      success: true
    } as any;

    component.selectedFile = file;
    companyService.addDocument.mockReturnValue(of(response));

    component.uploadDocument();

    expect(companyService.addDocument).toHaveBeenCalledWith(file);
  });

  it('should show a success message after upload', () => {
    const file = new File(['test'], 'report.pdf', {
      type: 'application/pdf'
    });

    const response = {
      success: true
    } as any;

    component.selectedFile = file;
    companyService.addDocument.mockReturnValue(of(response));

    component.uploadDocument();

    expect(component.successMessage)
      .toBe('Document analysed and added successfully.');

    expect(component.selectedFile).toBeNull();
    expect(component.isUploading).toBe(false);
  });

  it('should show the backend error message when upload fails', () => {
    const file = new File(['test'], 'report.pdf', {
      type: 'application/pdf'
    });

    const error = new HttpErrorResponse({
      status: 409,
      error: {
        error: 'This exact PDF has already been uploaded.'
      }
    });

    component.selectedFile = file;

    companyService.addDocument.mockReturnValue(
      throwError(() => error)
    );

    component.uploadDocument();

    expect(component.errorMessage)
      .toBe('This exact PDF has already been uploaded.');

    expect(component.isUploading).toBe(false);
  });

  it('should show a fallback error if the backend gives no message', () => {
    const file = new File(['test'], 'report.pdf', {
      type: 'application/pdf'
    });

    const error = new HttpErrorResponse({
      status: 500
    });

    component.selectedFile = file;

    companyService.addDocument.mockReturnValue(
      throwError(() => error)
    );

    component.uploadDocument();

    expect(component.errorMessage)
      .toBe('Something went wrong while analysing the document.');

    expect(component.isUploading).toBe(false);
  });

  it('should show a dedicated rejection card for non-financial documents', () => {
    component.selectedFile = new File(['%PDF-'], 'shane-cv.pdf', {
      type: 'application/pdf'
    });

    companyService.addDocument.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 422,
        error: {
          success: false,
          code: 'NOT_FINANCIAL_REPORT',
          error: 'This document does not look like a financial report (detected: CV / Resume), so it was not saved.'
        }
      }))
    );

    component.uploadDocument();
    fixture.detectChanges();

    expect(component.rejectionMessage).toContain('CV / Resume');
    expect(component.errorMessage).toBeNull();
    expect(component.selectedFile).toBeNull();
    expect(component.isUploading).toBe(false);

    const card: HTMLElement | null = fixture.nativeElement.querySelector('.rejection-card');
    expect(card?.textContent).toContain('Not a financial report');
    expect(card?.textContent).toContain('Nothing was saved');
  });

  it('should show the backend message for AI service errors, not a generic one', () => {
    component.selectedFile = new File(['%PDF-'], 'report.pdf', { type: 'application/pdf' });
    companyService.addDocument.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 502,
        error: {
          success: false,
          error: "The AI service rejected the request: Invalid schema for response_format 'financial_report'.",
          requestId: 'req-9'
        }
      }))
    );

    component.uploadDocument();

    expect(component.errorMessage).toContain('Invalid schema');
    expect(component.rejectionMessage).toBeNull();
  });

  describe('background jobs (202 response)', () => {
    function queue(): void {
      component.selectedFile = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' });
      companyService.addDocument.mockReturnValue(of({
        success: true, message: 'queued', jobId: 'job-1', status: 'queued', statusUrl: '/api/reports/jobs/job-1'
      }));
      component.uploadDocument();
      fixture.detectChanges();
    }

    it('shows Processing… while the job runs', () => {
      queue();
      jobUpdates.next(job('processing'));
      fixture.detectChanges();

      expect(uploadJobs.track).toHaveBeenCalledWith('job-1', 'report.pdf');
      expect(component.isProcessing).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Processing…');
      expect(component.successMessage).toBeNull();
    });

    it('shows success and emits documentAdded when the job succeeds', () => {
      const added = vi.fn();
      component.documentAdded.subscribe(added);
      queue();
      jobUpdates.next(job('succeeded', { documentId: 9 }));

      expect(component.successMessage).toBe('Document analysed and added successfully.');
      expect(component.isProcessing).toBe(false);
      expect(component.isUploading).toBe(false);
      expect(added).toHaveBeenCalled();
    });

    it('shows the rejection card when the job is rejected as non-financial', () => {
      queue();
      jobUpdates.next(job('rejected', { errorCode: 'NOT_FINANCIAL_REPORT', error: 'This looks like a CV.' }));
      fixture.detectChanges();

      expect(component.rejectionMessage).toBe('This looks like a CV.');
      expect(component.errorMessage).toBeNull();
    });

    it('shows the job error when processing fails', () => {
      queue();
      jobUpdates.next(job('failed', { error: 'OpenAI rejected the API key.' }));

      expect(component.errorMessage).toBe('OpenAI rejected the API key.');
      expect(component.isProcessing).toBe(false);
    });
  });

  it('accepts a dropped PDF, shows Analyse only once a file is chosen, and can remove it', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.upload-button')).toBeNull();
    expect(el.querySelector('.drop-hint')!.textContent).toContain('PDF only, up to 20 MB');

    const pdf = new File(['%PDF-1.4'], 'annual.pdf', { type: 'application/pdf' });
    const drop = new Event('drop') as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [pdf] } });
    el.querySelector('.drop-zone')!.dispatchEvent(drop);
    fixture.detectChanges();

    expect(component.selectedFile).toBe(pdf);
    expect(el.querySelector('.file-name')!.textContent).toContain('annual.pdf');
    expect(el.querySelector('.upload-button')!.textContent).toContain('Analyse document');

    el.querySelector<HTMLButtonElement>('.selected-file .text-button')!.click();
    fixture.detectChanges();
    expect(component.selectedFile).toBeNull();
    expect(el.querySelector('.drop-zone')).not.toBeNull();
  });

  it('refuses dropped non-PDF files', () => {
    const drop = new Event('drop') as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    component.onDrop(drop);
    expect(component.selectedFile).toBeNull();
    expect(component.errorMessage).toBe('Please select a PDF document.');
  });
});
