import { FastifyInstance } from 'fastify';
import { signupHandler, issueApiKeyHandler, revokeApiKeyHandler } from './org-controllers';

export async function orgRoutes(app: FastifyInstance){
  app.post('/signup', signupHandler);
  app.post('/:orgId/api-keys', issueApiKeyHandler);
  app.delete('/api-keys/:keyId', revokeApiKeyHandler);
}