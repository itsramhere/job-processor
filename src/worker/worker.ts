import { getJobById, updateStatus, lockJob, unlockJob, markJobStarted, markJobCompleted} from '../modules/jobs/job-repository';
import { popWithPriority, removeFromProcessingQueue } from '../queue/priority-queue';
import { handleJobRetry } from './retry-strategy';
import { status } from '../modules/jobs/job-types';
import crypto from 'crypto';

const WORKER_ID = crypto.randomUUID();

export async function processNextJob(): Promise<boolean>{
  const jobId = await popWithPriority();
  if (!jobId) {
    return false;
  }
  const job = await getJobById(jobId);

  if (!job){
    console.error(`Job ${jobId} in queue but not found in DB`);
    await removeFromProcessingQueue(jobId);
    return true;
  }

  if (job.status !== status.PENDING){
    console.warn(`Skipping job ${jobId} - expected PENDING but got ${job.status}`);
    await removeFromProcessingQueue(jobId);
    return true;
  }

  await lockJob(jobId, WORKER_ID);
  await updateStatus(jobId, status.PROCESSING);
  console.log(`Worker ${WORKER_ID} locked job ${jobId}`);

  try{
    await markJobStarted(jobId);                   
    await updateStatus(jobId, status.PROCESSING);

    await simulateHandler(job.type);

    await markJobCompleted(jobId);   
    await updateStatus(jobId, status.COMPLETED);
    await unlockJob(jobId);
    await removeFromProcessingQueue(jobId);
    console.log(`Job ${jobId} completed`);
  }

   catch (err){
    console.error(`Job ${jobId} failed:`, err);
    await unlockJob(jobId);
    await removeFromProcessingQueue(jobId);
    await handleJobRetry(job);
  }
  return true;
}

async function simulateHandler(job: any): Promise<void>{
  console.log(`  -> Simulating ${job.type}...`);

  if (job.payload?.failOnce && job.retry_count === 0){
    throw new Error("fail once");
  }

  if (job.payload?.failAlways){
    throw new Error("fail always");
  }

  await sleep(100); 
  console.log(`  -> Done`);
}

function sleep(ms: number): Promise<void>{
  return new Promise(resolve => setTimeout(resolve, ms));
}