import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Loader2, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ContractGenerator({ lead, offer, owners, onContractCreated }) {
  const [closingDate, setClosingDate] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [additionalTerms, setAdditionalTerms] = useState("");

  const queryClient = useQueryClient();

  const primaryOwner = owners?.[0];
  const purchasePrice = offer?.offer_price || offer?.maximum_allowable_offer || 0;

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const generateContractHTML = () => {
    const today = format(new Date(), "MMMM d, yyyy");
    const formattedClosing = format(new Date(closingDate), "MMMM d, yyyy");
    const formattedPrice = formatCurrency(purchasePrice);
    const earnestMoney = formatCurrency(Math.min(purchasePrice * 0.01, 1000));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Agreement - ${lead.property_address}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
    h2 { font-size: 16px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .header-info { text-align: center; margin-bottom: 30px; }
    .parties { margin: 20px 0; }
    .party-block { margin: 15px 0; padding: 15px; background: #f9f9f9; border-left: 3px solid #333; }
    .section { margin: 20px 0; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .field-value { text-decoration: underline; padding: 0 5px; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-line { width: 45%; }
    .signature-line hr { border: none; border-top: 1px solid #333; margin-top: 50px; }
    .signature-label { font-size: 12px; margin-top: 5px; }
    .terms-list { margin-left: 20px; }
    .terms-list li { margin: 10px 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <h1>Real Estate Purchase Agreement</h1>
  
  <div class="header-info">
    <p><strong>Date:</strong> ${today}</p>
    <p><strong>Contract Reference:</strong> ${lead.id?.slice(0, 8).toUpperCase() || "DRAFT"}</p>
  </div>

  <div class="parties">
    <h2>Parties</h2>
    
    <div class="party-block">
      <p><span class="field-label">SELLER:</span></p>
      <p class="field-value">${primaryOwner?.owner_name || "[SELLER NAME]"}</p>
      <p><span class="field-label">Address:</span> <span class="field-value">${primaryOwner?.mailing_address || "[SELLER ADDRESS]"}</span></p>
    </div>
    
    <div class="party-block">
      <p><span class="field-label">BUYER:</span></p>
      <p class="field-value">[BUYER NAME AND/OR ASSIGNS]</p>
    </div>
  </div>

  <div class="section">
    <h2>Property Description</h2>
    <p><span class="field-label">Property Address:</span></p>
    <p class="field-value">${lead.property_address}</p>
    <p class="field-value">${lead.city}, ${lead.state} ${lead.zip_code}</p>
    <p style="margin-top: 15px;">Together with all improvements, fixtures, and appurtenances thereto.</p>
  </div>

  <div class="section">
    <h2>Purchase Price and Terms</h2>
    <div class="field">
      <p><span class="field-label">Purchase Price:</span> <span class="field-value">${formattedPrice}</span></p>
    </div>
    <div class="field">
      <p><span class="field-label">Earnest Money Deposit:</span> <span class="field-value">${earnestMoney}</span></p>
      <p style="font-size: 14px; color: #666;">(To be deposited with Title Company within 3 business days of executed contract)</p>
    </div>
    <div class="field">
      <p><span class="field-label">Balance Due at Closing:</span> <span class="field-value">${formatCurrency(purchasePrice - Math.min(purchasePrice * 0.01, 1000))}</span></p>
    </div>
  </div>

  <div class="section">
    <h2>Closing</h2>
    <p><span class="field-label">Closing Date:</span> <span class="field-value">${formattedClosing}</span></p>
    <p>Or sooner by mutual agreement of both parties.</p>
    <p><span class="field-label">Title Company:</span> <span class="field-value">[TO BE DETERMINED]</span></p>
  </div>

  <div class="section">
    <h2>Terms and Conditions</h2>
    <ol class="terms-list">
      <li><strong>Assignment:</strong> Buyer shall have the right to assign this contract to a third party without Seller's consent. Upon assignment, Buyer shall be released from all obligations hereunder.</li>
      <li><strong>Inspection Period:</strong> Buyer shall have fourteen (14) days from the effective date of this contract to conduct inspections. Buyer may terminate this contract for any reason during the inspection period.</li>
      <li><strong>Title:</strong> Seller agrees to convey marketable title by General Warranty Deed, free and clear of all liens and encumbrances except current taxes and recorded easements.</li>
      <li><strong>Possession:</strong> Seller shall deliver possession of the property to Buyer at closing.</li>
      <li><strong>Property Condition:</strong> Property is being sold "AS-IS, WHERE-IS" with no warranties expressed or implied.</li>
      <li><strong>Closing Costs:</strong> Each party shall pay their customary closing costs. Seller to pay for title insurance policy.</li>
      <li><strong>Default:</strong> If Buyer defaults, Seller's sole remedy shall be retention of earnest money as liquidated damages. If Seller defaults, Buyer may seek specific performance or return of earnest money.</li>
    </ol>
  </div>

  ${additionalTerms ? `
  <div class="section">
    <h2>Additional Terms</h2>
    <p>${additionalTerms.replace(/\n/g, "<br>")}</p>
  </div>
  ` : ""}

  <div class="section">
    <h2>Acceptance</h2>
    <p>This offer shall remain open for acceptance until <span class="field-value">${format(addDays(new Date(), 3), "MMMM d, yyyy")}</span> at 5:00 PM local time, after which it shall be null and void.</p>
  </div>

  <div class="signature-block">
    <div class="signature-line">
      <hr />
      <p class="signature-label">SELLER Signature</p>
      <p class="signature-label">${primaryOwner?.owner_name || "[SELLER NAME]"}</p>
      <p class="signature-label">Date: _____________</p>
    </div>
    <div class="signature-line">
      <hr />
      <p class="signature-label">BUYER Signature</p>
      <p class="signature-label">[BUYER NAME]</p>
      <p class="signature-label">Date: _____________</p>
    </div>
  </div>

  <div class="footer">
    <p>This document was generated as a DRAFT for review purposes only.</p>
    <p>Please consult with a licensed attorney before signing any legal documents.</p>
  </div>
</body>
</html>
    `;
  };

  const handleGenerateContract = async () => {
    setIsGenerating(true);

    const htmlContent = generateContractHTML();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const file = new File([blob], `contract-${lead.property_address.replace(/\s+/g, "-")}.html`, {
      type: "text/html",
    });

    // Upload the file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Create contract record
    const contract = await base44.entities.Contract.create({
      lead_id: lead.id,
      purchase_price: purchasePrice,
      closing_date: closingDate,
      status: "Draft",
      document_link: file_url,
    });

    queryClient.invalidateQueries({ queryKey: ["contracts", lead.id] });
    setIsGenerating(false);

    // Trigger download
    const link = document.createElement("a");
    link.href = file_url;
    link.download = `contract-${lead.property_address.replace(/\s+/g, "-")}.html`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onContractCreated) onContractCreated(contract);
  };

  return (
    <div className="space-y-5 pt-6 border-t border-slate-200 mt-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Generate Contract</h3>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Property</span>
            <p className="font-medium truncate">{lead.property_address}</p>
          </div>
          <div>
            <span className="text-slate-500">Seller</span>
            <p className="font-medium">{primaryOwner?.owner_name || "Not added"}</p>
          </div>
          <div>
            <span className="text-slate-500">Purchase Price</span>
            <p className="font-medium">{formatCurrency(purchasePrice)}</p>
          </div>
          <div>
            <span className="text-slate-500">Location</span>
            <p className="font-medium">{lead.city}, {lead.state}</p>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-slate-700">Closing Date</Label>
        <div className="relative mt-1.5">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-700">Additional Terms (Optional)</Label>
        <Textarea
          value={additionalTerms}
          onChange={(e) => setAdditionalTerms(e.target.value)}
          className="mt-1.5 rounded-xl min-h-[80px]"
          placeholder="Add any special terms or conditions..."
        />
      </div>

      <Button
        onClick={handleGenerateContract}
        disabled={!purchasePrice || isGenerating}
        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Generate & Download Contract
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        This generates a draft HTML document. Please review with an attorney before use.
      </p>
    </div>
  );
}