import crypto from 'crypto';
import { createRule, getRuleById, getRulesByEventType, deactivateRule } from './rule-repository';
import { rule, inputRule } from './rule-types';

export async function addRule(input: inputRule): Promise<rule>{
  return await createRule({ ...input, id: crypto.randomUUID()});
}

export async function fetchRuleById(ruleId: string): Promise<rule | undefined>{
  return await getRuleById(ruleId);
}

export async function fetchRulesByEventType(orgId: string, eventType: string): Promise<rule[]>{
  return await getRulesByEventType(orgId, eventType);
}

export async function removeRule(ruleId: string): Promise<rule | undefined>{
  return await deactivateRule(ruleId);
}