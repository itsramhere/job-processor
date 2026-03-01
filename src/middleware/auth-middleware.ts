import { FastifyRequest, FastifyReply } from 'fastify';
import { findApiKey } from '../modules/orgs/org-repository';

declare module 'fastify'{
  interface FastifyRequest {
    orgId: string;
  }
}

export async function apiKeyMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const key = req.headers['x-api-key'];

  if (!key || typeof key !== 'string'){
    return reply.status(401).send({ error: 'Missing x-api-key header' });
  }

  const found = await findApiKey(key);

  if (!found){
    return reply.status(401).send({ error: 'Invalid or revoked API key' });
  }

  req.orgId = found.org_id;
}