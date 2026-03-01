import {FastifyRequest, FastifyReply } from 'fastify';
import {createJob, fetchJobById } from './job-services';
import {userGivenJob} from './job-types';

export async function postJobHandler(
  req: FastifyRequest<{ Body: userGivenJob }>,
  reply: FastifyReply
){
  try{
    const job = await createJob(req.body);
    return reply.status(201).send(job);
  } 
  catch (err: any){
    console.error('postJobHandler error:', err);
    return reply.status(500).send({ error: 'Failed to create job', details: err.message });
  }
}

export async function getJobHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
){
  try{
    const job = await fetchJobById(req.params.id);
    if(!job){
      return reply.status(404).send({ error: 'Job not found' });
    }
    
    return reply.status(200).send(job);
  } 
  catch (err: any){
    console.error('getJobHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch job', details: err.message });
  }
}