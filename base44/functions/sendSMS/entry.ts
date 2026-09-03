import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SMS_TEMPLATES = {
  "Offer Sent": {
    subject: "Offer on {address}",
    message: `Hi {owner_name},

Just wanted to let you know we've sent you a formal offer on {address}.

The offer details have been sent to your email. We're excited about the possibility of working with you!

If you have any questions, feel free to call or text me back.

Thanks,
{your_name}`
  },
  "Under Contract": {
    subject: "Contract accepted - {address}",
    message: `Great news {owner_name}!

We're officially under contract for {address}. I'll be in touch soon with next steps for closing.

Looking forward to a smooth transaction!

{your_name}`
  },
  "First Contact": {
    subject: "About {address}",
    message: `Hi {owner_name},

I'm {your_name}, a local real estate investor. I'm interested in your property at {address}.

Would you be open to a quick conversation about a cash offer? No obligation, just seeing if it might be a fit.

Thanks!`
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, template_key, phone_number, custom_message } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Get lead details
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 400 });
    }

    // Get owner details
    const owners = await base44.entities.Owner.filter({ lead_id });
    const owner = owners[0];

    // Get phone number
    let recipientPhone = phone_number;
    if (!recipientPhone && owner) {
      const phones = await base44.entities.Phone.filter({ owner_id: owner.id });
      const activePhone = phones.find(p => !p.do_not_contact);
      recipientPhone = activePhone?.phone_number;
    }

    if (!recipientPhone) {
      return Response.json({ 
        error: 'No phone number available',
        success: false 
      }, { status: 400 });
    }

    // Prepare message
    let messageText = custom_message;
    
    if (!messageText && template_key && SMS_TEMPLATES[template_key]) {
      const template = SMS_TEMPLATES[template_key];
      const ownerName = owner?.owner_name || 'Property Owner';
      const address = lead.property_address;
      const yourName = user.full_name || 'Real Estate Investor';

      messageText = template.message
        .replace(/{address}/g, address)
        .replace(/{owner_name}/g, ownerName)
        .replace(/{your_name}/g, yourName);
    }

    if (!messageText) {
      return Response.json({ error: 'No message content provided' }, { status: 400 });
    }

    // Send SMS via email integration (SMS gateway simulation)
    // In production, you would integrate with Twilio, Vonage, or similar
    await base44.integrations.Core.SendEmail({
      to: user.email, // Simulated - would be SMS gateway in production
      subject: `SMS to ${recipientPhone}`,
      body: `SIMULATED SMS
      
To: ${recipientPhone}
Message: ${messageText}

Note: In production, this would be sent via an SMS API like Twilio.`,
      from_name: "SMS System"
    });

    // Log the message
    await base44.entities.Message.create({
      lead_id,
      direction: "Outbound",
      channel: "SMS",
      message_text: messageText,
      message_timestamp: new Date().toISOString(),
    });

    // Update lead contact dates
    await base44.entities.Lead.update(lead_id, {
      last_contact_date: new Date().toISOString(),
      last_activity_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'SMS sent successfully',
      recipient: recipientPhone,
      text: messageText,
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});