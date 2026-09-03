import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    if (!event?.entity_id) {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    // Get lead data
    const lead = await base44.asServiceRole.entities.Lead.get(event.entity_id);
    if (!lead || !['Talking', 'Offer Sent'].includes(lead.status)) {
      return Response.json({ success: false, reason: 'Lead not in Talking or Offer Sent status' });
    }

    // Check if owner email exists
    const owners = await base44.asServiceRole.entities.Owner.filter({ lead_id: lead.id });
    const owner = owners?.[0];
    if (!owner?.email) {
      return Response.json({ 
        success: false, 
        reason: 'No owner email found. Add owner email to enable auto-sending.' 
      });
    }

    // Get latest offer
    const offers = await base44.asServiceRole.entities.Offer.filter({ lead_id: lead.id });
    const offer = offers?.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))?.[0];
    if (!offer) {
      return Response.json({ 
        success: false, 
        reason: 'No offer found for this lead.' 
      });
    }

    // Generate contract using backend function
    const contractResult = await base44.asServiceRole.functions.invoke('generateOfferPDF', {
      lead_id: lead.id,
      offer_id: offer.id,
      owner_name: owner.owner_name,
      owner_email: owner.email,
      auto_send: true,
    });

    if (!contractResult?.data?.file_url) {
      throw new Error('Failed to generate contract PDF');
    }

    // Send email to owner with contract attachment
    const subject = `Offer to Purchase - ${lead.property_address}`;
    const body = `Hello ${owner.owner_name},

We have prepared an offer to purchase your property at:
${lead.property_address}
${lead.city}, ${lead.state} ${lead.zip_code}

Offer Price: $${offer.offer_price?.toLocaleString() || 'TBD'}

Please review the attached contract and contact us with any questions.

Best regards`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner.email,
      subject: subject,
      body: body,
      from_name: 'Deal Mentor',
    });

    // Update lead with contract sent info
    const updates = {
      status: 'Offer Sent',
      last_contact_date: new Date().toISOString(),
      last_activity_date: new Date().toISOString(),
      next_action_suggestion: 'Follow Up for Decision',
    };

    // Set followup to 2 days from now
    const followupDate = new Date();
    followupDate.setDate(followupDate.getDate() + 2);
    updates.next_followup_date = followupDate.toISOString();

    await base44.asServiceRole.entities.Lead.update(lead.id, updates);

    // Create follow-up task if not already exists
    const existingTasks = await base44.asServiceRole.entities.Task.filter({ 
      lead_id: lead.id,
      status: 'Open',
      task_type: 'Call'
    });

    if (existingTasks.length === 0) {
      await base44.asServiceRole.entities.Task.create({
        lead_id: lead.id,
        task_type: 'Call',
        due_date: followupDate.toISOString(),
        status: 'Open',
        auto_generated: true,
        description: 'Follow up on contract offer decision',
      });
    }

    // Log activity
    await base44.asServiceRole.entities.Message.create({
      lead_id: lead.id,
      direction: 'Outbound',
      channel: 'Email',
      message_text: `Contract automatically sent to ${owner.email}`,
      message_timestamp: new Date().toISOString(),
    });

    return Response.json({ 
      success: true,
      message: `Contract sent to ${owner.email}`,
      contract_url: contractResult.data.file_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});