import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id, signer_email, signer_name, pdf_url } = await req.json();

    if (!contract_id || !signer_email || !pdf_url) {
      return Response.json(
        { error: 'Missing required fields: contract_id, signer_email, pdf_url' },
        { status: 400 }
      );
    }

    // Fetch contract and lead
    const contracts = await base44.entities.Contract.filter({ id: contract_id });
    const contract = contracts?.[0];

    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    const leads = await base44.entities.Lead.filter({ id: contract.lead_id });
    const lead = leads?.[0];

    // Fetch PDF file content
    const pdfResponse = await fetch(pdf_url);
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF for signing');
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Create DocuSign envelope
    const docusignBaseUrl = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net/restapi';
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const apiKey = Deno.env.get('DOCUSIGN_API_KEY');

    if (!accountId || !apiKey) {
      throw new Error('DocuSign credentials not configured');
    }

    const envelopeData = {
      emailSubject: `Purchase Agreement Signature Required - ${lead?.property_address || 'Property'}`,
      documents: [
        {
          documentBase64: base64Pdf,
          name: 'Purchase_Agreement.pdf',
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: signer_email,
            name: signer_name || 'Signer',
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  pageNumber: '1',
                  xPosition: '100',
                  yPosition: '100',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    };

    const docusignResponse = await fetch(
      `${docusignBaseUrl}/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeData),
      }
    );

    if (!docusignResponse.ok) {
      const error = await docusignResponse.text();
      console.error('DocuSign API error:', error);
      throw new Error(`DocuSign API error: ${docusignResponse.status}`);
    }

    const envelopeResponse = await docusignResponse.json();
    const envelopeId = envelopeResponse.envelopeId;

    // Update contract with DocuSign envelope ID
    await base44.entities.Contract.update(contract_id, {
      docusign_envelope_id: envelopeId,
      docusign_status: 'sent',
      signer_email,
      signer_name,
      sent_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Contract sent for signature via DocuSign',
      envelope_id: envelopeId,
    });
  } catch (error) {
    console.error('Error sending contract for signature:', error);
    return Response.json(
      { error: error.message || 'Failed to send contract for signature' },
      { status: 500 }
    );
  }
});