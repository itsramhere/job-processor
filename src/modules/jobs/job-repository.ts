import { job, inputJob, status } from "./job-types";
import { pool } from '../../config/db';
import crypto from 'crypto';

export async function addJob(jobToAdd: inputJob) : Promise<job>{
    const jobId = crypto.randomUUID();

    const result = await pool.query(
        `INSERT INTO jobs (id, org_id, event_id, type, priority, status, execution_state, payload, retry_count, max_retries, idempotency_key, locked_by, visibility_timeout_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        `,
        [
            jobId,
            jobToAdd.org_id, 
            jobToAdd.event_id, 
            jobToAdd.type, 
            jobToAdd.priority, 
            jobToAdd.status, 
            jobToAdd.execution_state, 
            jobToAdd.payload, 
            jobToAdd.retry_count, 
            jobToAdd.max_retries, 
            jobToAdd.idempotency_key, 
            jobToAdd.locked_by, 
            jobToAdd.visibility_timeout_seconds
        ]
    );

    const createdJob = result.rows[0];
    return createdJob;
}

export async function updateStatus(jobId: string, newStatus: status): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [newStatus, jobId]
  );
  return result.rows[0];
}

export async function getJobById(jobId: string) : Promise<job | undefined>{
    const result = await pool.query(
        `SELECT * FROM jobs WHERE id = $1`,
        [jobId]
    );
    const foundJob = result.rows[0]; 
    return foundJob;
}

export async function incrementRetry(jobId: string): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET retry_count = retry_count + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );
  return result.rows[0];
}

export async function lockJob(jobId: string, workerId: string): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET locked_by = $1,
         locked_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [workerId, jobId]
  );
  return result.rows[0];
}

export async function unlockJob(jobId: string): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET locked_by = NULL,
         locked_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );
  return result.rows[0];
}

export async function markJobStarted(jobId: string): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET started_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );
  return result.rows[0];
}

export async function markJobCompleted(jobId: string): Promise<job | undefined>{
  const result = await pool.query(
    `UPDATE jobs
     SET completed_at = NOW(),
         duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );
  return result.rows[0];
}

export async function getDeadJobs(): Promise<job[]>{
  const result = await pool.query(
    `SELECT * FROM jobs WHERE status = 'FAILED' ORDER BY updated_at DESC`
  );
  return result.rows;
}