import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Clock, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SignatureTracker({ lead }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", lead?.id],
    queryFn: () => lead?.id ? base44.entities.Contract.filter({ lead_id: lead.id }) : Promise.resolve([]),
    enabled: !!lead?.id,
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (contractId) => {
      const response = await base44.functions.invoke("checkSignatureStatus", { contract_id: contractId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", lead?.id] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const handleRefreshStatus = async (contractId) => {
    setRefreshing(true);
    try {
      await checkStatusMutation.mutateAsync(contractId);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (contract) => {
    if (contract.signed_date) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Signed
        </Badge>
      );
    }
    if (contract.sent_date) {
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <FileText className="w-3 h-3 mr-1" />
        Draft
      </Badge>
    );
  };

  const pendingContracts = contracts.filter(c => c.sent_date && !c.signed_date);

  if (contracts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5" />
          Document Signatures
          {pendingContracts.length > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-800">
              {pendingContracts.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
          >
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {contract.purchase_price
                  ? `Agreement - $${contract.purchase_price.toLocaleString()}`
                  : "Contract"}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                To: {contract.signer_name || contract.signer_email}
              </p>
              {contract.sent_date && (
                <p className="text-xs text-slate-500 mt-1">
                  Sent {format(new Date(contract.sent_date), "MMM d, yyyy")}
                  {contract.signed_date && ` • Signed ${format(new Date(contract.signed_date), "MMM d")}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(contract)}
              {contract.sent_date && !contract.signed_date && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRefreshStatus(contract.id)}
                  disabled={refreshing || checkStatusMutation.isPending}
                >
                  {refreshing || checkStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}