import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DollarSign, Percent, TrendingDown } from "lucide-react";

export default function ProfitCalculator({ arv, repairs, onMAOChange }) {
  const [profitMargin, setProfitMargin] = useState(30);
  const [assignmentFee, setAssignmentFee] = useState(10000);
  const [holdingCosts, setHoldingCosts] = useState(2000);
  const [closingCosts, setClosingCosts] = useState(3000);

  // Calculate MAO: (ARV × (100% - Profit Margin%)) - Repairs - Assignment Fee - Holding Costs - Closing Costs
  const calculateMAO = () => {
    if (!arv) return 0;
    const arvNum = Number(arv);
    const repairsNum = Number(repairs) || 0;
    const multiplier = (100 - profitMargin) / 100;
    const mao = Math.round(
      (arvNum * multiplier) - repairsNum - Number(assignmentFee) - Number(holdingCosts) - Number(closingCosts)
    );
    return Math.max(0, mao);
  };

  const mao = calculateMAO();

  useEffect(() => {
    if (onMAOChange) {
      onMAOChange(mao, assignmentFee);
    }
  }, [mao, assignmentFee]);

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const potentialProfit = arv ? Math.round(Number(arv) - mao - Number(repairs) - Number(holdingCosts) - Number(closingCosts)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Percent className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Profit & MAO Calculator</h3>
      </div>

      {/* Profit Margin Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-slate-700">Target Profit Margin</Label>
          <span className="text-lg font-bold text-slate-900">{profitMargin}%</span>
        </div>
        <Slider
          value={[profitMargin]}
          onValueChange={(value) => setProfitMargin(value[0])}
          min={10}
          max={50}
          step={5}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Conservative (10%)</span>
          <span>Aggressive (50%)</span>
        </div>
      </div>

      {/* Additional Costs */}
      <div className="space-y-3">
        <div>
          <Label className="text-slate-700">Assignment Fee</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={assignmentFee}
              onChange={(e) => setAssignmentFee(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              placeholder="10000"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-700">Estimated Holding Costs</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={holdingCosts}
              onChange={(e) => setHoldingCosts(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              placeholder="2000"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Utilities, taxes, insurance while under contract</p>
        </div>

        <div>
          <Label className="text-slate-700">Estimated Closing Costs</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={closingCosts}
              onChange={(e) => setClosingCosts(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              placeholder="3000"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Title, escrow, transfer taxes</p>
        </div>
      </div>

      {/* MAO Display */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Maximum Allowable Offer</span>
        </div>
        <p className="text-3xl font-bold text-emerald-900">{formatCurrency(mao)}</p>
        <p className="text-xs text-emerald-600 mt-2">
          ARV × {100 - profitMargin}% - Repairs - Fees - Costs
        </p>
      </div>

      {/* Profit Breakdown */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-sm font-medium text-blue-900 mb-3">Deal Breakdown</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">ARV</span>
            <span className="font-medium text-blue-900">{formatCurrency(arv)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Purchase (MAO)</span>
            <span className="font-medium text-blue-900">- {formatCurrency(mao)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Repairs</span>
            <span className="font-medium text-blue-900">- {formatCurrency(repairs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Holding Costs</span>
            <span className="font-medium text-blue-900">- {formatCurrency(holdingCosts)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Closing Costs</span>
            <span className="font-medium text-blue-900">- {formatCurrency(closingCosts)}</span>
          </div>
          <div className="pt-2 border-t border-blue-300 flex justify-between">
            <span className="font-semibold text-blue-900">Potential Profit</span>
            <span className="font-bold text-blue-900">{formatCurrency(potentialProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}