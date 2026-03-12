import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get the current date and 3 days ago
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    // Fetch all leads that need follow-up (active statuses only)
    const allLeads = await base44.asServiceRole.entities.Lead.list();
    
    const leadsNeedingFollowup = allLeads.filter(lead => {
      // Skip closed or dead leads
      if (lead.status === "Closed" || lead.status === "Dead") {
        return false;
      }
      
      // Check if last activity was more than 3 days ago
      const lastActivity = lead.last_activity_date ? new Date(lead.last_activity_date) : new Date(lead.created_date);
      return lastActivity < threeDaysAgo;
    });
    
    const tasksCreated = [];
    const errors = [];
    
    // For each lead needing follow-up
    for (const lead of leadsNeedingFollowup) {
      try {
        // Check if there's already an open task for this lead
        const existingTasks = await base44.asServiceRole.entities.Task.filter({
          lead_id: lead.id,
          status: "Open"
        });
        
        // If no open tasks exist, create one
        if (existingTasks.length === 0) {
          const taskType = lead.status === "New" || lead.status === "Contacted" 
            ? "Follow-up Text" 
            : "Call";
          
          const task = await base44.asServiceRole.entities.Task.create({
            lead_id: lead.id,
            task_type: taskType,
            due_date: now.toISOString(),
            status: "Open",
            auto_generated: true,
            description: `Auto-generated: No activity for 3+ days (Status: ${lead.status})`
          });
          
          // Update lead's next follow-up date
          await base44.asServiceRole.entities.Lead.update(lead.id, {
            next_followup_date: now.toISOString(),
            last_activity_date: now.toISOString()
          });
          
          tasksCreated.push({
            lead_id: lead.id,
            property_address: lead.property_address,
            task_id: task.id
          });
        }
      } catch (error) {
        errors.push({
          lead_id: lead.id,
          error: error.message
        });
      }
    }
    
    return Response.json({
      success: true,
      summary: {
        leads_checked: allLeads.length,
        leads_needing_followup: leadsNeedingFollowup.length,
        tasks_created: tasksCreated.length,
        errors: errors.length
      },
      tasks_created: tasksCreated,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { 
      status: 500 
    });
  }
});