import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export default function PurchaseOfferGenerator({
  leadId,
  lead,
  owner,
  offer,
  propertyData,
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    offer_price: offer?.offer_price || "",
    assignment_fee: offer?.assignment_fee_target || "",
    estimated_repairs: offer?.estimated_repairs || "",
    closing_date: "",
  });
  const [signerEmail, setSignerEmail] = useState(owner?.email || "");
  const [generatedContract, setGeneratedContract] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("generatePurchaseOfferContract", {
        lead_id: leadId,
        offer_price: parseFloat(formData.offer_price),
        assignment_fee: formData.assignment_fee ? parseFloat(formData.assignment_fee) : null,
        estimated_repairs: formData.estimated_repairs ? parseFloat(formData.estimated_repairs) : null,
        closing_date: formData.closing_date || null,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedContract(data);
      toast.success("Contract draft ready. Next step: verify numbers and send for signature.");
      setShowForm(false);
    },
    onError: (error) => toast.error(error.message || "Failed to generate contract"),
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signerEmail) {
        throw new Error("Please enter signer email address");
      }
      const response = await base44.functions.invoke("sendContractForSignature", {
        lead_id: leadId,
        contract_id: generatedContract.contract_id,
        signer_email: signerEmail,
        signer_name: owner?.owner_name || "Seller",
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Contract sent for signature!");
      setGeneratedContract({ ...generatedContract, ...data });
      queryClient.invalidateQueries({ queryKey: ["contracts", leadId] });
    },
    onError: (error) => toast.error(error.message || "Failed to send contract"),
  });

  const handleDownloadPDF = () => {
    if (generatedContract?.pdf_data) {
      const link = document.createElement("a");
      link.href = generatedContract.pdf_data;
      link.download = generatedContract.filename;
      link.click();
      toast.success("PDF downloaded!");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateContract = () => {
    const purchasePrice = Number(formData.offer_price);
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      toast.error("Purchase price must be a valid number before generating a contract.");
      return;
    }

    generateMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Contract Generation Form */}
      {!generatedContract ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Stage 5 — Generate Purchase Offer
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Confirm seller details and pricing, then generate a clean purchase agreement for {lead?.property_address}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="w-full gap-2"
              >
                <FileText className="w-4 h-4" />
                Create Contract
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Purchase Price *</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        name="offer_price"
                        placeholder="0"
                        value={formData.offer_price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assignment Fee</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        name="assignment_fee"
                        placeholder="0"
                        value={formData.assignment_fee}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Estimated Repairs</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        name="estimated_repairs"
                        placeholder="0"
                        value={formData.estimated_repairs}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Closing Date</Label>
                    <Input
                      type="date"
                      name="closing_date"
                      value={formData.closing_date}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateContract}
                    disabled={!formData.offer_price || generateMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Generate Contract
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Generated Contract Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Contract Generated
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-2">
                    {generatedContract.filename}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Draft
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Purchase Price:</span>
                  <span className="font-semibold">
                    ${formData.offer_price ? parseFloat(formData.offer_price).toLocaleString() : 0}
                  </span>
                </div>
                {formData.assignment_fee && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Assignment Fee:</span>
                    <span className="font-semibold">
                      ${parseFloat(formData.assignment_fee).toLocaleString()}
                    </span>
                  </div>
                )}
                {formData.estimated_repairs && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Estimated Repairs:</span>
                    <span className="font-semibold">
                      ${parseFloat(formData.estimated_repairs).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>
                    $
                    {(
                      parseFloat(formData.offer_price || 0) +
                      parseFloat(formData.assignment_fee || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          {/* E-Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send for Signature
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                Send the contract to {owner?.owner_name || "seller"} for electronic signature
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Signer Email *</Label>
                <Input
                  type="email"
                  placeholder="seller@example.com"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-blue-900">
                  Before sending: verify property address, seller name, purchase price, and closing date. Then send for e-signature.
                </p>
              </div>

              <Button
                onClick={() => sendForSignatureMutation.mutate()}
                disabled={
                  !signerEmail ||
                  sendForSignatureMutation.isPending ||
                  generatedContract?.docusign_status === "Signed"
                }
                className="w-full gap-2"
              >
                {sendForSignatureMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Contract for Signature
                  </>
                )}
              </Button>

              {generatedContract?.docusign_status && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    generatedContract.docusign_status === "Signed"
                      ? "bg-green-50 text-green-900 border border-green-200"
                      : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                >
                  <p className="font-medium">Status: {generatedContract.docusign_status}</p>
                  {generatedContract.docusign_envelope_id && (
                    <p className="text-xs mt-1">
                      Envelope ID: {generatedContract.docusign_envelope_id}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate New Contract */}
          <Button
            onClick={() => {
              setGeneratedContract(null);
              setShowForm(false);
              setFormData({
                offer_price: "",
                assignment_fee: "",
                estimated_repairs: "",
                closing_date: "",
              });
            }}
            variant="outline"
            className="w-full"
          >
            Generate New Contract
          </Button>
        </>
      )}
    </div>
  );
}
