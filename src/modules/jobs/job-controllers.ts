import {FastifyRequest, FastifyReply } from 'fastify';
import {createJob, fetchJobById } from './job-services';
import {userGivenJob} from './job-types';
import { getDeadJobs } from './job-repository';
import { getDeadQueue } from '../../queue/dead-queue';

export async function postJobHandler(
  req: FastifyRequest<{ Body: userGivenJob }>,
  reply: FastifyReply
){
  try{
    const safeBody = {
      ...req.body,
      org_id: req.orgId 
    };
    const job = await createJob(safeBody);
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
    if(job.org_id !== req.orgId){
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return reply.status(200).send(job);
  } 
  catch (err: any){
    console.error('getJobHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch job', details: err.message });
  }
}

export async function getDeadJobsHandler(
  req: FastifyRequest,
  reply: FastifyReply
){
  try{
    const [dbJobs, redisIds] = await Promise.all([
      getDeadJobs(),
      getDeadQueue(),
    ]);
    return reply.status(200).send({
      count: dbJobs.length,
      redis_ids: redisIds,
      jobs: dbJobs, 
    });
  }
   catch (err: any){
    console.error('getDeadJobsHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch dead jobs', details: err.message });
  }
}
