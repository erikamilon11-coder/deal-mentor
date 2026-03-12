import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, offer_price, assignment_fee, estimated_repairs, closing_date } = await req.json();

    if (!lead_id || !offer_price) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch all necessary data
    const leads = await base44.entities.Lead.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const owners = await base44.entities.Owner.filter({ lead_id });
    const owner = owners?.[0];

    const propertyDataList = await base44.entities.PropertyData.filter({ lead_id });
    const propertyData = propertyDataList?.[0];

    // Generate PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("PURCHASE AGREEMENT", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 8;

    // Property Information Section
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("PROPERTY INFORMATION", 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const propertyLines = [
      `Address: ${lead.property_address}`,
      `City, State, ZIP: ${lead.city}, ${lead.state} ${lead.zip_code}`,
      ...(propertyData?.bedrooms ? [`Bedrooms: ${propertyData.bedrooms}`] : []),
      ...(propertyData?.bathrooms ? [`Bathrooms: ${propertyData.bathrooms}`] : []),
      ...(propertyData?.square_footage ? [`Square Footage: ${propertyData.square_footage.toLocaleString()}`] : []),
      ...(propertyData?.year_built ? [`Year Built: ${propertyData.year_built}`] : []),
      ...(propertyData?.estimated_value ? [`Current Estimated Value: $${propertyData.estimated_value.toLocaleString()}`] : []),
    ];

    propertyLines.forEach((line) => {
      doc.text(line, 25, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Seller Information Section
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("SELLER INFORMATION", 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    if (owner) {
      doc.text(`Seller Name: ${owner.owner_name}`, 25, yPos);
      yPos += 5;
      if (owner.mailing_address) {
        doc.text(`Address: ${owner.mailing_address}`, 25, yPos);
        yPos += 5;
      }
      if (owner.email) {
        doc.text(`Email: ${owner.email}`, 25, yPos);
        yPos += 5;
      }
      if (owner.entity_type) {
        doc.text(`Entity Type: ${owner.entity_type}`, 25, yPos);
        yPos += 5;
      }
    } else {
      doc.text("Seller information to be provided", 25, yPos);
      yPos += 5;
    }

    yPos += 3;

    // Purchase Terms Section
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("PURCHASE TERMS", 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const terms = [
      `Purchase Price: $${offer_price.toLocaleString()}`,
      ...(estimated_repairs ? [`Estimated Repairs: $${estimated_repairs.toLocaleString()}`] : []),
      ...(assignment_fee ? [`Assignment Fee: $${assignment_fee.toLocaleString()}`] : []),
      `Total Consideration: $${(offer_price + (assignment_fee || 0)).toLocaleString()}`,
      ...(closing_date ? [`Proposed Closing Date: ${closing_date}`] : []),
      "Inspection Period: 10 days",
      "Due Diligence: 7 days",
    ];

    terms.forEach((term) => {
      doc.text(term, 25, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Conditions Section
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("CONDITIONS OF OFFER", 20, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    const conditions = [
      "1. This offer is subject to satisfactory inspection of the property.",
      "2. Buyer reserves the right to assign this contract to an entity of Buyer's choice.",
      "3. All utilities must be on for inspection.",
      "4. Buyer may conduct appraisal during inspection period.",
      "5. Seller to provide title commitment prior to closing.",
      "6. Closing within agreed timeline contingent on clear title.",
    ];

    conditions.forEach((condition) => {
      const lines = doc.splitTextToSize(condition, 160);
      doc.text(lines, 25, yPos);
      yPos += doc.getTextDimensions(condition).h + 2;
    });

    yPos += 5;

    // Buyer Information Section
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("BUYER INFORMATION", 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Name: ${user.full_name}`, 25, yPos);
    yPos += 5;
    doc.text(`Email: ${user.email}`, 25, yPos);
    yPos += 5;
    doc.text(`Date: _______________`, 25, yPos);
    yPos += 5;
    doc.text(`Signature: _______________`, 25, yPos);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated by Deal Mentor on ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Generate PDF as data URL
    const pdfData = doc.output("dataurlstring");

    // Create contract record
    const contract = await base44.entities.Contract.create({
      lead_id,
      purchase_price: offer_price,
      closing_date: closing_date || null,
      status: "Draft",
      signer_name: owner?.owner_name || "Seller",
      signer_email: owner?.email || "",
    });

    return Response.json({
      success: true,
      pdf_data: pdfData,
      contract_id: contract.id,
      filename: `purchase_agreement_${lead.property_address?.replace(/\s+/g, "_")}.pdf`,
      contract,
    });
  } catch (error) {
    console.error("Error generating purchase offer contract:", error);
    return Response.json(
      { error: error.message || "Failed to generate contract" },
      { status: 500 }
    );
  }
});