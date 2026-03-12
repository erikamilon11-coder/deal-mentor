import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, RefreshCw, CheckCircle, Clock, FileSignature } from "lucide-react";
import { format } from "date-fns";

export default function ContractSignatureManager({ contract, owner }) {
  const [signerEmail, setSignerEmail] = useState(contract?.signer_email || owner?.email || "");
  const [signerName, setSignerName] = useState(contract?.signer_name || owner?.owner_name || "");
  const queryClient = useQueryClient();

  const sendForSignature = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendContractForSignature', {
        contractId: contract.id,
        signerEmail,
        signerName,
        documentUrl: contract.document_link,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  const checkStatus = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('checkSignatureStatus', {
        envelopeId: contract.docusign_envelope_id,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Update contract status based on DocuSign status
      const statusMap = {
        'sent': 'Sent',
        'delivered': 'Sent',
        'completed': 'Signed',
        'declined': 'Draft',
        'voided': 'Draft',
      };

      if (data.status) {
        base44.entities.Contract.update(contract.id, {
          docusign_status: data.status,
          status: statusMap[data.status] || contract.status,
          signed_date: data.completedDateTime || null,
        });
        queryClient.invalidateQueries({ queryKey: ["contracts"] });
      }
    },
  });

  const getStatusBadge = () => {
    const status = contract.docusign_status || contract.status;
    const badges = {
      'Draft': { color: 'bg-slate-100 text-slate-700', icon: FileSignature },
      'sent': { color: 'bg-blue-100 text-blue-700', icon: Send },
      'delivered': { color: 'bg-amber-100 text-amber-700', icon: Clock },
      'Sent': { color: 'bg-blue-100 text-blue-700', icon: Send },
      'completed': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'Signed': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    };

    const badgeConfig = badges[status] || badges['Draft'];
    const Icon = badgeConfig.icon;

    return (
      <Badge className={`${badgeConfig.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const canSend = contract.status === 'Draft' && !contract.docusign_envelope_id && signerEmail && signerName;
  const canCheck = contract.docusign_envelope_id && contract.status !== 'Signed';

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileSignature className="w-4 h-4" />
          E-Signature
        </h4>
        {getStatusBadge()}
      </div>

      {contract.status === 'Draft' && !contract.docusign_envelope_id && (
        <div className="space-y-3">
          <div>
            <Label className="text-slate-700">Signer Name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="John Doe"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-slate-700">Signer Email</Label>
            <Input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="john@example.com"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>

          <Button
            onClick={() => sendForSignature.mutate()}
            disabled={!canSend || sendForSignature.isPending}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {sendForSignature.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send for E-Signature
              </>
            )}
          </Button>

          {sendForSignature.isError && (
            <p className="text-sm text-red-600">
              Error: {sendForSignature.error?.message || 'Failed to send contract'}
            </p>
          )}
        </div>
      )}

      {contract.docusign_envelope_id && (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Envelope ID</span>
              <span className="font-mono text-xs">{contract.docusign_envelope_id.slice(0, 16)}...</span>
            </div>
            {contract.signer_email && (
              <div className="flex justify-between">
                <span className="text-slate-500">Sent to</span>
                <span>{contract.signer_email}</span>
              </div>
            )}
            {contract.sent_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Sent on</span>
                <span>{format(new Date(contract.sent_date), "MMM d, yyyy h:mm a")}</span>
              </div>
            )}
            {contract.signed_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Signed on</span>
                <span className="text-green-600 font-medium">
                  {format(new Date(contract.signed_date), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            )}
          </div>

          {canCheck && (
            <Button
              onClick={() => checkStatus.mutate()}
              disabled={checkStatus.isPending}
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              {checkStatus.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Signature Status
                </>
              )}
            </Button>
          )}

          {checkStatus.isError && (
            <p className="text-sm text-red-600">
              Error: {checkStatus.error?.message || 'Failed to check status'}
            </p>
          )}
        </div>
      )}

      {contract.status === 'Signed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-medium text-green-900">Contract Fully Executed</p>
          <p className="text-sm text-green-700 mt-1">
            Signed on {contract.signed_date ? format(new Date(contract.signed_date), "MMM d, yyyy") : "N/A"}
          </p>
        </div>
      )}
    </div>
  );
}