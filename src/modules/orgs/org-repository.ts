import { pool } from '../../config/db';
import { org, user, apiKey, orgStatus, userRole, userStatus, apiKeyStatus, environmentType } from './org-types';

export async function createOrg(input: {
  id: string;
  name: string;
  root_email: string;
  status: orgStatus;
}): Promise<org>{
  const result = await pool.query(
    `INSERT INTO orgs (id, name, root_email, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.id, input.name, input.root_email, input.status]
  );
  return result.rows[0];
}

export async function createUser(input: {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: userRole;
  status: userStatus;
  hashed_pw: string;
}): Promise<user>{
  const result = await pool.query(
    `INSERT INTO users (id, org_id, name, email, role, status, hashed_pw)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.id, input.org_id, input.name, input.email, input.role, input.status, input.hashed_pw]
  );
  return result.rows[0];
}

export async function createApiKey(input: {
  id: string;
  org_id: string;
  api_key: string;
  status: apiKeyStatus;
  environment: environmentType;
}): Promise<apiKey>{
  const result = await pool.query(
    `INSERT INTO api_keys (id, org_id, api_key, status, environment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.id, input.org_id, input.api_key, input.status, input.environment]
  );
  return result.rows[0];
}

export async function findApiKey(key: string): Promise<apiKey | undefined> {
  const result = await pool.query(
    `SELECT * FROM api_keys
     WHERE api_key = $1
       AND status = $2`,
    [key, apiKeyStatus.ACTIVE]
  );
  return result.rows[0];
}

export async function revokeApiKey(keyId: string): Promise<apiKey | undefined>{
  const result = await pool.query(
    `UPDATE api_keys
     SET status = $1, revoked_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [apiKeyStatus.REVOKED, keyId]
  );
  return result.rows[0];
}