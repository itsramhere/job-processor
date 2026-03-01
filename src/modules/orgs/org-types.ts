export enum orgStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum userRole {
  ORG_ADMIN = 'ORG_ADMIN',
  MEMBER = 'MEMBER',
}

export enum userStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum apiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum environmentType {
  DEV = 'DEV',
  STAGING = 'STAGING',
  PROD = 'PROD',
}

export interface org {
  id: string;
  name: string;
  status: orgStatus;
  root_email: string;
  created_at: Date;
  updated_at: Date;
}

export interface user {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: userRole;
  status: userStatus;
  hashed_pw: string;
  created_at: Date;
  updated_at: Date;
}

export interface apiKey {
  id: string;
  org_id: string;
  api_key: string;
  status: apiKeyStatus;
  environment: environmentType;
  created_at: Date;
  revoked_at: Date | null;
}

export interface SignupInput {
  org_name: string;
  root_email: string;
  password: string;
  environment: environmentType;
}

export interface SignupResponse {
  org_id: string;
  api_key: string;
}