import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contract_id, lead_id } = await req.json();

    if (!contract_id || !lead_id) {
      return Response.json({ error: 'Missing contract_id or lead_id' }, { status: 400 });
    }

    // Get contract and lead details
    const contracts = await base44.entities.Contract.filter({ id: contract_id });
    const contract = contracts[0];
    
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads[0];

    if (!contract || !lead) {
      return Response.json({ error: 'Contract or lead not found' }, { status: 404 });
    }

    // Get the agent who created the lead
    const agentEmail = lead.created_by;

    if (!agentEmail) {
      return Response.json({ error: 'No agent email found' }, { status: 400 });
    }

    // Send email notification to agent
    const emailSubject = `✅ Contract Signed: ${lead.property_address}`;
    const emailBody = `
      <h2>Great news! A contract has been signed.</h2>
      
      <h3>Property Details:</h3>
      <ul>
        <li><strong>Address:</strong> ${lead.property_address}</li>
        <li><strong>City:</strong> ${lead.city}, ${lead.state}</li>
        <li><strong>Purchase Price:</strong> $${contract.purchase_price?.toLocaleString() || 'N/A'}</li>
        <li><strong>Closing Date:</strong> ${contract.closing_date || 'Not set'}</li>
      </ul>
      
      <h3>Signer Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${contract.signer_name}</li>
        <li><strong>Email:</strong> ${contract.signer_email}</li>
        <li><strong>Signed Date:</strong> ${new Date(contract.signed_date).toLocaleDateString()}</li>
      </ul>
      
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>The lead status has been updated to "Under Contract"</li>
        <li>The closing checklist workflow has been initiated</li>
        <li>Automated follow-up tasks have been created</li>
      </ul>
      
      <p>Log in to your Deal Mentor dashboard to view the closing checklist and manage next steps.</p>
      
      <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc; color: #666; font-size: 12px;">
        This is an automated notification from Deal Mentor.
      </p>
    `;

    await base44.integrations.Core.SendEmail({
      to: agentEmail,
      subject: emailSubject,
      body: emailBody,
      from_name: 'Deal Mentor',
    });

    return Response.json({ 
      success: true, 
      message: 'Agent notified successfully',
      agent_email: agentEmail 
    });
  } catch (error) {
    console.error('Error notifying agent:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});