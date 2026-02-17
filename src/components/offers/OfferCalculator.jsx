import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, Save, TrendingDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function OfferCalculator({ leadId, existingOffer, onSaved }) {
  const [arv, setArv] = useState(existingOffer?.arv || "");
  const [repairs, setRepairs] = useState(existingOffer?.estimated_repairs || "");
  const [assignmentFee, setAssignmentFee] = useState(existingOffer?.assignment_fee_target || 10000);
  const [offerPrice, setOfferPrice] = useState(existingOffer?.offer_price || "");

  const queryClient = useQueryClient();

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
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Offer Calculator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-slate-700">After Repair Value (ARV)</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              className="pl-10 h-12 rounded-xl text-lg"
              placeholder="200000"
            />
          </div>
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
    </div>
  );
}