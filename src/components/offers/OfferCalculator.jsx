import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, Save, TrendingDown, FileText, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContractGenerator from "./ContractGenerator";
import PropertyDataCard from "@/components/property/PropertyDataCard";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function OfferCalculator({ leadId, existingOffer, onSaved, lead, owners, onOfferAccepted }) {
  const [arv, setArv] = useState(existingOffer?.arv || "");
  const [repairs, setRepairs] = useState(existingOffer?.estimated_repairs || "");
  const [assignmentFee, setAssignmentFee] = useState(existingOffer?.assignment_fee_target || 10000);
  const [offerPrice, setOfferPrice] = useState(existingOffer?.offer_price || "");
  const [showContract, setShowContract] = useState(false);
  const [offerOutcome, setOfferOutcome] = useState(existingOffer?.outcome || "Pending");
  const [showPropertyData, setShowPropertyData] = useState(false);

  const queryClient = useQueryClient();

  const { data: propertyData, isLoading: propertyDataLoading } = useQuery({
    queryKey: ["propertyData", leadId],
    queryFn: () => base44.entities.PropertyData.filter({ lead_id: leadId }).then(r => r[0]),
    enabled: !!leadId,
  });

  const fetchPropertyDataMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke("fetchPropertyData", {
        lead_id: leadId,
        property_address: lead.property_address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zip_code,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propertyData", leadId] });
      setShowPropertyData(true);
    },
  });

  // Auto-populate ARV from property data if available
  useEffect(() => {
    if (propertyData?.estimated_value && !arv) {
      setArv(propertyData.estimated_value);
    }
  }, [propertyData]);

  // Calculate MAO: (ARV * 0.70) - Repairs - Assignment Fee
  const mao = arv && repairs 
    ? Math.round((Number(arv) * 0.70) - Number(repairs) - Number(assignmentFee))
    : 0;

  useEffect(() => {
    if (mao > 0 && !offerPrice) {
      setOfferPrice(mao);
    }
  }, [mao]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingOffer?.id) {
        return base44.entities.Offer.update(existingOffer.id, data);
      }
      return base44.entities.Offer.create({ ...data, lead_id: leadId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", leadId] });
      if (onSaved) onSaved();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      arv: Number(arv),
      estimated_repairs: Number(repairs),
      maximum_allowable_offer: mao,
      offer_price: Number(offerPrice),
      assignment_fee_target: Number(assignmentFee),
    });
  };

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Offer Calculator</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPropertyDataMutation.mutate()}
          disabled={fetchPropertyDataMutation.isPending || propertyDataLoading}
          className="h-9 rounded-lg"
        >
          {fetchPropertyDataMutation.isPending ? (
            <>
              <Database className="w-3 h-3 mr-1 animate-pulse" />
              Fetching...
            </>
          ) : propertyData ? (
            <>
              <Database className="w-3 h-3 mr-1" />
              Refresh Data
            </>
          ) : (
            <>
              <Database className="w-3 h-3 mr-1" />
              Get Property Data
            </>
          )}
        </Button>
      </div>

      {/* Property Data Section */}
      {propertyData && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowPropertyData(!showPropertyData)}
            className="w-full justify-between h-auto py-2 px-3 rounded-xl hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-700">Property Research Data</span>
            {showPropertyData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {showPropertyData && (
            <div className="mt-3">
              <PropertyDataCard
                propertyData={propertyData}
                onRefresh={() => fetchPropertyDataMutation.mutate()}
                isRefreshing={fetchPropertyDataMutation.isPending}
              />
            </div>
          )}
        </div>
      )}

      {fetchPropertyDataMutation.isSuccess && !propertyData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          Property data fetched! ARV has been auto-filled with estimated value.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-slate-700">After Repair Value (ARV)</Label>
            {propertyData?.estimated_value && (
              <span className="text-xs text-emerald-600">
                ✓ Auto-filled from data
              </span>
            )}
          </div>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              className="pl-10 h-12 rounded-xl text-lg"
              placeholder="200000"
            />
          </div>
          {propertyData?.estimated_value && (
            <p className="text-xs text-slate-500 mt-1">
              Suggested from property data: {formatCurrency(propertyData.estimated_value)}
            </p>
          )}
        </div>

        <div>
          <Label className="text-slate-700">Estimated Repairs</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={repairs}
              onChange={(e) => setRepairs(e.target.value)}
              className="pl-10 h-12 rounded-xl text-lg"
              placeholder="30000"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-700">Target Assignment Fee</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={assignmentFee}
              onChange={(e) => setAssignmentFee(e.target.value)}
              className="pl-10 h-12 rounded-xl text-lg"
              placeholder="10000"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Maximum Allowable Offer</span>
        </div>
        <p className="text-3xl font-bold text-emerald-900">{formatCurrency(mao)}</p>
        <p className="text-xs text-emerald-600 mt-1">
          (ARV × 70%) - Repairs - Assignment Fee
        </p>
      </div>

      <div>
        <Label className="text-slate-700">Your Offer Price</Label>
        <div className="relative mt-1.5">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="number"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            className="pl-10 h-12 rounded-xl text-lg font-semibold"
            placeholder="Enter your offer"
          />
        </div>
        {offerPrice && mao && Number(offerPrice) > mao && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ This is above your MAO by {formatCurrency(Number(offerPrice) - mao)}
          </p>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={!arv || saveMutation.isPending}
        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Offer"}
      </Button>

      {existingOffer && (
        <div className="bg-slate-50 rounded-xl p-4">
          <Label className="text-slate-700 mb-2 block">Offer Outcome</Label>
          <Select
            value={offerOutcome}
            onValueChange={async (value) => {
              setOfferOutcome(value);
              await base44.entities.Offer.update(existingOffer.id, { outcome: value });
              queryClient.invalidateQueries({ queryKey: ["offers", leadId] });
              
              if (value === "Accepted" && onOfferAccepted) {
                onOfferAccepted();
                setShowContract(true);
              }
            }}
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="Accepted">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Accepted
                </div>
              </SelectItem>
              <SelectItem value="Rejected">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Rejected
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {offerOutcome === "Accepted" && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Great! Generate a contract below to proceed.
            </p>
          )}
        </div>
      )}

      {(existingOffer || offerPrice) && lead && (
        <>
          <Button
            variant="outline"
            onClick={() => setShowContract(!showContract)}
            className="w-full h-12 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Contract
            {showContract ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>

          {showContract && (
            <ContractGenerator
              lead={lead}
              offer={existingOffer || { offer_price: Number(offerPrice), maximum_allowable_offer: mao }}
              owners={owners}
              onContractCreated={() => setShowContract(false)}
            />
          )}
        </>
      )}
    </div>
  );
}