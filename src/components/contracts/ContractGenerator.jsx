import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";

const CONTRACT_TEMPLATES = {
  standard: {
    name: "Standard Offer Contract",
    title: "PURCHASE AGREEMENT",
    sections: [
      { title: "PROPERTY INFORMATION", content: "Property Address: {{property_address}}\nCity: {{city}}, {{state}} {{zip_code}}" },
      { title: "PARTIES", content: "Seller: {{owner_name}}\nBuyer: [Buyer Name]" },
      { title: "PURCHASE PRICE", content: "Total Purchase Price: {{offer_price}}\nPayable upon closing or as otherwise agreed." },
      { title: "CLOSING DATE", content: "Closing Date: {{closing_date}}\n\nThe transaction shall close on or before the date specified above." },
      { title: "CONTINGENCIES", content: "This offer is contingent upon:\n- Satisfactory property inspection\n- Clear title review\n- Buyer's financing approval" },
      { title: "EARNEST MONEY", content: "Earnest Money Deposit: [Amount]\nTo be held in escrow and applied to purchase price at closing." },
      { title: "TERMS & CONDITIONS", content: "This agreement constitutes the entire understanding between the parties. Any modifications must be in writing and signed by both parties." }
    ]
  },
  assignment: {
    name: "Assignment Contract",
    title: "PURCHASE AND ASSIGNMENT AGREEMENT",
    sections: [
      { title: "PROPERTY INFORMATION", content: "Property Address: {{property_address}}\nCity: {{city}}, {{state}} {{zip_code}}" },
      { title: "ORIGINAL SELLER", content: "Original Seller: {{owner_name}}" },
      { title: "ASSIGNMENT TERMS", content: "The original buyer assigns all rights and obligations under the original purchase agreement to the end buyer." },
      { title: "ASSIGNMENT FEE", content: "Assignment Fee: [Amount]\nPayable at closing by the assignee." },
      { title: "PURCHASE PRICE", content: "Total Purchase Price: {{offer_price}}\n(Includes assignment fee to original buyer)" },
      { title: "CLOSING DATE", content: "Closing Date: {{closing_date}}" },
      { title: "REPRESENTATIONS", content: "Both parties represent that they have full authority to enter into this agreement and that all information provided is accurate." }
    ]
  }
};

export default function ContractGenerator({ lead, offer, owners, onContractCreated }) {
  const [template, setTemplate] = useState("standard");
  const [closingDate, setClosingDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const queryClient = useQueryClient();

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const replacePlaceholders = (text) => {
    return text
      .replace(/\{\{property_address\}\}/g, lead?.property_address || "")
      .replace(/\{\{city\}\}/g, lead?.city || "")
      .replace(/\{\{state\}\}/g, lead?.state || "")
      .replace(/\{\{zip_code\}\}/g, lead?.zip_code || "")
      .replace(/\{\{owner_name\}\}/g, owners?.[0]?.owner_name || "")
      .replace(/\{\{offer_price\}\}/g, formatCurrency(offer?.offer_price))
      .replace(/\{\{closing_date\}\}/g, closingDate || "TBD");
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const templateData = CONTRACT_TEMPLATES[template];
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Set fonts
      doc.setFont("helvetica");

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(templateData.title, 20, 20);

      // Subtitle with date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

      let yPosition = 45;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = 170;

      // Process sections
      const sections = templateData.sections;
      for (const section of sections) {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Section title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(section.title, margin, yPosition);
        yPosition += 8;

        // Section content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const replacedContent = replacePlaceholders(section.content);
        const splitContent = doc.splitTextToSize(replacedContent, maxWidth);
        doc.text(splitContent, margin, yPosition);
        yPosition += splitContent.length * 5 + 8;
      }

      // Add custom content if provided
      if (customContent) {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("ADDITIONAL TERMS", margin, yPosition);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const splitCustom = doc.splitTextToSize(customContent, maxWidth);
        doc.text(splitCustom, margin, yPosition);
        yPosition += splitCustom.length * 5 + 8;
      }

      // Signature block
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SIGNATURES", margin, yPosition);
      yPosition += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Seller: ____________________________     Date: __________", margin, yPosition);
      yPosition += 12;
      doc.text(replacePlaceholders("({{owner_name}})"), margin + 60, yPosition - 12);
      yPosition += 12;
      doc.text("Buyer: ____________________________     Date: __________", margin, yPosition);
      yPosition += 5;
      doc.text(`(${buyerName || "[Buyer Name]"})`, margin + 60, yPosition - 12);

      // Save PDF
      const pdfData = doc.output("arraybuffer");
      const fileName = `${lead.property_address.split(" ")[0]}_contract_${Date.now()}.pdf`;

      // Upload to Base44
      const file = new Blob([pdfData], { type: "application/pdf" });
      const fileInput = new File([file], fileName, { type: "application/pdf" });

      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: fileInput
      });

      // Save document record
      if (uploadResponse.file_url) {
        await base44.entities.Document.create({
          lead_id: lead.id,
          document_name: `${template === "standard" ? "Purchase Agreement" : "Assignment Contract"} - ${new Date().toLocaleDateString()}`,
          document_type: "Contract",
          file_url: uploadResponse.file_url,
          file_size: pdfData.byteLength,
          upload_date: new Date().toISOString(),
          notes: `Generated from ${CONTRACT_TEMPLATES[template].name}\nOffer Price: ${formatCurrency(offer?.offer_price)}\nClosing Date: ${closingDate}`
        });

        await queryClient.invalidateQueries({ queryKey: ["documents"] });
        setGenerated(true);

        // Trigger download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const owner = owners?.[0];

  return (
    <div className="space-y-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
      <div>
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Contract
        </h4>
      </div>

      {generated ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-900">Contract generated successfully!</p>
            <p className="text-sm text-emerald-700 mt-1">The PDF has been saved to your documents.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-700 text-sm">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="mt-1 h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TEMPLATES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 text-sm">Closing Date</Label>
              <Input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="mt-1 h-10 rounded-lg"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Buyer Name</Label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Enter buyer name"
              className="mt-1 h-10 rounded-lg"
            />
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Additional Terms (Optional)</Label>
            <Textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Add any custom terms or conditions..."
              rows={3}
              className="mt-1 rounded-lg text-sm"
            />
          </div>

          {/* Preview Card */}
          <Card className="bg-white p-3 border-slate-200">
            <div className="text-xs space-y-1.5 text-slate-600">
              <div><span className="font-medium">Property:</span> {lead.property_address}</div>
              <div><span className="font-medium">Seller:</span> {owner?.owner_name}</div>
              <div><span className="font-medium">Offer Price:</span> {formatCurrency(offer?.offer_price)}</div>
              <div><span className="font-medium">Closing Date:</span> {closingDate || "Not specified"}</div>
            </div>
          </Card>

          <Button
            onClick={generatePDF}
            disabled={isGenerating || !closingDate}
            className="w-full h-11 rounded-lg bg-slate-900 hover:bg-slate-800"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate & Download PDF
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}