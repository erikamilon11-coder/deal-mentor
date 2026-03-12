import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contractId, leadId, signatureData, signerName } = await req.json();

    if (!contractId || !signatureData || !signerName) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upload signature image
    const signatureBlob = await fetch(signatureData).then(r => r.blob());
    const signatureFile = new File([signatureBlob], `signature-${contractId}.png`, { type: 'image/png' });
    
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: signatureFile,
    });

    // Update contract with signature
    await base44.asServiceRole.entities.Contract.update(contractId, {
      status: 'Signed',
      signed_date: new Date().toISOString(),
      signer_name: signerName,
      document_link: file_url, // Store signed version
    });

    // Update lead status to Under Contract
    if (leadId) {
      await base44.asServiceRole.entities.Lead.update(leadId, {
        status: 'Under Contract',
        last_activity_date: new Date().toISOString(),
      });

      // Get lead details for notification
      const lead = await base44.asServiceRole.entities.Lead.filter({ id: leadId }).then(r => r[0]);

      // Send notification email to agent
      const user = await base44.auth.me();
      if (user?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `Contract Signed: ${lead?.property_address || 'Property'}`,
          body: `
            Great news! The contract for ${lead?.property_address || 'the property'} has been signed.
            
            Signer: ${signerName}
            Signed: ${new Date().toLocaleString()}
            Lead Status: Updated to "Under Contract"
            
            Next steps:
            - Review the signed contract
            - Begin closing process
            - Schedule final walkthrough
            
            View the lead in your dashboard to continue.
          `,
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Signature submitted successfully',
      signatureUrl: file_url,
    });

  } catch (error) {
    console.error('Signature submission error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});