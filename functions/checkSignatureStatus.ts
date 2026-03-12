import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contract_id } = await req.json();

    if (!contract_id) {
      return Response.json({ error: 'Missing contract_id' }, { status: 400 });
    }

    // Fetch contract
    const contracts = await base44.entities.Contract.filter({ id: contract_id });
    const contract = contracts?.[0];

    if (!contract || !contract.docusign_envelope_id) {
      return Response.json({ 
        error: 'Contract not found or no envelope ID' 
      }, { status: 404 });
    }

    // Check status with DocuSign
    const docusignBaseUrl = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net/restapi';
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const apiKey = Deno.env.get('DOCUSIGN_API_KEY');

    if (!accountId || !apiKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const envelopeId = contract.docusign_envelope_id;
    const statusResponse = await fetch(
      `${docusignBaseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to fetch DocuSign envelope status`);
    }

    const envelopeData = await statusResponse.json();
    const status = envelopeData.status;

    // Update contract status if changed
    if (status !== contract.docusign_status) {
      await base44.entities.Contract.update(contract_id, {
        docusign_status: status,
      });

      // If signed, update to Signed status
      if (status === 'completed') {
        await base44.entities.Contract.update(contract_id, {
          status: 'Signed',
          signed_date: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      success: true,
      status,
      envelope_id: envelopeId,
      signers: envelopeData.recipients?.signers || [],
    });
  } catch (error) {
    console.error('Error checking signature status:', error);
    return Response.json(
      { error: error.message || 'Failed to check signature status' },
      { status: 500 }
    );
  }
});