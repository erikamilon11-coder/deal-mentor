import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function FinancialWidget() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["allExpenses"],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["allContracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["allOffers"],
    queryFn: () => base44.entities.Offer.list(),
  });

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Calculate revenue from closed deals
  const closedLeads = leads.filter((l) => l.status === "Closed");
  const closedContracts = contracts.filter((c) =>
    closedLeads.some((l) => l.id === c.lead_id)
  );
  const totalRevenue = closedContracts.reduce(
    (sum, contract) => sum + (contract.purchase_price || 0),
    0
  );

  // Calculate profit
  const profit = totalRevenue - totalExpenses;
  const profitMargin =
    totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  // Calculate metrics
  const closedDealsCount = closedLeads.length;
  const avgCostPerLead =
    leads.length > 0 ? (totalExpenses / leads.length).toFixed(0) : 0;
  const avgDealValue = closedDealsCount > 0 ? (totalRevenue / closedDealsCount).toFixed(0) : 0;

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Main Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">
                Total Spend
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">
                Revenue
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Profit Card */}
      <Card className={`p-4 border-2 ${
        profit >= 0
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-600">
              Net Profit
            </p>
            <p className={`text-3xl font-bold mt-1 ${
              profit >= 0 ? "text-emerald-900" : "text-red-900"
            }`}>
              {formatCurrency(profit)}
            </p>
            <p className={`text-xs mt-1 ${
              profit >= 0 ? "text-emerald-700" : "text-red-700"
            }`}>
              {profitMargin}% margin
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${
            profit >= 0
              ? "bg-emerald-200"
              : "bg-red-200"
          } flex items-center justify-center`}>
            <DollarSign className={`w-6 h-6 ${
              profit >= 0 ? "text-emerald-700" : "text-red-700"
            }`} />
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Closed Deals</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {closedDealsCount}
          </p>
        </Card>

        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Cost/Lead</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {formatCurrency(avgCostPerLead)}
          </p>
        </Card>

        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Avg Deal</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {formatCurrency(avgDealValue)}
          </p>
        </Card>
      </div>

      {/* Summary */}
      <Card className="p-4 border-slate-200 bg-slate-50">
        <div className="text-xs space-y-2 text-slate-600">
          <div className="flex justify-between">
            <span>Total Leads:</span>
            <span className="font-medium text-slate-900">{leads.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Closed Deals:</span>
            <span className="font-medium text-slate-900">{closedDealsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Conversion Rate:</span>
            <span className="font-medium text-slate-900">
              {leads.length > 0
                ? ((closedDealsCount / leads.length) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}