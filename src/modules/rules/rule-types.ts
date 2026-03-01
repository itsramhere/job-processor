export enum actionType{
  SEND_EMAIL = 'SEND_EMAIL',
}

export enum executionMode{
  IMMEDIATE = 'IMMEDIATE',
  DELAYED = 'DELAYED',
}

enum priority{
  HIGH = 'HIGH',
  LOW = 'LOW'
}

export interface rule{
  id: string;
  org_id: string;
  event_type: string;
  action_type: actionType;
  priority: priority.HIGH | priority.LOW;
  execution_mode: executionMode;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface inputRule{
  org_id: string;
  event_type: string;
  action_type: actionType;
  priority: string;
  execution_mode: executionMode;
}