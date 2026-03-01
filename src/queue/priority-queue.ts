import { redis } from '../config/redis';

const HIGH_PRIORITY_KEY = 'jobs:high';
const LOW_PRIORITY_KEY = 'jobs:low';
const PROCESSING_KEY = 'jobs:processing';

export async function enqueueHigh(jobId: string): Promise<void>{
  await redis.lpush(HIGH_PRIORITY_KEY, jobId);
}

export async function enqueueLow(jobId: string): Promise<void>{
  await redis.lpush(LOW_PRIORITY_KEY, jobId);
}

export async function popWithPriority(): Promise<string | null>{
  const highJob = await redis.brpoplpush(HIGH_PRIORITY_KEY, PROCESSING_KEY, 1); 
  if(highJob){ 
    return highJob;
  }  
  const lowJob = await redis.brpoplpush(LOW_PRIORITY_KEY, PROCESSING_KEY, 1);
  return lowJob;
}


export async function getQueueLengths(): Promise<{ high: number; low: number }>{
  const [high, low] = await Promise.all([
    redis.llen(HIGH_PRIORITY_KEY),
    redis.llen(LOW_PRIORITY_KEY),
  ]);
  return { high, low };
}

export async function removeFromProcessingQueue(jobId: string): Promise<void> {
  await redis.lrem(PROCESSING_KEY, 1, jobId);
}

export async function getProcessingQueue(): Promise<string[]> {
  return await redis.lrange(PROCESSING_KEY, 0, -1);
}