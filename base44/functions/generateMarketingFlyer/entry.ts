import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, include_property_details = true } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'Missing lead_id' }, { status: 400 });
    }

    // Fetch lead and property data
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const propertyDataList = await base44.entities.PropertyData.filter({ lead_id });
    const propertyData = propertyDataList?.[0];

    // Generate compelling marketing copy using AI
    const marketingPrompt = `Create a compelling real estate marketing flyer headline and description for this property:
Address: ${lead.property_address}, ${lead.city}, ${lead.state} ${lead.zip_code}
${propertyData?.square_footage ? `Square Footage: ${propertyData.square_footage}` : ''}
${propertyData?.bedrooms ? `Bedrooms: ${propertyData.bedrooms}` : ''}
${propertyData?.bathrooms ? `Bathrooms: ${propertyData.bathrooms}` : ''}
${propertyData?.year_built ? `Year Built: ${propertyData.year_built}` : ''}
${propertyData?.estimated_value ? `Estimated Value: $${propertyData.estimated_value.toLocaleString()}` : ''}

Generate a JSON object with:
{
  "headline": "A catchy headline (max 10 words)",
  "tagline": "A compelling tagline",
  "description": "2-3 sentences about the property highlighting its best features",
  "cta": "Call to action (max 8 words)"
}`;

    const marketingContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: marketingPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          tagline: { type: "string" },
          description: { type: "string" },
          cta: { type: "string" },
        },
      },
    });

    // Generate PDF flyer
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Background color
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 297, "F");

    // White content area
    doc.setFillColor(255, 255, 255);
    doc.rect(10, 20, 190, 257, "F");

    // Header
    doc.setFontSize(32);
    doc.setTextColor(30, 58, 138);
    doc.setFont(undefined, "bold");
    doc.text(marketingContent.headline, 105, 50, { align: "center", maxWidth: 180 });

    // Tagline
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, "italic");
    doc.text(marketingContent.tagline, 105, 70, { align: "center", maxWidth: 180 });

    // Address
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.setFont(undefined, "bold");
    doc.text(lead.property_address, 105, 90, { align: "center", maxWidth: 180 });

    // City, State, ZIP
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${lead.city}, ${lead.state} ${lead.zip_code}`, 105, 100, {
      align: "center",
      maxWidth: 180,
    });

    // Property Details
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    let yPos = 120;
    doc.setFont(undefined, "bold");
    doc.text("Property Details", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    const details = [];
    if (propertyData?.bedrooms) details.push(`${propertyData.bedrooms} Bed`);
    if (propertyData?.bathrooms) details.push(`${propertyData.bathrooms} Bath`);
    if (propertyData?.square_footage) details.push(`${propertyData.square_footage.toLocaleString()} sqft`);
    if (propertyData?.year_built) details.push(`Built ${propertyData.year_built}`);
    if (propertyData?.estimated_value)
      details.push(`Est. Value: $${propertyData.estimated_value.toLocaleString()}`);

    details.forEach((detail) => {
      doc.text(`• ${detail}`, 25, yPos);
      yPos += 6;
    });

    // Description
    yPos += 5;
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("About This Property", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(marketingContent.description, 20, yPos, { maxWidth: 170 });

    // CTA
    yPos = 250;
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(30, 58, 138);
    doc.rect(30, yPos, 150, 20, "F");
    doc.setFont(undefined, "bold");
    doc.text(marketingContent.cta, 105, yPos + 12, { align: "center" });

    // Contact info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Contact: ${user.full_name} • ${user.email}`, 105, 280, {
      align: "center",
    });

    // Generate PDF as base64
    const pdfData = doc.output("dataurlstring");

    return Response.json({
      success: true,
      pdf_data: pdfData,
      marketing_content: marketingContent,
      filename: `flyer_${lead.property_address?.replace(/\s+/g, "_")}.pdf`,
    });
  } catch (error) {
    console.error("Error generating marketing flyer:", error);
    return Response.json(
      { error: error.message || "Failed to generate flyer" },
      { status: 500 }
    );
  }
});