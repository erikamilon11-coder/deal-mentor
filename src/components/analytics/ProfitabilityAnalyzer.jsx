import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Calculator, PieChart, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format } from "date-fns";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ProfitabilityAnalyzer() {
  const [timeRange, setTimeRange] = useState("all");

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: () => base44.entities.Offer.list(),
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: propertyData, isLoading: propertyLoading } = useQuery({
    queryKey: ["propertyData"],
    queryFn: () => base44.entities.PropertyData.list(),
  });

  if (leadsLoading || offersLoading || contractsLoading || propertyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Calculate profitability metrics for each deal
  const dealMetrics = leads
    ?.filter((lead) => lead.status === "Closed" || lead.status === "Under Contract")
    .map((lead) => {
      const offer = offers?.find((o) => o.lead_id === lead.id);
      const contract = contracts?.find((c) => c.lead_id === lead.id);
      const property = propertyData?.find((p) => p.lead_id === lead.id);

      const acquisitionCost = offer?.offer_price || contract?.purchase_price || 0;
      const renovationCost = offer?.estimated_repairs || 0;
      const arv = offer?.arv || property?.estimated_value || 0;
      const assignmentFee = offer?.assignment_fee_target || 0;

      // Calculate different profit scenarios
      let netProfit = 0;
      let profitType = "Unknown";

      if (assignmentFee > 0) {
        // Wholesaling deal - profit is the assignment fee
        netProfit = assignmentFee;
        profitType = "Wholesale";
      } else if (arv > 0 && acquisitionCost > 0) {
        // Fix & flip - profit is ARV minus acquisition and renovation
        const totalCost = acquisitionCost + renovationCost;
        const sellingCosts = arv * 0.08; // Estimated 8% selling costs
        netProfit = arv - totalCost - sellingCosts;
        profitType = "Fix & Flip";
      }

      const roi = acquisitionCost > 0 ? ((netProfit / acquisitionCost) * 100).toFixed(1) : 0;

      return {
        id: lead.id,
        address: lead.property_address,
        city: lead.city,
        state: lead.state,
        status: lead.status,
        acquisitionCost,
        renovationCost,
        arv,
        assignmentFee,
        netProfit,
        roi,
        profitType,
        closedDate: lead.status === "Closed" ? lead.updated_date : null,
      };
    })
    .filter((deal) => deal.netProfit !== 0)
    .sort((a, b) => b.netProfit - a.netProfit) || [];

  // Summary statistics
  const totalDeals = dealMetrics.length;
  const totalProfit = dealMetrics.reduce((sum, deal) => sum + deal.netProfit, 0);
  const avgProfit = totalDeals > 0 ? totalProfit / totalDeals : 0;
  const avgROI = totalDeals > 0 ? dealMetrics.reduce((sum, deal) => sum + parseFloat(deal.roi), 0) / totalDeals : 0;

  const profitableDeals = dealMetrics.filter((d) => d.netProfit > 0).length;
  const unprofitableDeals = dealMetrics.filter((d) => d.netProfit < 0).length;

  // Chart data - Top 10 deals by profit
  const topDealsData = dealMetrics.slice(0, 10).map((deal) => ({
    name: `${deal.address?.substring(0, 20)}...`,
    profit: deal.netProfit,
    roi: parseFloat(deal.roi),
  }));

  // Profit type distribution
  const profitTypeData = [
    {
      name: "Wholesale",
      value: dealMetrics.filter((d) => d.profitType === "Wholesale").length,
      profit: dealMetrics.filter((d) => d.profitType === "Wholesale").reduce((sum, d) => sum + d.netProfit, 0),
    },
    {
      name: "Fix & Flip",
      value: dealMetrics.filter((d) => d.profitType === "Fix & Flip").length,
      profit: dealMetrics.filter((d) => d.profitType === "Fix & Flip").reduce((sum, d) => sum + d.netProfit, 0),
    },
  ].filter((item) => item.value > 0);

  // Monthly profit trend (last 6 months)
  const monthlyProfit = dealMetrics
    .filter((d) => d.closedDate)
    .reduce((acc, deal) => {
      const month = format(new Date(deal.closedDate), "MMM yyyy");
      if (!acc[month]) {
        acc[month] = { month, profit: 0, deals: 0 };
      }
      acc[month].profit += deal.netProfit;
      acc[month].deals += 1;
      return acc;
    }, {});

  const monthlyData = Object.values(monthlyProfit).slice(-6);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Profit</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(totalProfit)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Profit/Deal</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(avgProfit)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg ROI</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {avgROI.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Success Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {totalDeals > 0 ? ((profitableDeals / totalDeals) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {profitableDeals} of {totalDeals} deals
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-xl">
                <PieChart className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Deals by Profit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top 10 Deals by Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDealsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topDealsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "profit") return [formatCurrency(value), "Profit"];
                      if (name === "roi") return [`${value}%`, "ROI"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="profit" fill="#10b981" name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-500">No deal data available</div>
            )}
          </CardContent>
        </Card>

        {/* Deal Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Profit by Deal Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profitTypeData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={profitTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {profitTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {profitTypeData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.profit)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.value} deals</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">No deal type data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Profit Trend */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "profit") return [formatCurrency(value), "Profit"];
                    if (name === "deals") return [value, "Deals"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                <Line type="monotone" dataKey="deals" stroke="#3b82f6" strokeWidth={2} name="Deals" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Deal List */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dealMetrics.length > 0 ? (
              dealMetrics.map((deal) => (
                <div
                  key={deal.id}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{deal.address}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {deal.city}, {deal.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          deal.netProfit > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(deal.netProfit)}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          deal.netProfit > 0
                            ? "border-green-300 text-green-700 dark:text-green-400"
                            : "border-red-300 text-red-700 dark:text-red-400"
                        }
                      >
                        {deal.roi}% ROI
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Acquisition</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(deal.acquisitionCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Renovation</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(deal.renovationCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ARV/Sale</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(deal.arv)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                      <Badge variant="secondary" className="text-xs">
                        {deal.profitType}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No closed or under contract deals with profit data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}