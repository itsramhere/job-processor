import { pool } from '../../config/db';
import { rule, inputRule } from './rule-types';

export async function createRule(input: inputRule & { id: string }): Promise<rule>{
  const result = await pool.query(
    `INSERT INTO rules (id, org_id, event_type, action_type, priority, execution_mode)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.id, input.org_id, input.event_type, input.action_type, input.priority, input.execution_mode]
  );
  return result.rows[0];
}

export async function getRulesByEventType(orgId: string, eventType: string): Promise<rule[]>{
  const result = await pool.query(
    `SELECT * FROM rules
     WHERE org_id = $1
       AND event_type = $2
       AND is_active = true`,
    [orgId, eventType]
  );
  return result.rows;
}

export async function getRuleById(ruleId: string): Promise<rule | undefined>{
  const result = await pool.query(
    `SELECT * FROM rules WHERE id = $1`,
    [ruleId]
  );
  return result.rows[0];
}

export async function deactivateRule(ruleId: string): Promise<rule | undefined>{
  const result = await pool.query(
    `UPDATE rules
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [ruleId]
  );
  return result.rows[0];
}