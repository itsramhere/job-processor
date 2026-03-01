import Fastify from 'fastify';
import { runSchema } from './config/schema';
import { orgRoutes } from './modules/orgs/org-routes';
import { eventRoutes } from './modules/events/event-routes';
import { ruleRoutes } from './modules/rules/rule-routes';
import { jobRoutes } from './modules/jobs/job-routes';
import { metricsRoutes } from './metrics/metrics-routes';
import { apiKeyMiddleware } from './middleware/auth-middleware';
import { startWorker } from './worker/worker-runner';
import { startVisibilityManager } from './queue/visibility-manager';

const app = Fastify();

const start = async () =>{
  await runSchema();

  app.register(orgRoutes);
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', apiKeyMiddleware);
    protectedApp.register(eventRoutes);
    protectedApp.register(ruleRoutes);
    protectedApp.register(jobRoutes);
    protectedApp.register(metricsRoutes);
  });

  await app.listen({ port: 3000 });
  console.log('Server running on port 3000');

  startWorker();
  startVisibilityManager();
};

start();