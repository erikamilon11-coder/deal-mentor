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

    const fullAddress = `${property_address}, ${city || ''}, ${state || ''} ${zip_code || ''}`.trim();
    
    // Fetch valuation data using LLM with web search
    const valuationData = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate valuation expert. Research and provide accurate valuation data for this property:

Property Address: ${fullAddress}

Provide the following data in JSON format:
1. Current estimated market value (current year)
2. Tax assessed value
3. Last recorded sale price and date
4. Property specifications: year built, square feet, bedrooms, bathrooms, lot size, property type
5. 3-5 recent comparable sales (comps) within 1 mile sold in last 6-12 months with: address, sale price, sale date, sqft, beds, baths
6. 3-year tax assessment history with year and assessed value
7. Data quality rating (verified, estimated, or partial)

Use public records, county assessor data, MLS, and real estate databases. If exact data unavailable, provide estimates based on comparable properties.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_value: { 
            type: "number",
            description: "Current estimated market value in dollars"
          },
          tax_assessed_value: { 
            type: "number",
            description: "Current tax assessed value"
          },
          last_sale_price: { 
            type: "number",
            description: "Last recorded sale price"
          },
          last_sale_date: { 
            type: "string",
            description: "Last sale date (YYYY-MM-DD format)"
          },
          year_built: { type: "number" },
          square_footage: { type: "number" },
          bedrooms: { type: "number" },
          bathrooms: { type: "number" },
          lot_size: { 
            type: "number",
            description: "Lot size in square feet"
          },
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
                price_per_sqft: { type: "number" },
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
                assessed_value: { type: "number" }
              }
            }
          },
          data_quality: { 
            type: "string",
            description: "verified, estimated, or partial"
          }
        }
      }
    });

    // Check if property data already exists for this lead
    const existingData = await base44.entities.PropertyData.filter({ 
      lead_id 
    }).then(results => results?.[0]);

    let propertyData;
    if (existingData) {
      // Update existing record
      propertyData = await base44.entities.PropertyData.update(existingData.id, {
        estimated_value: valuationData.estimated_value || null,
        tax_assessed_value: valuationData.tax_assessed_value || null,
        last_sale_price: valuationData.last_sale_price || null,
        last_sale_date: valuationData.last_sale_date || null,
        year_built: valuationData.year_built || null,
        square_footage: valuationData.square_footage || null,
        bedrooms: valuationData.bedrooms || null,
        bathrooms: valuationData.bathrooms || null,
        lot_size: valuationData.lot_size || null,
        property_type: valuationData.property_type || null,
        comps_data: JSON.stringify(valuationData.comps || []),
        tax_history: JSON.stringify(valuationData.tax_history || []),
        data_source: "Automated Valuation Model (AVM)",
        fetched_date: new Date().toISOString(),
      });
    } else {
      // Create new record
      propertyData = await base44.entities.PropertyData.create({
        lead_id,
        estimated_value: valuationData.estimated_value || null,
        tax_assessed_value: valuationData.tax_assessed_value || null,
        last_sale_price: valuationData.last_sale_price || null,
        last_sale_date: valuationData.last_sale_date || null,
        year_built: valuationData.year_built || null,
        square_footage: valuationData.square_footage || null,
        bedrooms: valuationData.bedrooms || null,
        bathrooms: valuationData.bathrooms || null,
        lot_size: valuationData.lot_size || null,
        property_type: valuationData.property_type || null,
        comps_data: JSON.stringify(valuationData.comps || []),
        tax_history: JSON.stringify(valuationData.tax_history || []),
        data_source: "Automated Valuation Model (AVM)",
        fetched_date: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      property_data: propertyData,
      valuation: {
        estimated_value: valuationData.estimated_value,
        tax_assessed_value: valuationData.tax_assessed_value,
        data_quality: valuationData.data_quality,
      },
      comps_count: valuationData.comps?.length || 0,
    });
  } catch (error) {
    console.error('Valuation fetch error:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch valuation',
      success: false 
    }, { status: 500 });
  }
});