import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AddDocument } from './add-document';
import { CompanyService } from '../../../core/services/company.service';

describe('AddDocument', () => {
  let component: AddDocument;
  let fixture: ComponentFixture<AddDocument>;

  const companyService = {
    addDocument: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AddDocument],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: companyService }
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
});
