import { FastifyInstance } from 'fastify';
import { postRuleHandler, getRuleHandler, deleteRuleHandler } from './rule-controller';

export async function ruleRoutes(app: FastifyInstance){
  app.post('/rules', postRuleHandler);
  app.get('/rules/:id', getRuleHandler);
  app.delete('/rules/:id', deleteRuleHandler);
}