import { updateStatus, incrementRetry } from '../modules/jobs/job-repository';
import { job, status } from '../modules/jobs/job-types';
import { addToDelayedQueue } from '../queue/delayed-queue';
import { pushToDeadQueue } from '../queue/dead-queue';

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000;

export function calculateBackoff(retryCount: number): number{
  const exponential = BASE_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

export async function handleJobRetry(job: job): Promise<void>{
  const updatedJob = await incrementRetry(job.id);

  if (!updatedJob){
    console.error(`Could not increment retry for job ${job.id}`);
    return;
  }

  if (updatedJob.retry_count >= updatedJob.max_retries){
    await updateStatus(job.id, status.FAILED);
    await pushToDeadQueue(job.id); 
    console.error(`Job ${job.id} permanently FAILED — moved to dead letter queue`);
    return;
  }

  const delayMs = calculateBackoff(updatedJob.retry_count);
  console.log(
    `Job ${job.id} retrying (attempt ${updatedJob.retry_count}/${updatedJob.max_retries}) in ${(delayMs / 1000).toFixed(1)}s`
  );

  await updateStatus(job.id, status.RETRYING);   
  await addToDelayedQueue(job.id, delayMs);      
}