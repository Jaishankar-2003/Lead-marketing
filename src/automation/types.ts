export type AutomationCommand = 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RETRY';

export interface AutomationLogMessage {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface WorkerStatusPayload {
  jobId: string;
  status: string;
  currentKeyword?: string;
  completedKeywords: number;
  totalKeywords: number;
  totalDiscovered: number;
  newLeadsSaved: number;
  duplicatesSkipped: number;
  failedRecords: number;
  errorMessage?: string;
}
