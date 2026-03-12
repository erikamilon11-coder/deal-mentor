import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId, signerEmail, signerName, documentUrl } = await req.json();

    if (!contractId || !signerEmail || !signerName || !documentUrl) {
      return Response.json({ 
        error: 'Missing required fields: contractId, signerEmail, signerName, documentUrl' 
      }, { status: 400 });
    }

    // Get DocuSign credentials
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKeyBase64 = Deno.env.get('DOCUSIGN_PRIVATE_KEY');

    if (!integrationKey || !userId || !accountId || !privateKeyBase64) {
      return Response.json({ 
        error: 'DocuSign credentials not configured. Please set environment variables.' 
      }, { status: 500 });
    }

    // Decode private key
    const privateKeyPem = atob(privateKeyBase64);

    // Generate JWT for DocuSign authentication
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = btoa(JSON.stringify({
      iss: integrationKey,
      sub: userId,
      aud: 'account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation'
    }));

    // Import private key for signing
    const pemContents = privateKeyPem
      .replace('-----BEGIN RSA PRIVATE KEY-----', '')
      .replace('-----END RSA PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const dataToSign = new TextEncoder().encode(`${jwtHeader}.${jwtPayload}`);
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      dataToSign
    );

    const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${jwtHeader}.${jwtPayload}.${jwtSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return Response.json({ error: `DocuSign auth failed: ${error}` }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();

    // Download the document from the URL
    const docResponse = await fetch(documentUrl);
    const docBuffer = await docResponse.arrayBuffer();
    const docBase64 = btoa(String.fromCharCode(...new Uint8Array(docBuffer)));

    // Create envelope definition
    const envelopeDefinition = {
      emailSubject: 'Please sign this contract',
      documents: [{
        documentBase64: docBase64,
        name: 'Contract.pdf',
        fileExtension: 'pdf',
        documentId: '1',
      }],
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          tabs: {
            signHereTabs: [{
              anchorString: '/sig1/',
              anchorUnits: 'pixels',
              anchorXOffset: '0',
              anchorYOffset: '0',
            }],
            dateSignedTabs: [{
              anchorString: '/date1/',
              anchorUnits: 'pixels',
              anchorXOffset: '0',
              anchorYOffset: '0',
            }],
          },
        }],
      },
      status: 'sent',
    };

    // Send envelope
    const envelopeResponse = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeDefinition),
      }
    );

    if (!envelopeResponse.ok) {
      const error = await envelopeResponse.text();
      return Response.json({ error: `Failed to send envelope: ${error}` }, { status: 500 });
    }

    const envelope = await envelopeResponse.json();

    // Update contract with DocuSign envelope ID
    await base44.entities.Contract.update(contractId, {
      docusign_envelope_id: envelope.envelopeId,
      docusign_status: 'sent',
      status: 'Sent',
    });

    return Response.json({
      success: true,
      envelopeId: envelope.envelopeId,
      status: envelope.status,
    });
  } catch (error) {
    console.error('Error sending contract:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});