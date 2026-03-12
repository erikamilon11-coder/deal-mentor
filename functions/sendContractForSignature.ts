import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId, signerEmail, signerName, documentUrl } = await req.json();

    if (!contractId || !signerEmail || !signerName) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the app's base URL for the signing page
    const appUrl = Deno.env.get('BASE44_APP_URL') || req.headers.get('origin') || 'https://app.base44.com';
    const signingUrl = `${appUrl}/sign-contract?id=${contractId}`;

    // Get contract and lead details
    const contract = await base44.asServiceRole.entities.Contract.filter({ id: contractId }).then(r => r[0]);
    const lead = contract?.lead_id 
      ? await base44.asServiceRole.entities.Lead.filter({ id: contract.lead_id }).then(r => r[0])
      : null;

    // Send email with signing link
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: signerEmail,
      subject: `Contract Ready to Sign: ${lead?.property_address || 'Property Purchase Agreement'}`,
      body: `
        Hello ${signerName},

        Your contract is ready for electronic signature.

        Property: ${lead?.property_address || 'N/A'}
        ${lead?.city ? `Location: ${lead.city}, ${lead.state} ${lead.zip_code}` : ''}
        ${contract?.purchase_price ? `Purchase Price: $${contract.purchase_price.toLocaleString()}` : ''}
        ${contract?.closing_date ? `Closing Date: ${new Date(contract.closing_date).toLocaleDateString()}` : ''}

        To review and sign the contract, please click the link below:
        ${signingUrl}

        This link will allow you to:
        - Review the full contract details
        - Draw your electronic signature
        - Complete the signing process securely

        Your signature will be legally binding and the contract will be finalized immediately upon completion.

        If you have any questions, please contact us.

        Best regards,
        ${user.full_name || 'Your Agent'}
      `,
    });

    // Update contract status
    await base44.asServiceRole.entities.Contract.update(contractId, {
      status: 'Sent',
      signer_email: signerEmail,
      signer_name: signerName,
      sent_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Contract sent for signature',
      signingUrl,
    });

  } catch (error) {
    console.error('Send contract error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});