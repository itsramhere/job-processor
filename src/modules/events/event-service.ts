import crypto from 'crypto';
import { createEvent, markEventProcessed } from './event-repository';
import { getRulesByEventType } from '../rules/rule-repository';
import { addJob } from '../jobs/job-repository';
import { addJobToQueue } from '../../queue/queue-service';
import { inputEvent, event } from './event-types';
import { status } from '../jobs/job-types';


export async function processEvent(input: inputEvent): Promise<event>{
  const event = await createEvent({ ...input, id: crypto.randomUUID() });
  console.log(`Event ${event.id} received — type: ${event.event_type}`);

  const rules = await getRulesByEventType(input.org_id, input.event_type);

  if(rules.length === 0){
    console.warn(`No active rules found for event type: ${input.event_type}`);
    return event;
  }
  console.log(`Found ${rules.length} rule(s) for event ${event.id}`);

  for(const rule of rules){
    const jobId = crypto.randomUUID() ;

    await addJob({
      id: jobId,
      org_id: input.org_id,
      event_id: event.id,
      type: rule.action_type,
      priority: rule.priority,
      status: status.PENDING,
      execution_state: 'QUEUED',
      payload: input.payload,
      retry_count: 0,
      max_retries: 5,
      idempotency_key: `idem-${jobId}`,
      locked_by: null,
      visibility_timeout_seconds: 60,
    });

    await addJobToQueue(jobId, rule.priority);
    console.log(`Job ${jobId} created and enqueued for rule ${rule.id} (${rule.action_type})`);
  }

  await markEventProcessed(event.id);

  return event;
}

export async function fetchEventById(eventId: string){
    const { getEventById } = await import('./event-repository');
    return await getEventById(eventId);
}