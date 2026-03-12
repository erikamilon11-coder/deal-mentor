import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const DOCUMENT_TEMPLATES = {
  "Purchase Agreement": {
    content: (lead, owner, data) => `
PURCHASE AND SALE AGREEMENT

This Purchase and Sale Agreement ("Agreement") is entered into as of ${format(new Date(), "MMMM d, yyyy")}.

PROPERTY ADDRESS:
${lead.property_address || ""}
${lead.city || ""}, ${lead.state || ""} ${lead.zip_code || ""}

SELLER INFORMATION:
Name: ${owner?.owner_name || ""}
Mailing Address: ${owner?.mailing_address || ""}

BUYER INFORMATION:
${data.buyer_name || "[Buyer Name]"}
${data.buyer_address || "[Buyer Address]"}

PURCHASE PRICE: $${data.purchase_price || "[Price]"}
EARNEST MONEY: $${data.earnest_money || "[Amount]"}
CLOSING DATE: ${data.closing_date || "[Date]"}

TERMS AND CONDITIONS:
${data.custom_terms || "Standard purchase terms apply."}

The parties agree to the terms and conditions outlined above.

_________________________          _________________________
Seller Signature                   Buyer Signature

Date: _______________              Date: _______________
    `
  },
  "Letter of Intent": {
    content: (lead, owner, data) => `
LETTER OF INTENT

Date: ${format(new Date(), "MMMM d, yyyy")}

To: ${owner?.owner_name || "[Owner Name]"}
${owner?.mailing_address || "[Mailing Address]"}

RE: Property at ${lead.property_address || ""}, ${lead.city || ""}, ${lead.state || ""} ${lead.zip_code || ""}

Dear ${owner?.owner_name?.split(' ')[0] || "Property Owner"},

I am writing to express my interest in purchasing the above-referenced property.

PROPOSED OFFER:
Purchase Price: $${data.purchase_price || "[Amount]"}
Closing Timeline: ${data.closing_timeline || "[Timeline]"}
Contingencies: ${data.contingencies || "As-Is Sale"}

${data.additional_notes || ""}

This letter of intent is non-binding and is intended to outline the general terms for further negotiation.

Thank you for your consideration.

Sincerely,

${data.buyer_name || "[Your Name]"}
${data.buyer_phone || "[Phone]"}
${data.buyer_email || "[Email]"}
    `
  },
  "Offer Letter": {
    content: (lead, owner, data) => `
OFFICIAL OFFER TO PURCHASE

Date: ${format(new Date(), "MMMM d, yyyy")}

Property Owner: ${owner?.owner_name || ""}
Property Address: ${lead.property_address || ""}, ${lead.city || ""}, ${lead.state || ""} ${lead.zip_code || ""}

Dear ${owner?.owner_name?.split(' ')[0] || "Property Owner"},

I am pleased to submit this formal offer to purchase your property located at the address above.

OFFER DETAILS:
• Purchase Price: $${data.purchase_price || ""}
• Earnest Money Deposit: $${data.earnest_money || "5,000"}
• Inspection Period: ${data.inspection_period || "10 days"}
• Closing Date: ${data.closing_date || ""}
• Sale Type: ${data.sale_type || "As-Is"}

${data.special_conditions || ""}

This offer is valid until ${data.expiration_date || "[Date]"}.

Please contact me at your earliest convenience to discuss this offer.

Best regards,

${data.buyer_name || "[Your Name]"}
${data.buyer_phone || ""}
${data.buyer_email || ""}
    `
  },
  "Custom Letter": {
    content: (lead, owner, data) => data.custom_content || ""
  }
};

