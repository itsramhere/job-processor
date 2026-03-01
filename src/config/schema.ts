import { pool } from './db';

export async function runSchema(){
  const client = await pool.connect();

  try{
    await client.query('BEGIN');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE api_key_status AS ENUM ('ACTIVE', 'REVOKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE environment_type AS ENUM ('DEV', 'STAGING', 'PROD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE action_type AS ENUM ('SEND_EMAIL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE priority_level AS ENUM ('HIGH', 'LOW');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE execution_mode AS ENUM ('IMMEDIATE', 'DELAYED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE event_source AS ENUM ('API', 'SYSTEM', 'WEBHOOK');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE event_status AS ENUM ('RECEIVED', 'PROCESSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE job_type AS ENUM ('SEND_EMAIL', 'PHONE_CALL', 'SEND_LETTER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'RETRYING', 'COMPLETED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE execution_state AS ENUM ('QUEUED', 'IN_FLIGHT', 'DELAYED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS orgs (
        id         UUID PRIMARY KEY,
        name       TEXT NOT NULL,
        status     TEXT NOT NULL,
        root_email TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         UUID PRIMARY KEY,
        org_id     UUID REFERENCES orgs(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL UNIQUE,
        role       TEXT NOT NULL,
        status     TEXT NOT NULL,
        hashed_pw  TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id          UUID PRIMARY KEY,
        org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
        api_key     TEXT NOT NULL UNIQUE,
        status      api_key_status NOT NULL,
        environment environment_type NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked_at  TIMESTAMP
      );
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id             UUID PRIMARY KEY,
        org_id         UUID REFERENCES orgs(id) ON DELETE CASCADE,
        event_type     TEXT NOT NULL,
        action_type    action_type NOT NULL,
        priority       priority_level NOT NULL,
        execution_mode execution_mode NOT NULL,
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id         UUID PRIMARY KEY,
        org_id     UUID REFERENCES orgs(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        source     event_source NOT NULL,
        severity   severity_level NOT NULL,
        payload    JSONB NOT NULL,
        status     event_status NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id                         UUID PRIMARY KEY,
        org_id                     UUID REFERENCES orgs(id) ON DELETE CASCADE,
        event_id                   UUID REFERENCES events(id) ON DELETE SET NULL,
        type                       job_type NOT NULL,
        priority                   priority_level NOT NULL,
        status                     job_status NOT NULL,
        execution_state            execution_state NOT NULL,
        payload                    JSONB NOT NULL,
        retry_count                INT NOT NULL DEFAULT 0,
        max_retries                INT NOT NULL DEFAULT 5,
        idempotency_key            TEXT NOT NULL UNIQUE,
        locked_by                  TEXT,
        locked_at                  TIMESTAMP,
        visibility_timeout_seconds INT NOT NULL DEFAULT 60,
        created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority   ON jobs(priority);
      CREATE INDEX IF NOT EXISTS idx_jobs_locked_at  ON jobs(locked_at);
      CREATE INDEX IF NOT EXISTS idx_events_org      ON events(org_id);
      CREATE INDEX IF NOT EXISTS idx_rules_org_event ON rules(org_id, event_type);
    `);

    await client.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS duration_ms INT;
    `);
    
    await client.query('COMMIT');
    console.log('Schema ready');
  }
  catch (err){
    await client.query('ROLLBACK');
    console.error('Schema setup failed:', err);
    throw err;
  }
  finally{
    client.release();
  }
}