import { FastifyRequest, FastifyReply } from 'fastify';
import { getMetrics } from './metrics-service';

export async function getMetricsHandler(req: FastifyRequest, reply: FastifyReply){
  try{
    const metrics = await getMetrics();
    return reply.status(200).send(metrics);
  } 
  catch (err: any){
    console.error('getMetricsHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch metrics', details: err.message });
  }
}