import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, FileSignature, Calendar, Home } from "lucide-react";
import { format } from "date-fns";

export default function SignContract() {
  const urlParams = new URLSearchParams(window.location.search);
  const contractId = urlParams.get("id");
  const navigate = useNavigate();

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => base44.entities.Contract.filter({ id: contractId }).then(r => r[0]),
    enabled: !!contractId,
  });

  const { data: lead } = useQuery({
    queryKey: ["lead", contract?.lead_id],
    queryFn: () => base44.entities.Lead.filter({ id: contract.lead_id }).then(r => r[0]),
    enabled: !!contract?.lead_id,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    const ctx = canvas.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    setIsSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL("image/png");

      // Submit signature via backend function
      const response = await base44.functions.invoke("submitSignature", {
        contractId: contract.id,
        leadId: contract.lead_id,
        signatureData,
        signerName: signature,
      });

      if (response.data.success) {
        // Show success and redirect
        setTimeout(() => {
          window.location.href = "/success";
        }, 2000);
      }
    } catch (error) {
      console.error("Signature submission failed:", error);
      alert("Failed to submit signature. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Contract not found</p>
        </div>
      </div>
    );
  }

  if (contract.status === "Signed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Contract Already Signed</h1>
          <p className="text-slate-600">
            This contract was signed on {contract.signed_date ? format(new Date(contract.signed_date), "MMMM d, yyyy") : "N/A"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <FileSignature className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sign Contract</h1>
              <p className="text-sm text-slate-500">Review and sign your purchase agreement</p>
            </div>
          </div>

          {lead && (
            <div className="bg-slate-50 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{lead.property_address}</p>
                  <p className="text-sm text-slate-600">{lead.city}, {lead.state} {lead.zip_code}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contract Details */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Contract Information</h2>
          <div className="space-y-3 text-sm">
            {contract.purchase_price && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Purchase Price</span>
                <span className="font-semibold text-slate-900">
                  ${contract.purchase_price.toLocaleString()}
                </span>
              </div>
            )}
            {contract.closing_date && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Closing Date</span>
                <span className="font-semibold text-slate-900">
                  {format(new Date(contract.closing_date), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {contract.document_link && (
              <div className="pt-2">
                <a
                  href={contract.document_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  📄 View Full Contract Document
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="font-semibold text-slate-900 mb-4">Your Signature</h2>

          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter your full legal name"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>

            <div>
              <Label className="mb-2 block">Draw Your Signature</Label>
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full touch-none cursor-crosshair"
                  style={{ maxHeight: "200px" }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="mt-2"
              >
                Clear Signature
              </Button>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <label htmlFor="agree" className="text-sm text-slate-600 leading-relaxed">
                I hereby acknowledge that I have read, understood, and agree to the terms and conditions
                outlined in this contract. My electronic signature below has the same legal effect as a
                handwritten signature.
              </label>
            </div>

            <Button
              onClick={submitSignature}
              disabled={!signature || !agreed || isSigning}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-lg font-semibold"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Signature...
                </>
              ) : (
                <>
                  <FileSignature className="w-5 h-5 mr-2" />
                  Sign Contract
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Secured by SSL encryption • All signatures are legally binding
        </p>
      </div>
    </div>
  );
}