import crypto from 'crypto';
import { createJob } from '../src/modules/jobs/job-services';
import { processNextJob } from '../src/worker/worker';
import { getJobById, lockJob, updateStatus } from '../src/modules/jobs/job-repository';
import { priority, status, userGivenJob } from '../src/modules/jobs/job-types';
import { redis } from '../src/config/redis';
import { pool } from '../src/config/db';
import { promoteDelayedJobs } from '../src/queue/delayed-queue';
import { checkVisibilityTimeouts } from '../src/queue/visibility-manager';
import { popWithPriority} from '../src/queue/priority-queue';
import {syncPendingJobs} from '../src/queue/queue-service'

describe('Job Queue Integration Tests', () => {
  const dummyOrgId = crypto.randomUUID();
  const dummyEventId = crypto.randomUUID();

  beforeAll(async () => {
    // Explicitly delete target keys instead of relying on flushall
    await redis.del('jobs:high', 'jobs:low', 'jobs:processing', 'jobs:delayed');
    
    await pool.query('DELETE FROM jobs');
    await pool.query('DELETE FROM events');
    await pool.query('DELETE FROM orgs');

    // Seed dummy organization and event to satisfy foreign key constraints
    await pool.query(
      `INSERT INTO orgs (id, name, status, root_email) VALUES ($1, 'Test Org', 'ACTIVE', 'test@test.com')`,
      [dummyOrgId]
    );
    await pool.query(
      `INSERT INTO events (id, org_id, event_type, source, severity, payload, status) 
       VALUES ($1, $2, 'TEST_EVENT', 'API', 'LOW', '{}', 'RECEIVED')`,
      [dummyEventId, dummyOrgId]
    );
  });

  // Wipe the slate clean between every single test to prevent state leakage
  beforeEach(async () => {
    await redis.del('jobs:high', 'jobs:low', 'jobs:processing', 'jobs:delayed');
    await pool.query('DELETE FROM jobs');
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  it('Test 1: Happy Path', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { target: 'user@example.com' },
      max_retries: 3
    };

    // 1. Create Job
    const job = await createJob(jobInput);
    
    // Assert initial state
    expect(job.status).toBe(status.PENDING);
    expect(job.retry_count).toBe(0);

    // 2. Start Worker (process exactly one job)
    const processed = await processNextJob();
    expect(processed).toBe(true);

    // 3. Observe Results
    const updatedJob = await getJobById(job.id);
    
    // Status transition to COMPLETED
    expect(updatedJob?.status).toBe(status.COMPLETED);
    // retry_count remains 0
    expect(updatedJob?.retry_count).toBe(0);

    // Ensure it was removed from the processing queue
    const processingQueue = await redis.lrange('jobs:processing', 0, -1);
    expect(processingQueue).not.toContain(job.id);
  });

  it('Test 2: Priority Order', async () => {
    // 1. Create 5 LOW jobs
    for (let i = 0; i < 5; i++) {
      await createJob({
        org_id: dummyOrgId,
        event_id: dummyEventId,
        type: 'SEND_EMAIL',
        priority: priority.LOW,
        payload: { index: i }, // Unique payload prevents idempotency key collision
        max_retries: 3
      });
    }

    // 2. Create 1 HIGH job
    const highJob = await createJob({
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { isHigh: true },
      max_retries: 3
    });

    // 3. Start worker (processes exactly one job)
    const processed = await processNextJob();
    expect(processed).toBe(true);

    // 4. Expected: The HIGH job executes before LOW jobs
    const updatedHighJob = await getJobById(highJob.id);
    expect(updatedHighJob?.status).toBe(status.COMPLETED);

    // Verify LOW jobs are still pending
    const lowJobsInQueue = await redis.llen('jobs:low');
    expect(lowJobsInQueue).toBe(5);
  });

  it('Test 3: Single Failure Retry', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { failOnce: true },
      max_retries: 3
    };

    const job = await createJob(jobInput);

    // 1. First execution - it will throw "fail once"
    await processNextJob();

    let updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.RETRYING);
    expect(updatedJob?.retry_count).toBe(1);

    // Verify it is sitting in the delayed queue
    const delayedJobs = await redis.zrange('jobs:delayed', 0, -1);
    expect(delayedJobs).toContain(job.id);

    // 2. Wait for the exponential backoff delay to pass.
    // At retry_count=1, delay is 1000 * 2^1 + jitter = max 3000ms.
    await new Promise(resolve => setTimeout(resolve, 3100));

    // 3. Promote delayed jobs back to the main queue
    await promoteDelayedJobs();

    updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.PENDING); 

    // 4. Second execution - this time retry_count is 1, so it succeeds
    await processNextJob();

    updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.COMPLETED);
  }, 10000); 

  it('Test 4: Max Retries', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { failAlways: true },
      max_retries: 2
    };

    const job = await createJob(jobInput);

    // Attempt 1: Fails, increments retry to 1
    await processNextJob();
    let updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.RETRYING);
    expect(updatedJob?.retry_count).toBe(1);

    // Wait out the first delay
    await new Promise(resolve => setTimeout(resolve, 3100));
    await promoteDelayedJobs();

    // Attempt 2: Fails, increments retry to 2.
    // Since max_retries is 2, it should transition to FAILED.
    await processNextJob();
    
    updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.FAILED);

    // Verify it was purged from both processing and delayed queues
    const delayed = await redis.zrange('jobs:delayed', 0, -1);
    const processing = await redis.lrange('jobs:processing', 0, -1);
    
    expect(delayed).not.toContain(job.id);
    expect(processing).not.toContain(job.id);
  }, 10000); 

  it('Test 5: Promotion Timing', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { failOnce: true, test5: true },
      max_retries: 3
    };

    const startTime = Date.now();
    const job = await createJob(jobInput);

    // 1. Fail the job
    await processNextJob();

    // 2. Inspect Redis: ZRANGE jobs:delayed 0 -1 WITHSCORES
    const delayedWithScores = await redis.zrange('jobs:delayed', 0, -1, 'WITHSCORES');
    
    const jobIndex = delayedWithScores.indexOf(job.id);
    expect(jobIndex).toBeGreaterThan(-1);

    // The score is the element immediately following the job ID in the array
    const scheduledTimestamp = Number(delayedWithScores[jobIndex + 1]);

    // 3. Check: Score matches future timestamp
    expect(scheduledTimestamp).toBeGreaterThanOrEqual(startTime + 2000);
    expect(scheduledTimestamp).toBeLessThanOrEqual(startTime + 3500);

    // 4. Wait until due
    const delayRemaining = scheduledTimestamp - Date.now();
    if (delayRemaining > 0) {
      await new Promise(resolve => setTimeout(resolve, delayRemaining + 100)); // +100ms buffer
    }

    // 5. Ensure job is promoted
    await promoteDelayedJobs();

    // 6. Ensure removed from delayed set
    const delayedSetAfter = await redis.zrange('jobs:delayed', 0, -1);
    expect(delayedSetAfter).not.toContain(job.id);

    // Verify it was pushed back to the HIGH priority processing queue
    const highQueue = await redis.lrange('jobs:high', 0, -1);
    expect(highQueue).toContain(job.id);
  }, 10000);

  it('Test 6: Worker Crash Mid-Processing', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { crashTest: 'mid-processing' },
      max_retries: 3
    };
    const job = await createJob(jobInput);

    // 1. Worker pops job from Redis
    const poppedId = await popWithPriority();
    expect(poppedId).toBe(job.id);

    // 2. Worker locks job and updates DB
    await lockJob(job.id, 'doomed-worker-id');
    await updateStatus(job.id, status.PROCESSING);

    // CRASH! The worker dies here and never completes the job.
    
    // Fast-forward time by manually backdating the locked_at timestamp in the DB by 65 seconds
    await pool.query(
      `UPDATE jobs SET locked_at = NOW() - INTERVAL '65 seconds' WHERE id = $1`, 
      [job.id]
    );

    // 3. The Visibility Manager runs
    await checkVisibilityTimeouts();

    // 4. Assertions: The job should be fully recovered
    const updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.PENDING);
    expect(updatedJob?.locked_by).toBeNull();

    // It should be back in the high priority queue, and removed from processing
    const highQueue = await redis.lrange('jobs:high', 0, -1);
    expect(highQueue).toContain(job.id);
    
    const processingQueue = await redis.lrange('jobs:processing', 0, -1);
    expect(processingQueue).not.toContain(job.id);
  });

  it('Test 7: Crash Before Status Update', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { crashTest: 'before-db-update' },
      max_retries: 3
    };
    const job = await createJob(jobInput);

    // 1. Worker pops job from Redis (moves from jobs:high to jobs:processing)
    const poppedId = await popWithPriority();
    expect(poppedId).toBe(job.id);

    // CRASH! Worker dies before it can call lockJob or updateStatus.
    
    // Fast-forward time just in case
    await pool.query(
      `UPDATE jobs SET created_at = NOW() - INTERVAL '65 seconds' WHERE id = $1`, 
      [job.id]
    );

    // 3. The Visibility Manager runs
    await checkVisibilityTimeouts();

    // 4. Assertions: Attempt to verify recovery
    const processingQueue = await redis.lrange('jobs:processing', 0, -1);
    const highQueue = await redis.lrange('jobs:high', 0, -1);
    
    // EXPECTED TO FAIL: The job should be recovered, but it will be permanently stuck in processing
    expect(highQueue).toContain(job.id); 
    expect(processingQueue).not.toContain(job.id);
  });

  it('Test 8: Parallel Execution', async () => {
    const jobIds = [];
    for (let i = 0; i < 10; i++) {
      const job = await createJob({
        org_id: dummyOrgId,
        event_id: dummyEventId,
        type: 'SEND_EMAIL',
        priority: priority.HIGH,
        payload: { parallelIndex: i },
        max_retries: 3
      });
      jobIds.push(job.id);
    }

    const workerLoop = async () => {
      let processedAny = true;
      while (processedAny) {
        processedAny = await processNextJob();
      }
    };

    await Promise.all([workerLoop(), workerLoop(), workerLoop()]);

    for (const id of jobIds) {
      const job = await getJobById(id);
      expect(job?.status).toBe(status.COMPLETED);
    }

    const processingQueue = await redis.llen('jobs:processing');
    expect(processingQueue).toBe(0);
  });

  it('Test 9: Duplicate Protection', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { duplicateTest: true },
      max_retries: 3
    };
    const job = await createJob(jobInput);

    await redis.lpush('jobs:high', job.id);

    const queueLen = await redis.llen('jobs:high');
    expect(queueLen).toBe(2);

    await processNextJob();
    let updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.COMPLETED);

    await processNextJob();

    updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.COMPLETED);

    const processingQueue = await redis.lrange('jobs:processing', 0, -1);
    expect(processingQueue).not.toContain(job.id);
  });

  it('Test 10: Job Not in DB', async () => {
    const fakeJobId = crypto.randomUUID();
    
    // Manually push a fake job into Redis
    await redis.lpush('jobs:high', fakeJobId);
    
    // Process it
    const processed = await processNextJob();
    expect(processed).toBe(true);
    
    // Ensure the worker safely discarded it from all queues without crashing
    const highQueue = await redis.lrange('jobs:high', 0, -1);
    const processingQueue = await redis.lrange('jobs:processing', 0, -1);
    
    expect(highQueue).not.toContain(fakeJobId);
    expect(processingQueue).not.toContain(fakeJobId);
  });

  it('Test 11: Redis Restart', async () => {
    const jobInput: userGivenJob = {
      org_id: dummyOrgId,
      event_id: dummyEventId,
      type: 'SEND_EMAIL',
      priority: priority.HIGH,
      payload: { test11: true },
      max_retries: 3
    };
    const job = await createJob(jobInput);
    
    // Simulate Redis restart (memory wiped entirely)
    await redis.flushall();
    
    // If we try to process now, there is nothing in Redis
    let processed = await processNextJob();
    expect(processed).toBe(false); 
    
    // Run the boot-time hydration script
    await syncPendingJobs();
    
    // Now it should process successfully
    processed = await processNextJob();
    expect(processed).toBe(true);
    
    const updatedJob = await getJobById(job.id);
    expect(updatedJob?.status).toBe(status.COMPLETED);
  });

});