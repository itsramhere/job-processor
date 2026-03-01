import { redis } from '../config/redis';
import {enqueueHigh, enqueueLow} from './priority-queue';
import {getJobById, updateStatus} from '../modules/jobs/job-repository';
import { status } from '../modules/jobs/job-types';

const DELAYED_KEY = 'jobs:delayed';

export async function addToDelayedQueue(jobId: string, delayMs: number): Promise<void>{
  const runAt = Date.now() + delayMs;
  await redis.zadd(DELAYED_KEY, runAt, jobId);
  console.log(`Job ${jobId} delayed for ${(delayMs / 1000).toFixed(1)}s`);
}

export async function getDueJobs(): Promise<string[]>{
  return await redis.zrangebyscore(DELAYED_KEY, 0, Date.now());
}

export async function removeFromDelayedQueue(jobId: string): Promise<void>{
  await redis.zrem(DELAYED_KEY, jobId);
}

export async function promoteDelayedJobs(): Promise<void>{
  const dueJobs = await getDueJobs();
  if (dueJobs.length === 0) return;

  console.log(`Promoting ${dueJobs.length} delayed job(s) back to priority queue`);

  for (const jobId of dueJobs) {
    const job = await getJobById(jobId);

    if (!job) {
      await removeFromDelayedQueue(jobId);
      continue;
    }

    await removeFromDelayedQueue(jobId);
    await updateStatus(jobId, status.PENDING);

    if (job.priority === 'HIGH'){
      await enqueueHigh(jobId);
    }
     else{
      await enqueueLow(jobId);
    }

    console.log(`Job ${jobId} promoted back to ${job.priority} queue`);
  }
}