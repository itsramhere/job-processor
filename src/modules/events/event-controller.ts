import { FastifyRequest, FastifyReply } from 'fastify';
import { processEvent, fetchEventById } from './event-service';
import { inputEvent } from './event-types';

export async function postEventHandler(
  req: FastifyRequest<{ Body: inputEvent }>,
  reply: FastifyReply
){
  try{
    const safeBody = {
      ...req.body,
      org_id: req.orgId
    };
    
    const event = await processEvent(safeBody);
    return reply.status(201).send(event);
  } 
  catch (err: any){
    console.error('postEventHandler error:', err);
    return reply.status(500).send({ error: 'Failed to process event', details: err.message });
  }
}

export async function getEventHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
){
  try{
    const event = await fetchEventById(req.params.id);
    if (!event){
      return reply.status(404).send({ error: 'Event not found' });
    }
    if (event.org_id !== req.orgId){
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return reply.status(200).send(event);
  } 
  catch (err: any){
    console.error('getEventHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch event', details: err.message });
  }
}