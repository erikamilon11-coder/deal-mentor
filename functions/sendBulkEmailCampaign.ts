import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return Response.json({ error: 'Missing campaign_id' }, { status: 400 });
    }

    // Fetch campaign
    const campaigns = await base44.entities.BulkEmailCampaign.filter({ id: campaign_id });
    const campaign = campaigns?.[0];

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Fetch template
    const templates = await base44.entities.EmailTemplate.filter({ id: campaign.template_id });
    const template = templates?.[0];

    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Parse filters and get matching leads
    const filters = JSON.parse(campaign.recipient_filter || '{}');
    let leads = await base44.entities.Lead.list();

    if (filters.statuses && filters.statuses.length > 0) {
      leads = leads.filter(l => filters.statuses.includes(l.status));
    }
    if (filters.sources && filters.sources.length > 0) {
      leads = leads.filter(l => filters.sources.includes(l.lead_source));
    }
    if (filters.minDealScore) {
      leads = leads.filter(l => (l.deal_score || 0) >= filters.minDealScore);
    }

    // Get owner info for each lead
    let sentCount = 0;
    const emailLogs = [];

    for (const lead of leads) {
      const owners = await base44.entities.Owner.filter({ lead_id: lead.id });
      const owner = owners?.[0];

      if (owner?.email) {
        // Replace dynamic fields in template
        let htmlContent = template.html_content;
        htmlContent = htmlContent.replace(/\{\{property_address\}\}/g, lead.property_address || 'N/A');
        htmlContent = htmlContent.replace(/\{\{owner_name\}\}/g, owner.owner_name || 'there');
        htmlContent = htmlContent.replace(/\{\{deal_score\}\}/g, lead.deal_score || 'N/A');

        // Send email
        try {
          await base44.integrations.Core.SendEmail({
            to: owner.email,
            subject: template.subject,
            body: htmlContent,
            from_name: user.full_name || 'Deal Mentor',
          });

          // Log email
          emailLogs.push({
            lead_id: lead.id,
            campaign_id: campaign.id,
            subject: template.subject,
            body: htmlContent,
            recipient_email: owner.email,
            sent_date: new Date().toISOString(),
          });

          sentCount++;
        } catch (error) {
          console.error(`Failed to send email to ${owner.email}:`, error);
        }
      }
    }

    // Bulk create email logs
    if (emailLogs.length > 0) {
      await base44.entities.EmailLog.bulkCreate(emailLogs);
    }

    // Update campaign status
    await base44.entities.BulkEmailCampaign.update(campaign.id, {
      status: 'Completed',
      sent_count: sentCount,
      started_date: new Date().toISOString(),
      completed_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      sent_count: sentCount,
      message: `Campaign sent to ${sentCount} recipients`,
    });
  } catch (error) {
    console.error('Error sending bulk campaign:', error);
    return Response.json(
      { error: error.message || 'Failed to send campaign' },
      { status: 500 }
    );
  }
});