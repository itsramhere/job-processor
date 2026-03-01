export enum eventSource{
  API = 'API',
  SYSTEM = 'SYSTEM',
  WEBHOOK = 'WEBHOOK',
}

export enum severityLevel{
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum eventStatus{
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
}

export interface event{
  id: string;
  org_id: string;
  event_type: string;
  source: eventSource;
  severity: severityLevel;
  payload: Record<string, any>;
  status: eventStatus;
  created_at: Date;
}

export interface inputEvent{
  org_id: string;
  event_type: string;
  source: eventSource;
  severity: severityLevel;
  payload: Record<string, any>;
}