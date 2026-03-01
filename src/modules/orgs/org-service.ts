import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createOrg, createUser, createApiKey } from './org-repository';
import {
  orgStatus, userRole, userStatus, apiKeyStatus,
  environmentType, SignupInput, SignupResponse, apiKey
} from './org-types';

function generateApiKey(environment: environmentType): string{
  const prefix = environment === environmentType.PROD ? 'sk_live' : 'sk_test';
  const secret = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${secret}`;
}

export async function signup(input: SignupInput): Promise<SignupResponse>{
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const keyId = crypto.randomUUID();

  await createOrg({
    id: orgId,
    name: input.org_name,
    root_email: input.root_email,
    status: orgStatus.ACTIVE,
  });

  const hashed_pw = await bcrypt.hash(input.password, 10);
  await createUser({
    id: userId,
    org_id: orgId,
    name: 'Admin',
    email: input.root_email,
    role: userRole.ORG_ADMIN,
    status: userStatus.ACTIVE,
    hashed_pw,
  });

  const rawKey = generateApiKey(input.environment);
  await createApiKey({
    id: keyId,
    org_id: orgId,
    api_key: rawKey,
    status: apiKeyStatus.ACTIVE,
    environment: input.environment,
  });
  return { org_id: orgId, api_key: rawKey };
}

export async function issueApiKey(orgId: string, environment: environmentType): Promise<apiKey>{
  const rawKey = generateApiKey(environment);
  return await createApiKey({
    id: crypto.randomUUID(),
    org_id: orgId,
    api_key: rawKey,
    status: apiKeyStatus.ACTIVE,
    environment,
  });
}