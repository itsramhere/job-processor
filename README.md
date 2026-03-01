# Distributed Event-Driven Job Processing System

A distributed, fault-tolerant background job processing system built with **TypeScript, Fastify, PostgreSQL, and Redis**.

This project demonstrates infrastructure-level backend engineering concepts including:

- Event-driven job creation
- Priority-based scheduling
- Exponential backoff retries
- Delayed job promotion
- Visibility timeout crash recovery
- Multi-worker concurrency
- Idempotent execution
- Rule-based automation

---

## Overview

Modern backend systems often require reliable background processing for tasks such as:

- Sending transactional emails
- Triggering webhooks
- Generating reports
- Retrying failed operations
- Processing asynchronous workflows

This system decouples **event ingestion** from **job execution**, ensuring:

- Non-blocking API responses
- Reliable retry mechanisms
- Crash-safe execution
- Scalable distributed workers

---

##  Architecture
Client -> Event API -> Rules Engine -> Job Creation -> Redis Queue -> Worker -> Execution
↓
PostgreSQL (Durable State)


### Core Components

- **Fastify API** – Event & rule ingestion
- **PostgreSQL** – Durable persistence (events, rules, jobs)
- **Redis** – Priority queues + delayed scheduling
- **Worker Processes** – Distributed job execution

---

## Job Lifecycle

1. **Rule Defined**
   - Organization defines:
     - Event type
     - Action type
     - Priority

2. **Event Occurs**
   - Event stored in database
   - Matching rule(s) located
   - Job(s) created

3. **Queue Insertion**
   - Job pushed to:
     - `jobs:high`
     - `jobs:low`

4. **Worker Execution**
   - Worker uses `BRPOP` to block until job available
   - Job status → `PROCESSING`
   - Handler executed

5. **On Success**
   - Status → `COMPLETED`

6. **On Failure**
   - Retry count incremented
   - Exponential backoff calculated
   - Job added to `jobs:delayed` (Redis Sorted Set)

7. **Delayed Promotion**
   - Scheduler moves due jobs back to priority queue
   - Status reset to `PENDING`

8. **Visibility Timeout**
   - If worker crashes mid-processing:
     - Job detected as stale
     - Requeued safely

---

## System Guarantees

- **At-least-once delivery**
- **Priority-based scheduling**
- **Crash-safe execution**
- **Exponential retry with jitter**
- **Idempotent job creation**
- **Horizontal worker scalability**

---

## Tech Stack

- **Node.js**
- **TypeScript**
- **Fastify**
- **PostgreSQL**
- **Redis (Lists + Sorted Sets)**

---

## Redis Data Structures

| Key | Purpose |
|------|---------|
| `jobs:high` | High priority queue |
| `jobs:low` | Low priority queue |
| `jobs:delayed` | Retry scheduling (Sorted Set) |
| `jobs:processing` | (Optional) In-flight tracking |

---

## Database Schema (Core Table)

### jobs

- id (UUID)
- org_id
- event_id
- type
- priority
- status (`PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`)
- retry_count
- max_retries
- idempotency_key (UNIQUE)
- locked_by
- locked_at
- visibility_timeout_seconds
- created_at
- updated_at

---

## Running the Project

### 1️ Install Dependencies

```bash
npm install
```
### 2️ Configure Environment

Create a `.env` file:

```env
DATABASE_URL=postgres://...
REDIS_URL=redis://localhost:6379
```
### 3️ Run API Server

```bash
npm run dev
```

### 4 Run Worker (separate terminal)
```bash
npm run start:worker
```
## Testing Scenarios

### Happy Path

- Create event  
- Observe job processed  
- Status transitions to `COMPLETED`

---

### Retry Flow

- Force handler failure  
- Observe:
  - Status → `RETRYING`
  - Job enters delayed queue
  - Job promoted and retried

---

### Max Retries

- Job eventually marked `FAILED`

---

## ✅ Visibility Timeout

- Kill worker mid-processing  
- Wait timeout  
- Restart worker  
- Job reprocessed  

---

##  Multi-Worker Concurrency

- Start 3 workers  
- Enqueue multiple jobs  
- Observe parallel execution  

---

## Scaling Model

- API layer scales horizontally  
- Worker layer scales independently  
- Redis handles queue coordination  
- PostgreSQL ensures durability  

---

## Trade-offs

- Provides **at-least-once** semantics, not exactly-once  
- Redis persistence not guaranteed unless configured  
- Single Redis instance (can be upgraded to cluster)  

---

## Possible Improvements

- Dead Letter Queue (DLQ)  
- Worker heartbeat detection  
- Metrics endpoint (`/metrics`)  
- Structured logging (Pino)  
- Atomic processing queue with `BRPOPLPUSH`  
- Rate limiting per organization  
- Cron-based scheduled jobs  
- Multi-tenant queue sharding  