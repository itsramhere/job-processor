import { FastifyRequest, FastifyReply } from 'fastify';
import { signup, issueApiKey } from './org-service';
import { revokeApiKey } from './org-repository';
import { SignupInput, environmentType } from './org-types';

export async function signupHandler(
  req: FastifyRequest<{ Body: SignupInput }>,
  reply: FastifyReply
){
  try{
    const result = await signup(req.body);
    return reply.status(201).send(result);
  }
   catch (err: any){
    console.error('signupHandler error:', err);
    return reply.status(500).send({ error: 'Signup failed', details: err.message });
  }
}

export async function issueApiKeyHandler(
  req: FastifyRequest<{ Params: { orgId: string }; Body: { environment: environmentType } }>,
  reply: FastifyReply
){
  try{
    const key = await issueApiKey(req.params.orgId, req.body.environment);
    return reply.status(201).send(key);
  }
   catch (err: any){
    console.error('issueApiKeyHandler error:', err);
    return reply.status(500).send({ error: 'Failed to issue API key', details: err.message });
  }
}

export async function revokeApiKeyHandler(
  req: FastifyRequest<{ Params: { keyId: string } }>,
  reply: FastifyReply
) {
  try{
    const key = await revokeApiKey(req.params.keyId);
    if (!key) return reply.status(404).send({ error: 'API key not found' });
    return reply.status(200).send({ message: 'API key revoked', key });
  } 
  catch (err: any){
    console.error('revokeApiKeyHandler error:', err);
    return reply.status(500).send({ error: 'Failed to revoke API key', details: err.message });
  }
}