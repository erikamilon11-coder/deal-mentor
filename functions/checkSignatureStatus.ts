import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// This function checks signature status and updates contract records
// In a real implementation, this would integrate with DocuSign webhooks or polling

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await req.json();

    if (!contract_id) {
      return Response.json({ error: 'Missing contract_id' }, { status: 400 });
    }

    // Fetch contract
    const contracts = await base44.entities.Contract.filter({ id: contract_id });
    const contract = contracts?.[0];

    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Return current status
    return Response.json({
      success: true,
      contract_id: contract.id,
      status: contract.status,
      signed_date: contract.signed_date,
      docusign_status: contract.docusign_status,
    });
  } catch (error) {
    console.error('Error checking signature status:', error);
    return Response.json(
      { error: error.message || 'Failed to check signature status' },
      { status: 500 }
    );
  }
});