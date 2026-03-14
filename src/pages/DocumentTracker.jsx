import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  Send, 
  AlertCircle,
  Eye,
  Calendar,
  User,
  ArrowLeft
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  "Draft": {
    icon: FileText,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    badgeColor: "bg-slate-200 text-slate-800",
  },
  "Sent": {
    icon: Send,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    badgeColor: "bg-blue-200 text-blue-800",
  },
  "Signed": {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    badgeColor: "bg-green-200 text-green-800",
  },
};

export default function DocumentTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-updated_date"),
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const getLeadInfo = (leadId) => {
    return leads?.find((l) => l.id === leadId);
  };

  const allContracts = contracts || [];
  const sentContracts = allContracts.filter((c) => c.status === "Sent");
  const signedContracts = allContracts.filter((c) => c.status === "Signed");
  const draftContracts = allContracts.filter((c) => c.status === "Draft");

  // Pending signatures - sent but not signed
  const pendingSignatures = sentContracts.filter((c) => !c.signed_date);

  // Calculate stats
  const totalSent = sentContracts.length;
  const totalSigned = signedContracts.length;
  const signatureRate = totalSent > 0 ? ((totalSigned / totalSent) * 100).toFixed(0) : 0;
  const avgTimeToSign = signedContracts.length > 0
    ? signedContracts
        .filter((c) => c.sent_date && c.signed_date)
        .reduce((sum, c) => {
          const sent = new Date(c.sent_date);
          const signed = new Date(c.signed_date);
          return sum + (signed - sent);
        }, 0) / signedContracts.length / (1000 * 60 * 60 * 24)
    : 0;

  const renderContractCard = (contract) => {
    const lead = getLeadInfo(contract.lead_id);
    const config = statusConfig[contract.status] || statusConfig["Draft"];
    const Icon = config.icon;

    const daysSinceSent = contract.sent_date
      ? Math.floor((new Date() - new Date(contract.sent_date)) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Card
        key={contract.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          if (lead) {
            navigate(createPageUrl("LeadDetail") + `?id=${lead.id}`);
          }
        }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${config.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4" />
                </div>
                <Badge className={config.badgeColor}>{contract.status}</Badge>
                {contract.status === "Sent" && daysSinceSent > 3 && (
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {daysSinceSent}d pending
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                {lead?.property_address || "Unknown Property"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lead?.city}, {lead?.state}
              </p>
            </div>
            {contract.purchase_price && (
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${contract.purchase_price.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Purchase Price</p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            {contract.signer_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  {contract.signer_name}
                </span>
                {contract.signer_email && (
                  <span className="text-slate-400 text-xs">({contract.signer_email})</span>
                )}
              </div>
            )}

            {contract.sent_date && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  Sent {format(new Date(contract.sent_date), "MMM d, yyyy")}
                </span>
                <span className="text-slate-400 text-xs">
                  ({formatDistanceToNow(new Date(contract.sent_date), { addSuffix: true })})
                </span>
              </div>
            )}

            {contract.signed_date && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Signed {format(new Date(contract.signed_date), "MMM d, yyyy")}
                </span>
              </div>
            )}

            {contract.closing_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  Closing: {format(new Date(contract.closing_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {contract.document_link && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(contract.document_link, "_blank");
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Settings"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Document Tracker
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Monitor contract status and track signatures in real-time
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Sent</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {totalSent}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                  <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Signed</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {totalSigned}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {pendingSignatures.length}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Sign Time</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {avgTimeToSign.toFixed(1)}d
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {signatureRate}% signed
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Alerts */}
        {pendingSignatures.length > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-5 h-5" />
                Pending Signatures ({pendingSignatures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingSignatures.slice(0, 3).map((contract) => {
                  const lead = getLeadInfo(contract.lead_id);
                  const daysSinceSent = Math.floor(
                    (new Date() - new Date(contract.sent_date)) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => {
                        if (lead) {
                          navigate(createPageUrl("LeadDetail") + `?id=${lead.id}`);
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {lead?.property_address}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sent to {contract.signer_name} • {daysSinceSent} days ago
                        </p>
                      </div>
                      <Badge className="bg-amber-200 text-amber-800">Follow Up</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 mb-6">
            <TabsTrigger value="all">
              All ({allContracts.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentContracts.length})
            </TabsTrigger>
            <TabsTrigger value="signed">
              Signed ({signedContracts.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Draft ({draftContracts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContracts.length > 0 ? (
                allContracts.map(renderContractCard)
              ) : (
                <div className="col-span-full text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-slate-500 dark:text-slate-400">No contracts found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentContracts.length > 0 ? (
                sentContracts.map(renderContractCard)
              ) : (
                <div className="col-span-full text-center py-12">
                  <Send className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-slate-500 dark:text-slate-400">No sent contracts</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="signed" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signedContracts.length > 0 ? (
                signedContracts.map(renderContractCard)
              ) : (
                <div className="col-span-full text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-slate-500 dark:text-slate-400">No signed contracts</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="draft" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftContracts.length > 0 ? (
                draftContracts.map(renderContractCard)
              ) : (
                <div className="col-span-full text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-slate-500 dark:text-slate-400">No draft contracts</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}