import { FastifyRequest, FastifyReply } from 'fastify';
import { addRule, fetchRuleById, removeRule } from './rule-service';
import { inputRule } from './rule-types';

export async function postRuleHandler(
  req: FastifyRequest<{ Body: inputRule }>,
  reply: FastifyReply
){
  try{
    const safeBody = {
      ...req.body,
      org_id: req.orgId
    };
    
    const rule = await addRule(safeBody);
    return reply.status(201).send(rule);
  } 
  catch (err: any){
    console.error('postRuleHandler error:', err);
    return reply.status(500).send({ error: 'Failed to create rule', details: err.message });
  }
}

export async function getRuleHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
){
  try{
    const rule = await fetchRuleById(req.params.id);
    if (!rule) return reply.status(404).send({ error: 'Rule not found' });
    if (rule.org_id !== req.orgId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return reply.status(200).send(rule);
  } 
  catch (err: any){
    console.error('getRuleHandler error:', err);
    return reply.status(500).send({ error: 'Failed to fetch rule', details: err.message });
  }
}

export async function deleteRuleHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
){
  try{
    const rule = await removeRule(req.params.id);
    if (!rule) return reply.status(404).send({ error: 'Rule not found' });
    return reply.status(200).send(rule);
  } 
  catch (err: any){
    console.error('deleteRuleHandler error:', err);
    return reply.status(500).send({ error: 'Failed to deactivate rule', details: err.message });
  }
}