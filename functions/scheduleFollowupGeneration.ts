import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function is called by an automation trigger
    // It generates automatic follow-up tasks for all leads
    
    const leads = await base44.entities.Lead.list();
    const existingTasks = await base44.entities.Task.list();

    const taskRules = {
      New: {
        delay_days: 0,
        task_type: "Follow-up Text",
        description: "Initial contact - send introduction text",
      },
      Contacted: {
        delay_days: 2,
        task_type: "Call",
        description: "Follow up on initial contact",
      },
      Responded: {
        delay_days: 1,
        task_type: "Call",
        description: "Discuss property details and next steps",
      },
      Talking: {
        delay_days: 3,
        task_type: "Call",
        description: "Continue negotiations and schedule walkthrough",
      },
      "Offer Sent": {
        delay_days: 2,
        task_type: "Follow-up Text",
        description: "Check if offer was received and discuss terms",
      },
      "Under Contract": {
        delay_days: 5,
        task_type: "Appointment",
        description: "Coordinate inspection and due diligence",
      },
    };

    const createdTasks = [];
    const now = new Date();

    for (const lead of leads) {
      const rule = taskRules[lead.status];
      if (!rule) continue;

      // Check if task already exists for this lead and status
      const hasExistingTask = existingTasks.some(
        (t) =>
          t.lead_id === lead.id &&
          t.task_type === rule.task_type &&
          t.status === "Open"
      );

      if (hasExistingTask) continue;

      // Calculate due date based on last interaction or creation
      const referenceDate = lead.last_contact_date
        ? new Date(lead.last_contact_date)
        : new Date(lead.created_date);

      const dueDate = new Date(referenceDate);
      dueDate.setDate(dueDate.getDate() + rule.delay_days);
      dueDate.setHours(9, 0, 0, 0);

      // Only create tasks for the future or today
      if (dueDate >= now) {
        const task = await base44.asServiceRole.entities.Task.create({
          lead_id: lead.id,
          task_type: rule.task_type,
          due_date: dueDate.toISOString(),
          status: "Open",
          description: rule.description,
          auto_generated: true,
        });

        createdTasks.push(task.id);
      }
    }

    return Response.json({
      success: true,
      created_count: createdTasks.length,
      task_ids: createdTasks,
    });
  } catch (error) {
    console.error("Error in scheduled follow-up generation:", error);
    return Response.json(
      { error: error.message || "Failed to generate follow-up tasks" },
      { status: 500 }
    );
  }
});