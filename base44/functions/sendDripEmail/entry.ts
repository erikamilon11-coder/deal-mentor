import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const EMAIL_SEQUENCES = {
  "New Lead Welcome": [
    {
      sequence: 1,
      delay_days: 0,
      subject: "Quick question about {address}",
      body: `Hi {owner_name},

I noticed your property at {address} and wanted to reach out personally.

I'm a local real estate investor, and I'm interested in properties in your area. Would you be open to a quick conversation about your property?

I buy houses in any condition - no repairs needed, no fees, and we can close on your timeline.

Would you be interested in hearing a fair cash offer?

Best regards,
{your_name}`
    },
    {
      sequence: 2,
      delay_days: 3,
      subject: "Following up on {address}",
      body: `Hi {owner_name},

I wanted to follow up on my previous message about {address}.

I understand you might be busy, but I wanted to make sure you got my message.

Here's what makes working with us different:
• Fair cash offers within 24 hours
• No agent commissions or fees
• Close on your schedule
• We buy as-is - no repairs needed

Would you have 5 minutes this week for a quick call?

Best,
{your_name}`
    },
    {
      sequence: 3,
      delay_days: 7,
      subject: "Last chance - {address}",
      body: `Hi {owner_name},

I don't want to keep bothering you, so this will be my last message about {address}.

If you're ever interested in selling, or just curious about what your property might be worth, I'd be happy to provide a no-obligation offer.

Feel free to reach out anytime - my number is below.

Wishing you all the best,
{your_name}`
    },
    {
      sequence: 4,
      delay_days: 30,
      subject: "Still interested in {address}",
      body: `Hi {owner_name},

Hope you're doing well! I'm still interested in {address} if you ever decide to sell.

The market has been active lately, and I wanted to reach back out in case your situation has changed.

No pressure at all - just wanted you to know the offer still stands.

Best regards,
{your_name}`
    }
  ]
};

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

    // Get campaign details
    const campaigns = await base44.entities.EmailCampaign.filter({ id: campaign_id });
    const campaign = campaigns[0];

    if (!campaign || campaign.status !== 'Active') {
      return Response.json({ error: 'Campaign not found or not active' }, { status: 400 });
    }

    // Get lead and owner details
    const leads = await base44.entities.Lead.filter({ id: campaign.lead_id });
    const lead = leads[0];
    
    const owners = await base44.entities.Owner.filter({ lead_id: campaign.lead_id });
    const owner = owners[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 400 });
    }

    // Get the next email sequence
    const sequence = EMAIL_SEQUENCES[campaign.campaign_name][campaign.current_sequence];

    if (!sequence) {
      // Campaign complete
      await base44.entities.EmailCampaign.update(campaign_id, { 
        status: 'Completed',
        next_send_date: null
      });
      return Response.json({ success: true, message: 'Campaign completed' });
    }

    // Personalize email
    const ownerName = owner?.owner_name || 'Property Owner';
    const address = lead.property_address;
    const yourName = user.full_name || 'Real Estate Investor';

    const personalizedSubject = sequence.subject
      .replace('{address}', address)
      .replace('{owner_name}', ownerName);

    const personalizedBody = sequence.body
      .replace(/{address}/g, address)
      .replace(/{owner_name}/g, ownerName)
      .replace(/{your_name}/g, yourName);

    // Determine recipient email
    const recipientEmail = owner?.email || lead.contact_email || null;

    if (!recipientEmail) {
      return Response.json({ 
        error: 'No email address found for lead',
        success: false 
      }, { status: 400 });
    }

    // Send email
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: personalizedSubject,
      body: personalizedBody,
      from_name: yourName
    });

    // Log the email
    await base44.entities.EmailLog.create({
      lead_id: campaign.lead_id,
      campaign_id: campaign_id,
      sequence_number: sequence.sequence,
      subject: personalizedSubject,
      body: personalizedBody,
      sent_date: new Date().toISOString(),
      recipient_email: recipientEmail,
      opened: false,
      clicked: false
    });

    // Update campaign
    const nextSequence = campaign.current_sequence + 1;
    const nextEmail = EMAIL_SEQUENCES[campaign.campaign_name][nextSequence];
    
    const updates = {
      current_sequence: nextSequence
    };

    if (nextEmail) {
      const nextSendDate = new Date();
      nextSendDate.setDate(nextSendDate.getDate() + nextEmail.delay_days);
      updates.next_send_date = nextSendDate.toISOString();
    } else {
      updates.status = 'Completed';
      updates.next_send_date = null;
    }

    await base44.entities.EmailCampaign.update(campaign_id, updates);

    // Update lead last contact
    await base44.entities.Lead.update(campaign.lead_id, {
      last_contact_date: new Date().toISOString(),
      last_activity_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Email sent successfully',
      next_sequence: nextSequence,
      campaign_status: updates.status || 'Active'
    });

  } catch (error) {
    console.error('Drip email error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});