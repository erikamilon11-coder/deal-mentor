import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a Twilio webhook, so we use service role
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const recordingSid = formData.get('RecordingSid');
    const transcriptionSid = formData.get('TranscriptionSid');
    const transcriptionText = formData.get('TranscriptionText');

    if (!callSid) {
      return Response.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Find the lead by looking for a message with the call SID
    const messages = await base44.asServiceRole.entities.Message.filter({});
    const callMessage = messages.find(m => m.message_text?.includes(callSid));

    if (!callMessage) {
      console.warn(`No lead found for call ${callSid}`);
      return Response.json({ success: true, message: 'Call logged but no lead found' });
    }

    const leadId = callMessage.lead_id;

    // If we have a transcription, summarize it using AI
    let summary = '';
    if (transcriptionText) {
      try {
        const summaryResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Summarize this call transcript in 2-3 sentences focusing on key outcomes, next steps, and any important information for a real estate deal:\n\n${transcriptionText}`,
          model: 'gpt_5_mini',
        });
        summary = summaryResponse;
      } catch (e) {
        console.error('Failed to summarize transcription:', e);
        summary = transcriptionText?.substring(0, 500) || '';
      }
    }

    // Update the message with transcription and summary
    const updatedMessage = await base44.asServiceRole.entities.Message.update(callMessage.id, {
      message_text: summary || `Call completed (${new Date().toLocaleTimeString()})`,
    });

    // Update lead activity
    await base44.asServiceRole.entities.Lead.update(leadId, {
      last_contact_date: new Date().toISOString(),
      last_activity_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Call recording processed and summarized',
      lead_id: leadId,
      summary: summary || 'No transcription available',
    });
  } catch (error) {
    console.error('Error processing call recording:', error);
    return Response.json(
      { error: error.message || 'Failed to process call recording' },
      { status: 500 }
    );
  }
});