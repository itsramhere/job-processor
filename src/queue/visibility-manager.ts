import { pool } from '../config/db';
import {updateStatus, unlockJob} from '../modules/jobs/job-repository';
import { removeFromProcessingQueue, enqueueHigh, enqueueLow } from './priority-queue';
import { status } from '../modules/jobs/job-types';

const CHECK_INTERVAL_MS = 30000;

interface StaleJob{
  id: string;
  priority: string;
  locked_by: string;
  locked_at: Date;
  visibility_timeout_seconds: number;
}

async function getStaleJobs(): Promise<StaleJob[]>{
  const result = await pool.query(`
    SELECT id, priority, locked_by, locked_at, visibility_timeout_seconds
    FROM jobs
    WHERE status = 'PROCESSING'
      AND locked_at IS NOT NULL
      AND locked_at + (visibility_timeout_seconds * interval '1 second') < NOW()
  `);
  return result.rows;
}

async function requeueStaleJob(job: StaleJob): Promise<void>{
  console.warn(
    `Job ${job.id} is stale — locked by ${job.locked_by} at ${job.locked_at.toISOString()}, requeuing...`
  );

  await unlockJob(job.id);
  await updateStatus(job.id, status.PENDING);
  await removeFromProcessingQueue(job.id);

  if (job.priority === 'HIGH'){
    await enqueueHigh(job.id);
  } 
  else{
    await enqueueLow(job.id);
  }

  console.log(`Job ${job.id} requeued to ${job.priority} queue`);
}

export async function checkVisibilityTimeouts(): Promise<void>{
  try{
    const staleJobs = await getStaleJobs();

    if (staleJobs.length === 0){
      return;
    }

    console.log(`Visibility manager found ${staleJobs.length} stale job(s)`);

    for (const job of staleJobs) {
      await requeueStaleJob(job);
    }
  } 
  catch (err){
    console.error('Visibility manager error:', err);
  }
}

export async function startVisibilityManager(): Promise<void>{
  console.log('Visibility manager started, checking every 30s');

  while (true){
    await sleep(CHECK_INTERVAL_MS);
    await checkVisibilityTimeouts();
  }
}

function sleep(ms: number): Promise<void>{
  return new Promise(resolve => setTimeout(resolve, ms));
}