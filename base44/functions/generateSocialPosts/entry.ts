import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Fetch lead and property data
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const propertyDataList = await base44.entities.PropertyData.filter({ lead: lead_id });
    const propertyData = propertyDataList?.[0];

    // Generate social media posts for different platforms
    const socialPrompt = `Create engaging social media posts for real estate property marketing. Generate JSON with posts optimized for each platform:

Property Details:
Address: ${lead.property_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
${propertyData?.square_footage ? `Square Footage: ${propertyData.square_footage}` : ''}
${propertyData?.bedrooms ? `Bedrooms: ${propertyData.bedrooms}` : ''}
${propertyData?.bathrooms ? `Bathrooms: ${propertyData.bathrooms}` : ''}
${propertyData?.estimated_value ? `Estimated Value: $${propertyData.estimated_value.toLocaleString()}` : ''}

Generate a JSON object with:
{
  "instagram": "A visually engaging caption with 2-3 relevant hashtags (max 150 chars)",
  "facebook": "A longer, engaging post (max 280 chars) suitable for discussions",
  "twitter": "A concise tweet with hashtags (max 280 chars)",
  "linkedin": "A professional post about market opportunity (max 300 chars)"
}`;

    const socialPosts = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: socialPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          instagram: { type: "string" },
          facebook: { type: "string" },
          twitter: { type: "string" },
          linkedin: { type: "string" },
        },
      },
    });

    return Response.json({
      success: true,
      posts: socialPosts,
      property_address: lead.property_address,
      property_city: lead.city,
      property_state: lead.state,
    });
  } catch (error) {
    console.error("Error generating social posts:", error);
    return Response.json(
      { error: error.message || "Failed to generate social posts" },
      { status: 500 }
    );
  }
});