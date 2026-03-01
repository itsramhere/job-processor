import { processNextJob } from './worker';
import { promoteDelayedJobs } from '../queue/delayed-queue';

const SCHEDULER_INTERVAL_MS = 5000;
let lastSchedulerRun = 0;

export async function startWorker(): Promise<void>{
  console.log('Worker started...');

  while (true){
    try{
      const now = Date.now();
      if (now - lastSchedulerRun >= SCHEDULER_INTERVAL_MS){
        await promoteDelayedJobs();
        lastSchedulerRun = now;
      }

      await processNextJob(); 
    } 
    catch (err){
      console.error('Unexpected worker error:', err);
      await sleep(2000);
    }
  }
}

function sleep(ms: number): Promise<void>{
  return new Promise(resolve => setTimeout(resolve, ms));
}