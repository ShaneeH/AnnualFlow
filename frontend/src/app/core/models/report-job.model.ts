export type ReportJobStatus = 'queued' | 'processing' | 'succeeded' | 'rejected' | 'failed';

export interface ReportJob {
  jobId: string;
  status: ReportJobStatus;
  originalName: string;
  error: string | null;
  errorCode: string | null;
  documentId: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** 202 response when the backend queued the upload (JOB_MODE=async). */
export interface QueuedUploadResponse {
  success: boolean;
  message: string;
  jobId: string;
  status: ReportJobStatus;
  statusUrl: string;
}

export const TERMINAL_JOB_STATUSES: readonly ReportJobStatus[] = ['succeeded', 'rejected', 'failed'];

export function isTerminalJob(job: Pick<ReportJob, 'status'>): boolean {
  return TERMINAL_JOB_STATUSES.includes(job.status);
}
