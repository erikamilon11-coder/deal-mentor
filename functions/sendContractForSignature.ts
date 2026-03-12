import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, signer_email, signer_name, document_url, document_title } = await req.json();

    if (!lead_id || !signer_email || !document_url) {
      return Response.json(
        { error: 'Missing required fields: lead_id, signer_email, document_url' },
        { status: 400 }
      );
    }

    // Fetch lead data for email context
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Send email with signing link
    const emailBody = `
Dear ${signer_name || 'there'},

A contract document requires your signature: ${document_title}

Property: ${lead.property_address}, ${lead.city}, ${lead.state} ${lead.zip_code}

Please review and sign the document by clicking the link below:
${document_url}

This document is ready for your review and signature.

Best regards,
${user.full_name || 'Your Agent'}
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: signer_email,
      subject: `Document Signing Required: ${document_title}`,
      body: emailBody,
      from_name: user.full_name || 'Deal Mentor',
    });

    return Response.json({
      success: true,
      message: 'Contract sent successfully',
      envelope_id: null, // Can be used for tracking if implementing DocuSign
    });
  } catch (error) {
    console.error('Error sending contract:', error);
    return Response.json(
      { error: error.message || 'Failed to send contract' },
      { status: 500 }
    );
  }
});