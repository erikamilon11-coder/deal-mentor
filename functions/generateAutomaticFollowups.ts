import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all leads
    const leads = await base44.entities.Lead.list();
    
    // Fetch existing tasks to avoid duplicates
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
        const task = await base44.entities.Task.create({
          lead_id: lead.id,
          task_type: rule.task_type,
          due_date: dueDate.toISOString(),
          status: "Open",
          description: rule.description,
          auto_generated: true,
        });

        createdTasks.push({
          id: task.id,
          lead_id: lead.id,
          lead_address: lead.property_address,
          task_type: rule.task_type,
          due_date: dueDate.toISOString(),
          description: rule.description,
        });
      }
    }

    return Response.json({
      success: true,
      created_count: createdTasks.length,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Error generating follow-up tasks:", error);
    return Response.json(
      { error: error.message || "Failed to generate follow-up tasks" },
      { status: 500 }
    );
  }
});