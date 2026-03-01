import { FastifyInstance } from 'fastify';
import { getMetricsHandler } from './metrics-controller';

export async function metricsRoutes(app: FastifyInstance){
  app.get('', getMetricsHandler);
}