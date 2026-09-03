import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, property_address, city, state, zip_code } = await req.json();

    if (!lead_id || !property_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use InvokeLLM with internet context to gather property data
    const fullAddress = `${property_address}, ${city}, ${state} ${zip_code}`;
    
    const propertyDataResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate data analyst. Research the following property and provide comprehensive data:

Property Address: ${fullAddress}

Please provide the following information in the exact JSON format specified:
1. Estimated current market value
2. Tax assessed value (most recent)
3. Last sale price and date
4. Property details (year built, square footage, bedrooms, bathrooms, lot size, property type)
5. Recent comparable sales (3-5 similar properties within 1 mile that sold in last 6 months)
6. Tax assessment history for last 3 years

Search public records, real estate databases, and county assessor information. If exact data is unavailable, provide best estimates based on similar properties in the area and note them as estimates.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_value: { type: "number" },
          tax_assessed_value: { type: "number" },
          last_sale_price: { type: "number" },
          last_sale_date: { type: "string" },
          year_built: { type: "number" },
          square_footage: { type: "number" },
          bedrooms: { type: "number" },
          bathrooms: { type: "number" },
          lot_size: { type: "number" },
          property_type: { type: "string" },
          comps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                sale_price: { type: "number" },
                sale_date: { type: "string" },
                square_footage: { type: "number" },
                bedrooms: { type: "number" },
                bathrooms: { type: "number" },
                distance_miles: { type: "number" }
              }
            }
          },
          tax_history: {
            type: "array",
            items: {
              type: "object",
              properties: {
                year: { type: "number" },
                assessed_value: { type: "number" },
                tax_amount: { type: "number" }
              }
            }
          },
          data_quality: { 
            type: "string",
            description: "verified, estimated, or partial"
          },
          notes: { type: "string" }
        }
      }
    });

    // Store the property data
    const propertyData = await base44.entities.PropertyData.create({
      lead_id,
      estimated_value: propertyDataResult.estimated_value || null,
      tax_assessed_value: propertyDataResult.tax_assessed_value || null,
      last_sale_price: propertyDataResult.last_sale_price || null,
      last_sale_date: propertyDataResult.last_sale_date || null,
      year_built: propertyDataResult.year_built || null,
      square_footage: propertyDataResult.square_footage || null,
      bedrooms: propertyDataResult.bedrooms || null,
      bathrooms: propertyDataResult.bathrooms || null,
      lot_size: propertyDataResult.lot_size || null,
      property_type: propertyDataResult.property_type || null,
      comps_data: JSON.stringify(propertyDataResult.comps || []),
      tax_history: JSON.stringify(propertyDataResult.tax_history || []),
      data_source: "AI-powered web research",
      fetched_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      property_data: propertyData,
      data_quality: propertyDataResult.data_quality,
      notes: propertyDataResult.notes,
    });

  } catch (error) {
    console.error('Property data fetch error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});