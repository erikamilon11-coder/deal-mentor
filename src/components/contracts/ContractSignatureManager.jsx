import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ContractSignatureManager({ contract, lead, onSignatureComplete }) {
  const queryClient = useQueryClient();
  const [checkingStatus, setCheckingStatus] = useState(false);

  const sendForSignatureMutation = useMutation({
    mutationFn: async () => {
      // In real implementation, generate PDF first, then send via DocuSign
      const response = await base44.functions.invoke("sendContractForSignature", {
        contract_id: contract.id,
        signer_email: contract.signer_email,
        signer_name: contract.signer_name,
        pdf_url: contract.document_link, // Should be a valid PDF URL
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Contract sent for signature!");
      queryClient.invalidateQueries({ queryKey: ["contracts", contract.id] });
    },
    onError: () => toast.error("Failed to send contract for signature"),
  });

  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("checkSignatureStatus", {
        contract_id: contract.id,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Status: ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["contracts", contract.id] });
      
      if (data.status === "completed" && onSignatureComplete) {
        onSignatureComplete();
      }
    },
    onError: () => toast.error("Failed to check signature status"),
  });

  const getStatusBadge = () => {
    switch (contract.docusign_status) {
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">Awaiting Signature</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Signed</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
      default:
        return <Badge variant="outline">{contract.docusign_status || "Draft"}</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (contract.docusign_status) {
      case "sent":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "declined":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Signature Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-2">Current Status</p>
          {getStatusBadge()}
        </div>

        {contract.signer_email && (
          <div>
            <p className="text-sm text-slate-600">Signer</p>
            <p className="font-medium text-slate-900">{contract.signer_name || "Unknown"}</p>
            <p className="text-sm text-slate-500">{contract.signer_email}</p>
          </div>
        )}

        {contract.sent_date && (
          <div>
            <p className="text-sm text-slate-600">Sent Date</p>
            <p className="font-medium text-slate-900">
              {new Date(contract.sent_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {contract.signed_date && (
          <div>
            <p className="text-sm text-slate-600">Signed Date</p>
            <p className="font-medium text-slate-900 text-green-600">
              {new Date(contract.signed_date).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {!contract.docusign_envelope_id && contract.status === "Draft" && (
            <Button
              onClick={() => sendForSignatureMutation.mutate()}
              disabled={sendForSignatureMutation.isPending || !contract.signer_email}
              className="flex-1 gap-2"
            >
              <Mail className="w-4 h-4" />
              Send for Signature
            </Button>
          )}

          {contract.docusign_envelope_id && contract.docusign_status !== "completed" && (
            <Button
              variant="outline"
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}