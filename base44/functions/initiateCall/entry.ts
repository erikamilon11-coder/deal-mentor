import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, phone_number } = await req.json();

    if (!lead_id || !phone_number) {
      return Response.json({ error: 'Missing lead_id or phone_number' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // Fetch lead
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Create Twilio call with recording webhook
    const webhookUrl = `${Deno.env.get('APP_BASE_URL') || 'https://yourapp.com'}/api/webhooks/call-recording`;
    
    const callData = new URLSearchParams({
      To: phone_number,
      From: twilioPhone,
      Twiml: `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>This call is being recorded for quality and training purposes.</Say>
          <Record 
            maxLength="3600" 
            recordingStatusCallback="${webhookUrl}"
            recordingStatusCallbackMethod="POST"
            transcribe="true"
            transcribeCallback="${webhookUrl}"
          />
          <Hangup/>
        </Response>`,
    });

    const authString = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: callData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      throw new Error(`Failed to initiate call: ${response.status}`);
    }

    const callResponse = await response.json();

    // Log the call attempt
    const message = await base44.entities.Message.create({
      lead_id,
      direction: 'Outbound',
      channel: 'Call',
      message_text: `Outbound call initiated to ${phone_number}`,
      message_timestamp: new Date().toISOString(),
    });

    // Create a call log entry (using Message entity temporarily)
    const callLog = await base44.entities.Message.create({
      lead_id,
      direction: 'Outbound',
      channel: 'Call',
      message_text: `Call SID: ${callResponse.sid}`,
      message_timestamp: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      call_sid: callResponse.sid,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    return Response.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
});