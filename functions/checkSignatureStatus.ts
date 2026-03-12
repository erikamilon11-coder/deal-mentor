import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { envelopeId } = await req.json();

    if (!envelopeId) {
      return Response.json({ error: 'envelopeId is required' }, { status: 400 });
    }

    // Get DocuSign credentials
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKeyBase64 = Deno.env.get('DOCUSIGN_PRIVATE_KEY');

    if (!integrationKey || !userId || !accountId || !privateKeyBase64) {
      return Response.json({ 
        error: 'DocuSign credentials not configured' 
      }, { status: 500 });
    }

    // Decode private key
    const privateKeyPem = atob(privateKeyBase64);

    // Generate JWT
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

    // Get access token
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

    // Get envelope status
    const statusResponse = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      return Response.json({ error: `Failed to get status: ${error}` }, { status: 500 });
    }

    const envelopeStatus = await statusResponse.json();

    return Response.json({
      envelopeId: envelopeStatus.envelopeId,
      status: envelopeStatus.status,
      sentDateTime: envelopeStatus.sentDateTime,
      completedDateTime: envelopeStatus.completedDateTime,
      recipients: envelopeStatus.recipients,
    });
  } catch (error) {
    console.error('Error checking signature status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});