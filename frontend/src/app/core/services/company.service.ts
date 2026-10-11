import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import { Company } from '../models/company.model';
import { CompanyPeriod } from '../models/company-period.model';
import {
  DeleteDocumentResponse,
  FinancialDocument
} from '../models/document.model';
import { FinancialPeriod } from '../models/financial-period.model';
import { HistoryPeriod } from '../models/history-period.model';
import { UploadReportResponse } from '../models/upload-report.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly http = inject(HttpClient);

  // Get all companies for the dashboard dropdown.
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${environment.apiUrl}/companies`);
  }

  // Get the available financial periods for one company.
  getPeriods(companyId: number): Observable<CompanyPeriod[]> {
    return this.http.get<CompanyPeriod[]>(
      `${environment.apiUrl}/companies/${companyId}/periods`
    );
  }

  // Get one financial period, with an optional comparison period.
  getFinancialPeriod( companyId: number, period: string, compareTo?: string): Observable<FinancialPeriod> {
    let params = new HttpParams();

    if (compareTo) {
      params = params.set('compareTo', compareTo);
    }

    return this.http.get<FinancialPeriod>(
      `${environment.apiUrl}/companies/${companyId}/periods/${encodeURIComponent(period)}`,
      { params }
    );
  }

  // Historical data is mainly used by the dashboard charts.
  getHistory(companyId: number): Observable<HistoryPeriod[]> {
    return this.http.get<HistoryPeriod[]>(
      `${environment.apiUrl}/companies/${companyId}/history`
    );
  }

  // Send the selected PDF to the backend as multipart form data.
  addDocument(file: File): Observable<UploadReportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadReportResponse>(
      `${environment.apiUrl}/reports/add`,
      formData
    );
  }

  // Get every uploaded report and its linked financial periods.
  getDocuments(): Observable<FinancialDocument[]> {
    return this.http.get<FinancialDocument[]>(
      `${environment.apiUrl}/reports`
    );
  }

  // Delete one uploaded report by its database ID.
  deleteDocument(documentId: number): Observable<DeleteDocumentResponse> {
    return this.http.delete<DeleteDocumentResponse>(
      `${environment.apiUrl}/reports/${documentId}`
    );
  }
}
