export interface DocumentPeriod {
  periodId: number;
  period: string;
  periodLabel: string;
  periodEnd: string | null;
}

export interface FinancialDocument {
  documentId: number;
  companyId: number;
  companyName: string;
  reportName: string;
  reportType: string;
  reportDate: string | null;
  currency: string | null;
  source: string | null;
  uploadedAt: string;
<<<<<<< HEAD
=======
  /** SHA-256 of the uploaded PDF. */
  documentHash?: string | null;
  /** True for the signed-in user's own reports; false for public example data. */
  isOwned?: boolean;
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  periods: DocumentPeriod[];
}

export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
}
