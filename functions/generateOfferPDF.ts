import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lead_id, offer_id, owner_name, owner_email, auto_send } = await req.json();

    // Get lead and offer data
    const lead = await base44.asServiceRole.entities.Lead.get(lead_id);
    const offer = await base44.asServiceRole.entities.Offer.get(offer_id);

    if (!lead || !offer) {
      return Response.json({ error: 'Lead or offer not found' }, { status: 404 });
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE AGREEMENT', 20, 20);

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

    let yPosition = 45;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = 170;

    // Property Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PROPERTY INFORMATION', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const propertyText = doc.splitTextToSize(
      `Property Address: ${lead.property_address}\nCity: ${lead.city}, ${lead.state} ${lead.zip_code}`,
      maxWidth
    );
    doc.text(propertyText, margin, yPosition);
    yPosition += propertyText.length * 5 + 8;

    // Parties
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PARTIES', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Seller: ${owner_name}`, margin, yPosition);
    yPosition += 6;
    doc.text('Buyer: [Buyer Name/Entity]', margin, yPosition);
    yPosition += 10;

    // Purchase Price
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PURCHASE PRICE', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const priceText = `Total Purchase Price: $${offer.offer_price?.toLocaleString() || 'TBD'}\nPayable upon closing or as otherwise agreed.`;
    const splitPrice = doc.splitTextToSize(priceText, maxWidth);
    doc.text(splitPrice, margin, yPosition);
    yPosition += splitPrice.length * 5 + 10;

    // Terms
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TERMS & CONDITIONS', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const termsText = `This offer is contingent upon:
• Satisfactory property inspection
• Clear title review
• Buyer financing approval
• Any other conditions as mutually agreed

This agreement constitutes the entire understanding between the parties. Any modifications must be in writing and signed by both parties.`;
    const splitTerms = doc.splitTextToSize(termsText, maxWidth);
    doc.text(splitTerms, margin, yPosition);
    yPosition += splitTerms.length * 5 + 15;

    // Signature block
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SIGNATURES', margin, yPosition);
    yPosition += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Seller: ____________________________     Date: __________', margin, yPosition);
    yPosition += 6;
    doc.text(`(${owner_name})`, margin + 60, yPosition);
    yPosition += 12;

    doc.text('Buyer: ____________________________     Date: __________', margin, yPosition);
    yPosition += 6;
    doc.text('[Buyer Name]', margin + 60, yPosition);

    // Convert to blob
    const pdfData = doc.output('arraybuffer');
    const fileName = `${lead.property_address.split(' ')[0]}_offer_${Date.now()}.pdf`;

    // Upload file
    const file = new Blob([pdfData], { type: 'application/pdf' });
    const fileInput = new File([file], fileName, { type: 'application/pdf' });

    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: fileInput
    });

    if (!uploadResponse.file_url) {
      throw new Error('Failed to upload PDF');
    }

    // Save document record
    await base44.asServiceRole.entities.Document.create({
      lead_id: lead.id,
      document_name: `Purchase Agreement - ${new Date().toLocaleDateString()}`,
      document_type: 'Contract',
      file_url: uploadResponse.file_url,
      file_size: pdfData.byteLength,
      upload_date: new Date().toISOString(),
      notes: `Auto-generated offer contract\nOffer Price: $${offer.offer_price?.toLocaleString()}\nSent to: ${owner_email}`
    });

    return Response.json({
      success: true,
      file_url: uploadResponse.file_url,
      fileName: fileName
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});