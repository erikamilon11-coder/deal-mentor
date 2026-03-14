import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Download, Send } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";
import SignatureTracker from "./SignatureTracker";

const documentTemplates = {
  "purchase_agreement": {
    title: "Purchase and Sale Agreement",
    description: "Standard real estate purchase contract",
    fields: ["purchase_price", "closing_date", "earnest_money", "inspection_period"],
  },
  "assignment_contract": {
    title: "Assignment of Contract",
    description: "Contract assignment for wholesaling",
    fields: ["purchase_price", "assignment_fee", "closing_date"],
  },
  "seller_disclosure": {
    title: "Seller Property Disclosure",
    description: "Property condition disclosure form",
    fields: ["property_condition", "known_issues", "repairs_needed"],
  },
  "lead_based_paint": {
    title: "Lead-Based Paint Disclosure",
    description: "Required for pre-1978 properties",
    fields: ["year_built", "lead_paint_present", "reports_available"],
  },
};

export default function DocumentTemplateGenerator({ lead, owner, onDocumentGenerated }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [documentData, setDocumentData] = useState({
    purchase_price: "",
    closing_date: "",
    earnest_money: "1000",
    inspection_period: "10",
    assignment_fee: "",
    property_condition: "",
    known_issues: "",
    repairs_needed: "",
    year_built: "",
    lead_paint_present: "Unknown",
    reports_available: "No",
  });
  const [signerEmail, setSignerEmail] = useState(owner?.email || "");
  const [signerName, setSignerName] = useState(owner?.owner_name || "");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: propertyData } = useQuery({
    queryKey: ["propertyData", lead.id],
    queryFn: () => base44.entities.PropertyData.filter({ lead_id: lead.id }),
    enabled: !!lead.id,
  });

  const createContractMutation = useMutation({
    mutationFn: (contractData) => base44.entities.Contract.create(contractData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (onDocumentGenerated) onDocumentGenerated();
    },
  });

  const handleFieldChange = (field, value) => {
    setDocumentData(prev => ({ ...prev, [field]: value }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const template = documentTemplates[selectedTemplate];
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(template.title, pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 20;

    // Property Information Section
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Property Information", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    const propertyInfo = [
      `Address: ${lead.property_address}`,
      `City: ${lead.city || "N/A"}`,
      `State: ${lead.state || "N/A"}`,
      `ZIP Code: ${lead.zip_code || "N/A"}`,
    ];
    
    propertyInfo.forEach(info => {
      doc.text(info, 20, yPosition);
      yPosition += 7;
    });

    yPosition += 10;

    // Seller Information
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Seller Information", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Name: ${owner?.owner_name || "N/A"}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Mailing Address: ${owner?.mailing_address || "N/A"}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Entity Type: ${owner?.entity_type || "N/A"}`, 20, yPosition);
    yPosition += 15;

    // Document-Specific Fields
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Agreement Terms", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");

    if (selectedTemplate === "purchase_agreement") {
      doc.text(`Purchase Price: $${documentData.purchase_price || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Earnest Money Deposit: $${documentData.earnest_money || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Closing Date: ${documentData.closing_date || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Inspection Period: ${documentData.inspection_period || "___________"} days`, 20, yPosition);
      yPosition += 15;

      // Standard clauses
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Standard Terms and Conditions", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const clauses = [
        "1. The Buyer agrees to purchase the property in 'AS-IS' condition.",
        "2. The Seller warrants they have clear title to the property.",
        "3. The Buyer has the right to conduct inspections during the inspection period.",
        "4. All fixtures and appliances remain with the property unless otherwise stated.",
        "5. This agreement is contingent upon Buyer's ability to obtain financing.",
      ];

      clauses.forEach(clause => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        const lines = doc.splitTextToSize(clause, pageWidth - 40);
        doc.text(lines, 20, yPosition);
        yPosition += (lines.length * 5) + 3;
      });
    } else if (selectedTemplate === "assignment_contract") {
      doc.text(`Original Purchase Price: $${documentData.purchase_price || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Assignment Fee: $${documentData.assignment_fee || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Closing Date: ${documentData.closing_date || "___________"}`, 20, yPosition);
      yPosition += 15;

      doc.text("The undersigned Assignor hereby assigns all rights, title, and interest", 20, yPosition);
      yPosition += 7;
      doc.text("in the Purchase Agreement to the Assignee for the assignment fee stated above.", 20, yPosition);
    } else if (selectedTemplate === "seller_disclosure") {
      doc.text(`Property Condition: ${documentData.property_condition || "___________"}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Known Issues:`, 20, yPosition);
      yPosition += 7;
      const issuesLines = doc.splitTextToSize(documentData.known_issues || "None disclosed", pageWidth - 40);
      doc.text(issuesLines, 20, yPosition);
      yPosition += (issuesLines.length * 5) + 10;
      doc.text(`Repairs Needed:`, 20, yPosition);
      yPosition += 7;
      const repairsLines = doc.splitTextToSize(documentData.repairs_needed || "None disclosed", pageWidth - 40);
      doc.text(repairsLines, 20, yPosition);
    } else if (selectedTemplate === "lead_based_paint") {
      doc.text(`Year Built: ${documentData.year_built || propertyData?.[0]?.year_built || "___________"}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Lead-Based Paint Present: ${documentData.lead_paint_present}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Reports Available: ${documentData.reports_available}`, 20, yPosition);
      yPosition += 15;

      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      const disclaimer = "Sellers must disclose known information on lead-based paint and lead-based paint hazards before selling pre-1978 housing.";
      const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 40);
      doc.text(disclaimerLines, 20, yPosition);
    }

    // Signature Section
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    } else {
      yPosition += 30;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Signatures", 20, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text("Seller: ____________________________", 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ____________________________`, 20, yPosition);
    yPosition += 15;
    doc.text("Buyer: ____________________________", 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ____________________________`, 20, yPosition);

    return doc;
  };

  const handleDownload = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = generatePDF();
      const filename = `${documentTemplates[selectedTemplate].title.replace(/\s+/g, "_")}_${lead.property_address.replace(/\s+/g, "_")}.pdf`;
      doc.save(filename);
      toast.success("Document downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendForSignature = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    if (!signerEmail || !signerName) {
      toast.error("Please enter signer name and email");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output("blob");
      
      // Upload PDF to get URL
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: pdfBlob });
      
      // Create contract record with sent status
      await createContractMutation.mutateAsync({
        lead_id: lead.id,
        purchase_price: parseFloat(documentData.purchase_price) || null,
        closing_date: documentData.closing_date || null,
        status: "Sent",
        document_link: uploadResponse.file_url,
        signer_email: signerEmail,
        signer_name: signerName,
        sent_date: new Date().toISOString(),
      });

      // Send contract via email
      const signatureResponse = await base44.functions.invoke("sendContractForSignature", {
        lead_id: lead.id,
        signer_email: signerEmail,
        signer_name: signerName,
        document_url: uploadResponse.file_url,
        document_title: documentTemplates[selectedTemplate].title,
      });

      if (signatureResponse.data.success) {
        toast.success("Contract sent for signature!");
        setSelectedTemplate("");
        setSignerEmail("");
        setSignerName("");
      } else {
        toast.error("Failed to send contract");
      }
    } catch (error) {
      toast.error("Failed to send document");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const template = selectedTemplate ? documentTemplates[selectedTemplate] : null;

  return (
    <div className="space-y-6">
      <SignatureTracker lead={lead} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Template Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="md:block">
                <SelectValue placeholder="Choose a document template" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(documentTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {template && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {template.description}
              </p>
            )}
          </div>

          {template && (
            <>
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Document Fields
                </h4>

                {template.fields.includes("purchase_price") && (
                  <div>
                    <Label>Purchase Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="Enter purchase price"
                      value={documentData.purchase_price}
                      onChange={(e) => handleFieldChange("purchase_price", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("assignment_fee") && (
                  <div>
                    <Label>Assignment Fee ($)</Label>
                    <Input
                      type="number"
                      placeholder="Enter assignment fee"
                      value={documentData.assignment_fee}
                      onChange={(e) => handleFieldChange("assignment_fee", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("closing_date") && (
                  <div>
                    <Label>Closing Date</Label>
                    <Input
                      type="date"
                      value={documentData.closing_date}
                      onChange={(e) => handleFieldChange("closing_date", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("earnest_money") && (
                  <div>
                    <Label>Earnest Money Deposit ($)</Label>
                    <Input
                      type="number"
                      placeholder="Enter earnest money amount"
                      value={documentData.earnest_money}
                      onChange={(e) => handleFieldChange("earnest_money", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("inspection_period") && (
                  <div>
                    <Label>Inspection Period (Days)</Label>
                    <Input
                      type="number"
                      placeholder="Enter number of days"
                      value={documentData.inspection_period}
                      onChange={(e) => handleFieldChange("inspection_period", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("property_condition") && (
                  <div>
                    <Label>Property Condition</Label>
                    <Select
                      value={documentData.property_condition}
                      onValueChange={(value) => handleFieldChange("property_condition", value)}
                    >
                      <SelectTrigger className="md:block">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {template.fields.includes("known_issues") && (
                  <div>
                    <Label>Known Issues</Label>
                    <Textarea
                      placeholder="Describe any known issues"
                      value={documentData.known_issues}
                      onChange={(e) => handleFieldChange("known_issues", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {template.fields.includes("repairs_needed") && (
                  <div>
                    <Label>Repairs Needed</Label>
                    <Textarea
                      placeholder="Describe repairs needed"
                      value={documentData.repairs_needed}
                      onChange={(e) => handleFieldChange("repairs_needed", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {template.fields.includes("year_built") && (
                  <div>
                    <Label>Year Built</Label>
                    <Input
                      type="number"
                      placeholder="Enter year built"
                      value={documentData.year_built || propertyData?.[0]?.year_built || ""}
                      onChange={(e) => handleFieldChange("year_built", e.target.value)}
                    />
                  </div>
                )}

                {template.fields.includes("lead_paint_present") && (
                  <div>
                    <Label>Lead-Based Paint Present</Label>
                    <Select
                      value={documentData.lead_paint_present}
                      onValueChange={(value) => handleFieldChange("lead_paint_present", value)}
                    >
                      <SelectTrigger className="md:block">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {template.fields.includes("reports_available") && (
                  <div>
                    <Label>Reports Available</Label>
                    <Select
                      value={documentData.reports_available}
                      onValueChange={(value) => handleFieldChange("reports_available", value)}
                    >
                      <SelectTrigger className="md:block">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Send for Signature
                </h4>
                <div>
                  <Label>Signer Name</Label>
                  <Input
                    placeholder="Enter signer name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Signer Email</Label>
                  <Input
                    type="email"
                    placeholder="Enter signer email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
                <Button
                  onClick={handleSendForSignature}
                  disabled={isGenerating || !signerEmail || !signerName}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send for Signature
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}