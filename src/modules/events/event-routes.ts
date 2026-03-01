import { FastifyInstance } from 'fastify';
import { postEventHandler, getEventHandler } from './event-controller';

export async function eventRoutes(app: FastifyInstance){
  app.post('/add-event', postEventHandler);
  app.get('/:id', getEventHandler);
}