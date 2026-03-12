import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_ids, campaign_id } = await req.json();

    if (!lead_ids || !Array.isArray(lead_ids) || !campaign_id) {
      return Response.json({ error: 'Missing lead_ids or campaign_id' }, { status: 400 });
    }

    // Fetch campaign
    const campaigns = await base44.entities.CampaignSequence.filter({ id: campaign_id });
    const campaign = campaigns?.[0];

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check for existing enrollments
    const existingEnrollments = await base44.entities.CampaignEnrollment.filter({});
    const existingLeadIds = new Set(
      existingEnrollments
        .filter(e => e.campaign_id === campaign_id)
        .map(e => e.lead_id)
    );

    // Enroll leads
    const enrollments = [];
    const skipped = [];
    const now = new Date().toISOString();

    for (const lead_id of lead_ids) {
      if (existingLeadIds.has(lead_id)) {
        skipped.push(lead_id);
        continue;
      }

      const enrollment = await base44.entities.CampaignEnrollment.create({
        lead_id,
        campaign_id,
        current_step: 0,
        enrollment_date: now,
        next_send_date: calculateNextSendDate(campaign, 0),
        status: 'Active',
      });

      enrollments.push(enrollment);
    }

    // Log bulk action
    if (enrollments.length > 0) {
      await base44.asServiceRole.entities.Message.create({
        lead_id: lead_ids[0],
        direction: 'Outbound',
        channel: 'Email',
        message_text: `Bulk enrolled ${enrollments.length} leads into campaign: ${campaign.campaign_name}`,
        message_timestamp: now,
      });
    }

    return Response.json({
      success: true,
      enrolled_count: enrollments.length,
      skipped_count: skipped.length,
      enrollments,
      message: `Successfully enrolled ${enrollments.length} leads. ${skipped.length} already enrolled.`,
    });
  } catch (error) {
    console.error('Error bulk enrolling campaign:', error);
    return Response.json(
      { error: error.message || 'Failed to enroll leads' },
      { status: 500 }
    );
  }
});

function calculateNextSendDate(campaign, stepIndex) {
  const steps = JSON.parse(campaign.sequence_steps || '[]');
  const step = steps[stepIndex];
  
  if (!step) return new Date().toISOString();

  const delayMs = (step.delay_hours || 0) * 60 * 60 * 1000;
  return new Date(Date.now() + delayMs).toISOString();
}