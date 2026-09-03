import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { addDays, addHours } from 'npm:date-fns@3.6.0';

const TASK_WORKFLOWS = {
  'New': {
    taskType: 'Call',
    description: 'Initial contact call - introduce yourself and ask about property interest',
    delayHours: 0,
  },
  'Contacted': {
    taskType: 'Follow-up Text',
    description: 'Send follow-up text after initial contact',
    delayHours: 24,
  },
  'Responded': {
    taskType: 'Call',
    description: 'Follow up on their response - discuss property details',
    delayHours: 0,
  },
  'Talking': {
    taskType: 'Appointment',
    description: 'Schedule property walkthrough or meeting',
    delayHours: 24,
  },
  'Offer Sent': {
    taskType: 'Follow-up Text',
    description: 'Follow up on sent offer - check for response',
    delayHours: 48,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    if (!event || event.type !== 'update') {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    const lead = data;
    const previousLead = old_data;

    if (!lead || !lead.id) {
      return Response.json({ error: 'Missing lead data' }, { status: 400 });
    }

    // Check if status changed
    const statusChanged = previousLead?.status !== lead.status;
    const workflow = TASK_WORKFLOWS[lead.status];

    if (!statusChanged || !workflow) {
      return Response.json({ success: true, message: 'No workflow triggered' });
    }

    // Check if task already exists for this lead and workflow
    const existingTasks = await base44.entities.Task.filter({
      lead_id: lead.id,
      task_type: workflow.taskType,
    });

    // Don't create duplicate tasks
    const hasOpenTask = existingTasks.some(t => t.status === 'Open');
    if (hasOpenTask) {
      return Response.json({ 
        success: true, 
        message: 'Open task already exists for this workflow' 
      });
    }

    // Calculate due date
    const dueDate = addHours(new Date(), workflow.delayHours).toISOString();

    // Create the follow-up task
    const task = await base44.entities.Task.create({
      lead_id: lead.id,
      task_type: workflow.taskType,
      due_date: dueDate,
      description: workflow.description,
      status: 'Open',
      auto_generated: true,
    });

    return Response.json({
      success: true,
      message: `Follow-up task created for ${lead.status} lead`,
      task_id: task.id,
    });
  } catch (error) {
    console.error('Error creating follow-up task:', error);
    return Response.json(
      { error: error.message || 'Failed to create follow-up task' },
      { status: 500 }
    );
  }
});