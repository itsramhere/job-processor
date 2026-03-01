import { redis } from '../config/redis';

const DEAD_KEY = 'jobs:dead';

export async function pushToDeadQueue(jobId: string): Promise<void>{
  await redis.lpush(DEAD_KEY, jobId);
  console.error(`Job ${jobId} pushed to dead letter queue`);
}

export async function getDeadQueue(): Promise<string[]>{
  return await redis.lrange(DEAD_KEY, 0, -1); 
}

export async function getDeadQueueLength(): Promise<number>{
  return await redis.llen(DEAD_KEY);
}