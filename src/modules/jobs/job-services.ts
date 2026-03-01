import { addJob, getJobById } from './job-repository';
import { addJobToQueue } from '../../queue/queue-service';
import {job, inputJob, status, userGivenJob} from './job-types';
import crypto from 'crypto';

export async function createJob(input: userGivenJob): Promise<job>{
  const payloadString = JSON.stringify(input.payload);
  const payloadHash = crypto.createHash('md5').update(payloadString).digest('hex');
  const jobToInsert: inputJob = {
    ...input,
    id: crypto.randomUUID(),
    status: status.PENDING,
    execution_state: 'QUEUED',
    retry_count: 0,
    max_retries: input.max_retries ?? 5,
    idempotency_key: `${input.org_id}+${input.type}+${payloadHash}`,
    locked_by: null,
    visibility_timeout_seconds: 60,
  };

  const createdJob = await addJob(jobToInsert);        
  await addJobToQueue(createdJob.id, createdJob.priority); 

  return createdJob;
}

export async function fetchJobById(jobId: string): Promise<job | undefined>{
  return await getJobById(jobId);                      
}