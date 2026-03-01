import { pool } from '../../config/db';
import { event, inputEvent, eventStatus } from './event-types';

export async function createEvent(input: inputEvent & { id: string }): Promise<event>{
  const result = await pool.query(
    `INSERT INTO events (id, org_id, event_type, source, severity, payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.id, input.org_id, input.event_type, input.source, input.severity, JSON.stringify(input.payload), eventStatus.RECEIVED]
  );
  return result.rows[0];
}

export async function markEventProcessed(eventId: string): Promise<event | undefined>{
  const result = await pool.query(
    `UPDATE events
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [eventStatus.PROCESSED, eventId]
  );
  return result.rows[0];
}

export async function getEventById(eventId: string): Promise<event | undefined>{
  const result = await pool.query(
    `SELECT * FROM events WHERE id = $1`,
    [eventId]
  );
  return result.rows[0];
}