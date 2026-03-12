import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process when contract status changes to Signed
    if (event.type !== 'update' || data?.status !== 'Signed' || old_data?.status === 'Signed') {
      return Response.json({ success: true, message: 'No action needed' });
    }

    const contract = data;

    if (!contract.lead_id) {
      return Response.json({ success: true, message: 'No lead associated' });
    }

    // Update lead status to Under Contract
    await base44.asServiceRole.entities.Lead.update(contract.lead_id, {
      status: 'Under Contract',
      last_activity_date: new Date().toISOString(),
      next_action_suggestion: 'Prepare for Closing',
    });

    // Create closing tasks
    const closingDate = contract.closing_date ? new Date(contract.closing_date) : new Date();
    const tasksToCreate = [
      {
        lead_id: contract.lead_id,
        task_type: 'Call',
        due_date: new Date(closingDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Open',
        auto_generated: true,
        description: 'Schedule final walkthrough',
      },
      {
        lead_id: contract.lead_id,
        task_type: 'Call',
        due_date: new Date(closingDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Open',
        auto_generated: true,
        description: 'Confirm closing appointment',
      },
      {
        lead_id: contract.lead_id,
        task_type: 'Appointment',
        due_date: closingDate.toISOString(),
        status: 'Open',
        auto_generated: true,
        description: 'Closing day',
      },
    ];

    await base44.asServiceRole.entities.Task.bulkCreate(tasksToCreate);

    // Send notification to agent
    try {
      await base44.asServiceRole.functions.invoke('notifyAgentOnSignature', {
        contract_id: contract.id,
        lead_id: contract.lead_id,
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Continue even if notification fails
    }

    return Response.json({
      success: true,
      message: 'Lead updated, closing tasks created, and agent notified',
    });

  } catch (error) {
    console.error('Update lead on signature error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});