export default function DocumentGenerator({ lead, owner, onComplete }) {
  const [templateType, setTemplateType] = useState("Purchase Agreement");
  const [formData, setFormData] = useState({
    purchase_price: "",
    earnest_money: "",
    closing_date: "",
    buyer_name: "",
    buyer_address: "",
    buyer_phone: "",
    buyer_email: "",
    custom_terms: "",
    custom_content: ""
  });
  const [documentName, setDocumentName] = useState("");
  
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Generate document content
      const template = DOCUMENT_TEMPLATES[templateType];
      const content = template.content(lead, owner, formData);
      
      // Create HTML version for PDF generation
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { text-align: center; margin-bottom: 30px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <pre>${content}</pre>
        </body>
        </html>
      `;

      // Use InvokeLLM to convert to PDF-ready format
      const pdfResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Convert this document content into a clean, professional text format suitable for a PDF. Keep all the information but format it nicely:\n\n${content}`,
        response_json_schema: {
          type: "object",
          properties: {
            formatted_content: { type: "string" }
          }
        }
      });

      // Create a text file (PDF generation would require jsPDF in backend)
      const blob = new Blob([pdfResponse.formatted_content], { type: 'text/plain' });
      const file = new File([blob], `${documentName || templateType}.txt`, { type: 'text/plain' });
      
      // Upload document
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Save to Document entity
      const document = await base44.entities.Document.create({
        lead_id: lead.id,
        document_name: documentName || `${templateType} - ${format(new Date(), "MM-dd-yyyy")}`,
        document_type: templateType.includes("Agreement") ? "Contract" : "Other",
        file_url: file_url,
        file_size: blob.size,
        upload_date: new Date().toISOString(),
        notes: `Generated ${templateType}`
      });

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", lead.id] });
      if (onComplete) onComplete();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4" />
          Generate Document
        </h3>
        <p className="text-xs text-slate-500">
          Create contracts or letters with lead data auto-filled
        </p>
      </div>

      <div>
        <Label className="text-slate-700">Document Type</Label>
        <Select value={templateType} onValueChange={setTemplateType}>
          <SelectTrigger className="mt-1.5 h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(DOCUMENT_TEMPLATES).map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-slate-700">Document Name</Label>
        <Input
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder={`${templateType} - ${format(new Date(), "MM-dd-yyyy")}`}
          className="mt-1.5 h-10 rounded-lg"
        />
      </div>

      {templateType !== "Custom Letter" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-700">Purchase Price</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                placeholder="150000"
                className="mt-1.5 h-10 rounded-lg"
              />
            </div>
            <div>
              <Label className="text-slate-700">Earnest Money</Label>
              <Input
                type="number"
                value={formData.earnest_money}
                onChange={(e) => setFormData({ ...formData, earnest_money: e.target.value })}
                placeholder="5000"
                className="mt-1.5 h-10 rounded-lg"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-700">Closing Date</Label>
            <Input
              type="date"
              value={formData.closing_date}
              onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
              className="mt-1.5 h-10 rounded-lg"
            />
          </div>

          <div>
            <Label className="text-slate-700">Buyer Name</Label>
            <Input
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              placeholder="Your Name or Company"
              className="mt-1.5 h-10 rounded-lg"
            />
          </div>

          {templateType === "Purchase Agreement" && (
            <>
              <div>
                <Label className="text-slate-700">Buyer Address</Label>
                <Input
                  value={formData.buyer_address}
                  onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                  placeholder="123 Main St, City, ST 12345"
                  className="mt-1.5 h-10 rounded-lg"
                />
              </div>
              <div>
                <Label className="text-slate-700">Custom Terms</Label>
                <Textarea
                  value={formData.custom_terms}
                  onChange={(e) => setFormData({ ...formData, custom_terms: e.target.value })}
                  placeholder="Add any special terms or conditions..."
                  className="mt-1.5 rounded-lg"
                  rows={3}
                />
              </div>
            </>
          )}
        </>
      )}

      {templateType === "Custom Letter" && (
        <div>
          <Label className="text-slate-700">Letter Content</Label>
          <Textarea
            value={formData.custom_content}
            onChange={(e) => setFormData({ ...formData, custom_content: e.target.value })}
            placeholder="Write your custom letter here..."
            className="mt-1.5 rounded-lg min-h-64"
            rows={12}
          />
          <p className="text-xs text-slate-500 mt-2">
            Available placeholders: {"{property_address}"}, {"{owner_name}"}, {"{city}"}, {"{state}"}
          </p>
        </div>
      )}

      <Button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        className="w-full bg-slate-900 h-11 rounded-lg"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Generate & Save Document
          </>
        )}
      </Button>

      {generateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">Document generated and saved to lead profile</p>
        </div>
      )}
    </div>
  );
}