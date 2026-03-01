import { FastifyInstance } from 'fastify';
import { postJobHandler, getJobHandler, getDeadJobsHandler } from './job-controllers';

export async function jobRoutes(app: FastifyInstance){
  app.post('/new-job', postJobHandler);
  app.get('/dead', getDeadJobsHandler);
  app.get('/:id', getJobHandler);
}