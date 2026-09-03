import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, property_address, city, state, zip_code } = await req.json();

    if (!lead_id && !property_address) {
      return Response.json({ error: 'Lead ID or property address required' }, { status: 400 });
    }

    // Get lead data if only ID provided
    let leadData = null;
    if (lead_id) {
      const leads = await base44.entities.Lead.filter({ id: lead_id });
      leadData = leads[0];
    } else {
      leadData = {
        property_address,
        city,
        state,
        zip_code,
      };
    }

    if (!leadData) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Use LLM to perform skip trace
    const prompt = `You are a skip trace expert. Given the following property information, find and return the owner's contact details.

Property Address: ${leadData.property_address}
City: ${leadData.city || 'Unknown'}
State: ${leadData.state || 'Unknown'}
Zip Code: ${leadData.zip_code || 'Unknown'}

Search for and provide the following information if available:
1. Owner's full name
2. Phone numbers (if multiple, list them)
3. Email addresses
4. Mailing address
5. Property ownership type (Individual, LLC, Trust, etc.)
6. Any other relevant ownership details

If you cannot find certain information, indicate that explicitly. Return results as structured data.`;

    const skipTraceResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          owner_name: { type: 'string', description: 'Full name of property owner' },
          phone_numbers: { type: 'array', items: { type: 'string' }, description: 'List of phone numbers' },
          email_addresses: { type: 'array', items: { type: 'string' }, description: 'List of email addresses' },
          mailing_address: { type: 'string', description: 'Mailing address if different from property' },
          entity_type: { type: 'string', enum: ['Individual', 'LLC', 'Trust', 'Other'], description: 'Type of property owner' },
          additional_details: { type: 'string', description: 'Any other relevant ownership information' },
          confidence_level: { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Confidence in the results' },
        },
      },
    });

    // Save to Lead record
    const updateData = {
      skip_trace_status: skipTraceResult.owner_name ? 'Completed' : 'No Data Found',
      owner: skipTraceResult.owner_name || leadData.owner || '',
      phone: skipTraceResult.phone_numbers?.[0] || leadData.phone || '',
      email: skipTraceResult.email_addresses?.[0] || leadData.email || '',
    };

    if (lead_id) {
      await base44.entities.Lead.update(lead_id, updateData);
    }

    // Create or update Owner record if data found
    let ownerRecord = null;
    if (skipTraceResult.owner_name && lead_id) {
      const existingOwners = await base44.entities.Owner.filter({ lead_id });
      
      if (existingOwners.length > 0) {
        await base44.entities.Owner.update(existingOwners[0].id, {
          owner_name: skipTraceResult.owner_name,
          email: skipTraceResult.email_addresses?.[0] || null,
          mailing_address: skipTraceResult.mailing_address,
          entity_type: skipTraceResult.entity_type || 'Individual',
        });
        ownerRecord = existingOwners[0].id;
      } else {
        const newOwner = await base44.entities.Owner.create({
          lead_id,
          owner_name: skipTraceResult.owner_name,
          email: skipTraceResult.email_addresses?.[0] || null,
          mailing_address: skipTraceResult.mailing_address,
          entity_type: skipTraceResult.entity_type || 'Individual',
        });
        ownerRecord = newOwner.id;
      }

      // Create Phone records for each phone number
      if (skipTraceResult.phone_numbers?.length > 0 && ownerRecord) {
        const existingPhones = await base44.entities.Phone.filter({ owner_id: ownerRecord });
        
        for (const phoneNum of skipTraceResult.phone_numbers) {
          const phoneExists = existingPhones.some(p => p.phone_number === phoneNum);
          if (!phoneExists) {
            await base44.entities.Phone.create({
              owner_id: ownerRecord,
              phone_number: phoneNum,
              confidence_level: skipTraceResult.confidence_level || 'Medium',
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      data: skipTraceResult,
      status: updateData.skip_trace_status,
      owner_id: ownerRecord,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});