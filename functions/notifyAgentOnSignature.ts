import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      // Allow service role invocation
    }

    const { contract_id, lead_id } = await req.json();

    if (!contract_id || !lead_id) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch contract and lead
    const contracts = await base44.asServiceRole.entities.Contract.filter({ id: contract_id });
    const contract = contracts?.[0];

    const leads = await base44.asServiceRole.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!contract || !lead) {
      return Response.json({ error: 'Contract or lead not found' }, { status: 404 });
    }

    // Fetch signer info from contract
    const signerName = contract.signer_name || 'Signer';
    const signerEmail = contract.signer_email || 'Unknown';

    // Send email notification to agent
    const emailBody = `
✅ Document Signed!

A purchase agreement has been signed and is ready for next steps.

**Property Details:**
Address: ${lead.property_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
Signer: ${signerName} (${signerEmail})
Signed Date: ${contract.signed_date ? new Date(contract.signed_date).toLocaleDateString() : 'Today'}
Purchase Price: $${contract.purchase_price?.toLocaleString() || 'N/A'}
Closing Date: ${contract.closing_date ? new Date(contract.closing_date).toLocaleDateString() : 'To be scheduled'}

**Next Steps:**
1. Review signed document
2. Prepare for closing
3. Coordinate title and appraisal
4. Schedule final walkthrough

The lead status has been automatically updated to "Under Contract" and closing tasks have been created.
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `✅ Contract Signed - ${lead.property_address}`,
      body: emailBody,
      from_name: 'Deal Mentor - Signature Alert',
    });

    // Also notify any other team members (admins)
    const adminUsers = await base44.asServiceRole.entities.User.filter({});
    const otherAdmins = adminUsers.filter(u => u.role === 'admin' && u.email !== user?.email);

    for (const admin of otherAdmins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Contract Signed - ${lead.property_address}`,
          body: emailBody,
          from_name: 'Deal Mentor - Signature Alert',
        });
      } catch (e) {
        console.error(`Failed to notify ${admin.email}:`, e);
      }
    }

    return Response.json({
      success: true,
      message: 'Agent notified of signature',
    });
  } catch (error) {
    console.error('Error notifying agent:', error);
    return Response.json(
      { error: error.message || 'Failed to notify agent' },
      { status: 500 }
    );
  }
});