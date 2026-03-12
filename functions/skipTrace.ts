import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner_id, owner_name, property_address, city, state, zip_code } = await req.json();

    if (!owner_id || !owner_name || !property_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use InvokeLLM with internet context to perform skip tracing
    const fullAddress = `${property_address}, ${city}, ${state} ${zip_code}`;
    
    const skipTraceResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional skip tracer. Find current contact information for the following property owner:

Owner Name: ${owner_name}
Property Address: ${fullAddress}

Please search public records, property databases, voter registration records, and other publicly available sources to find:
1. All available phone numbers (mobile and landline)
2. Email addresses
3. Current mailing address (if different from property address)
4. Any alternative addresses

Search thoroughly and provide ALL contact information you can find. For phone numbers, indicate confidence level based on how recent and reliable the source is.

Return ONLY verified information from reliable public sources. If no information is found for a field, return null.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          phones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "string" },
                type: { 
                  type: "string",
                  description: "mobile, landline, or unknown"
                },
                confidence: {
                  type: "string",
                  description: "High, Medium, or Low"
                },
                source: { type: "string" }
              }
            }
          },
          emails: {
            type: "array",
            items: {
              type: "object",
              properties: {
                email: { type: "string" },
                source: { type: "string" }
              }
            }
          },
          current_mailing_address: {
            type: "object",
            properties: {
              address: { type: "string" },
              is_different_from_property: { type: "boolean" }
            }
          },
          alternative_addresses: {
            type: "array",
            items: {
              type: "string"
            }
          },
          data_quality: {
            type: "string",
            description: "excellent, good, partial, or poor"
          },
          notes: { type: "string" }
        }
      }
    });

    // Update owner with primary email if found
    const updates = {};
    if (skipTraceResult.emails && skipTraceResult.emails.length > 0) {
      updates.email = skipTraceResult.emails[0].email;
    }
    if (skipTraceResult.current_mailing_address?.address) {
      updates.mailing_address = skipTraceResult.current_mailing_address.address;
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.Owner.update(owner_id, updates);
    }

    // Add phone numbers
    const phonesCreated = [];
    if (skipTraceResult.phones && skipTraceResult.phones.length > 0) {
      for (const phone of skipTraceResult.phones) {
        const phoneRecord = await base44.entities.Phone.create({
          owner_id,
          phone_number: phone.number,
          confidence_level: phone.confidence || "Medium",
          do_not_contact: false,
          last_verified_date: new Date().toISOString().split('T')[0],
        });
        phonesCreated.push(phoneRecord);
      }
    }

    return Response.json({
      success: true,
      data: {
        phones_found: skipTraceResult.phones?.length || 0,
        emails_found: skipTraceResult.emails?.length || 0,
        mailing_address_updated: !!skipTraceResult.current_mailing_address?.address,
        data_quality: skipTraceResult.data_quality,
        details: {
          phones: skipTraceResult.phones || [],
          emails: skipTraceResult.emails || [],
          current_mailing_address: skipTraceResult.current_mailing_address,
          alternative_addresses: skipTraceResult.alternative_addresses || [],
        },
        notes: skipTraceResult.notes,
      }
    });

  } catch (error) {
    console.error('Skip trace error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});