export enum status{
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RETRYING = 'RETRYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
};

export enum priority{
  HIGH = 'HIGH',
  LOW = 'LOW',
};

export interface job{
  id: string; 
  org_id: string; 
  event_id: string;
  type: 'SEND_EMAIL'| 'PHONE_CALL'| 'SEND_LETTER';
  priority: priority;
  status:status;
  execution_state: 'QUEUED'| 'IN_FLIGHT'| 'DELAYED';
  payload: Record<string, any>;
  retry_count: number;
  max_retries: number;
  idempotency_key: string;
  locked_by: string | null;
  locked_at: Date | null;
  visibility_timeout_seconds: number;
  created_at: Date;
  updated_at: Date;
}

export interface inputJob{
  id: string;
  org_id: string; 
  event_id: string;
  type: 'SEND_EMAIL'| 'PHONE_CALL'| 'SEND_LETTER';
  priority: priority;
  status:status;
  execution_state: 'QUEUED'| 'IN_FLIGHT'| 'DELAYED';
  payload: Record<string, any>;
  retry_count: number;
  max_retries: number;
  idempotency_key: string;
  locked_by: string | null;
  visibility_timeout_seconds: number;
}

export interface userGivenJob{
  org_id: string; 
  event_id: string;
  type: 'SEND_EMAIL'| 'PHONE_CALL'| 'SEND_LETTER';
  priority: priority;
  payload: Record<string, any>;
  max_retries: number;
}