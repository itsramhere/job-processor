import { FastifyInstance } from 'fastify';
import { postJobHandler, getJobHandler } from './job-controllers';

export async function jobRoutes(app: FastifyInstance){
  app.post('/new-job', postJobHandler);
  app.get('/:id', getJobHandler);
}