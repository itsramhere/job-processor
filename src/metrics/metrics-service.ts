import { pool } from '../config/db';
import { getQueueLengths, getProcessingQueue } from '../queue/priority-queue';
import { getDeadQueueLength } from '../queue/dead-queue';
import { redis } from '../config/redis';

const DELAYED_KEY = 'jobs:delayed';

interface Metrics{
  queue_depth: { high: number; low: number; total: number };
  processing_jobs: number;
  failed_jobs: number;
  delayed_jobs: number;
  avg_duration_ms: number | null;
  jobs_completed_today: number;
}

export async function getMetrics(): Promise<Metrics>{
  const [
    queueLengths,
    processingIds,
    failedCount,
    delayedCount,
    avgDuration,
    completedToday,
  ] = await Promise.all([
    getQueueLengths(),
    getProcessingQueue(),
    getFailedCount(),
    redis.zcard(DELAYED_KEY),
    getAvgDuration(),
    getCompletedToday(),
  ]);

  return{
    queue_depth: {
      high: queueLengths.high,
      low: queueLengths.low,
      total: queueLengths.high + queueLengths.low,
    },
    processing_jobs: processingIds.length,
    failed_jobs: failedCount,
    delayed_jobs: delayedCount,
    avg_duration_ms: avgDuration,
    jobs_completed_today: completedToday,
  };
}

async function getFailedCount(): Promise<number>{
  const result = await pool.query(
    `SELECT COUNT(*) FROM jobs WHERE status = 'FAILED'`
  );
  return parseInt(result.rows[0].count);
}

async function getAvgDuration(): Promise<number | null>{
  const result = await pool.query(
    `SELECT AVG(duration_ms) FROM jobs WHERE status = 'COMPLETED' AND duration_ms IS NOT NULL`
  );
  const avg = result.rows[0].avg;
  return avg ? Math.round(parseFloat(avg)) : null;
}

async function getCompletedToday(): Promise<number>{
  const result = await pool.query(
    `SELECT COUNT(*) FROM jobs
     WHERE status = 'COMPLETED'
       AND completed_at >= CURRENT_DATE`
  );
  return parseInt(result.rows[0].count);
}