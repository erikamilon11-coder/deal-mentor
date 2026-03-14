import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { subMonths, format, startOfMonth } from "date-fns";
import { TrendingUp, DollarSign } from "lucide-react";

export default function RevenueProjections({ leads, offers, contracts }) {
  // Calculate monthly revenue (actual closed deals)
  const generateMonthlyRevenue = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = startOfMonth(subMonths(new Date(), i - 1));

      const closedInMonth = leads?.filter(l => {
        if (l.status !== "Closed") return false;
        const updated = new Date(l.updated_date);
        return updated >= monthStart && updated < monthEnd;
      }) || [];

      const revenue = closedInMonth.reduce((sum, lead) => {
        const offer = offers?.find(o => o.lead_id === lead.id && o.outcome === "Accepted");
        return sum + (offer?.assignment_fee_target || 0);
      }, 0);

      months.push({
        month: format(monthStart, "MMM yyyy"),
        revenue: revenue,
        deals: closedInMonth.length,
      });
    }
    return months;
  };

  const monthlyData = generateMonthlyRevenue();

  // Calculate pipeline value (projected)
  const calculatePipelineValue = () => {
    const pipeline = [
      { stage: "Talking", leads: leads?.filter(l => l.status === "Talking") || [] },
      { stage: "Offer Sent", leads: leads?.filter(l => l.status === "Offer Sent") || [] },
      { stage: "Under Contract", leads: leads?.filter(l => l.status === "Under Contract") || [] },
    ];

    return pipeline.map(stage => {
      const value = stage.leads.reduce((sum, lead) => {
        const offer = offers?.find(o => o.lead_id === lead.id);
        return sum + (offer?.assignment_fee_target || 0);
      }, 0);

      return {
        stage: stage.stage,
        value: value,
        count: stage.leads.length,
      };
    });
  };

  const pipelineData = calculatePipelineValue();

  // Total metrics
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalDeals = monthlyData.reduce((sum, m) => sum + m.deals, 0);
  const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  const pipelineValue = pipelineData.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total Revenue (6mo)</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Closed Deals</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalDeals}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Avg Deal Size</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  ${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  ${pipelineValue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue from closed deals</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
                formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pipeline Value */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Pipeline Value by Stage</CardTitle>
          <CardDescription>Projected revenue from active deals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipelineData.map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 dark:text-white">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{stage.count} deals</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${stage.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                    style={{ width: `${pipelineValue > 0 ? (stage.value / pipelineValue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}