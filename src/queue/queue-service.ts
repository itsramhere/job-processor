import {enqueueHigh, enqueueLow, popWithPriority, getQueueLengths} from './priority-queue';
import { pool } from '../config/db';

export async function addJobToQueue(jobId: string, priority: 'HIGH' | 'LOW'): Promise<void>{
  if (priority === 'HIGH'){
    await enqueueHigh(jobId);
    console.log(`Job ${jobId} added to HIGH priority queue`);
  }
   else{
    await enqueueLow(jobId);
    console.log(`Job ${jobId} added to LOW priority queue`);
  }
}

export async function getNextJob(): Promise<string | null>{
  const jobId = await popWithPriority();

  if (!jobId){
    console.log('No jobs in queue');
    return null;
  }

  console.log(`Popped job ${jobId} from queue`);
  return jobId;
}

export async function logQueueStatus(): Promise<void>{
  const { high, low } = await getQueueLengths();
  console.log(`Queue status — HIGH: ${high} jobs | LOW: ${low} jobs`);
}

export async function syncPendingJobs(): Promise<void> {
  console.log('Synchronizing PENDING jobs from DB to Redis...');
  try {
    const result = await pool.query(
      "SELECT id, priority FROM jobs WHERE status = 'PENDING'"
    );
    
    for (const row of result.rows) {
      await addJobToQueue(row.id, row.priority);
    }
    
    console.log(`Successfully synchronized ${result.rowCount} jobs.`);
  } catch (err) {
    console.error('Error synchronizing pending jobs:', err);
  }
}