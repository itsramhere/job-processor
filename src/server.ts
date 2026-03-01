import 'dotenv/config'
import Fastify from 'fastify';
import {runSchema} from './config/schema';
import { redis } from './config/redis'; 
import {jobRoutes} from './modules/jobs/job-routes';
import { startVisibilityManager } from './queue/visibility-manager';
import { startWorker } from './worker/worker-runner';
import { ruleRoutes } from './modules/rules/rule-routes';
import { eventRoutes } from './modules/events/event-routes';

const fastify = Fastify({
  logger: true
});

const start = async () => {
    runSchema();

    fastify.register(jobRoutes, {prefix: '/api/jobs'});
    fastify.register(ruleRoutes, {prefix: '/api/rules'});
    fastify.register(eventRoutes, {prefix: '/api/events'});

    const ping = await redis.ping();
    console.log('Redis ping:', ping); 
    
    const projectPort = process.env.PORT ? Number(process.env.PORT) : 3000;
    await fastify.listen({ port: projectPort });
    
    startWorker();
    startVisibilityManager();
};

start();