import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ConversionFunnel({ leads }) {
  const funnelStages = [
    { name: "Total Leads", status: null, color: "bg-slate-500" },
    { name: "Contacted", status: "Contacted", color: "bg-amber-500" },
    { name: "Responded", status: "Responded", color: "bg-emerald-500" },
    { name: "Talking", status: "Talking", color: "bg-purple-500" },
    { name: "Offer Sent", status: "Offer Sent", color: "bg-indigo-500" },
    { name: "Under Contract", status: "Under Contract", color: "bg-teal-500" },
    { name: "Closed", status: "Closed", color: "bg-green-500" },
  ];

  const totalLeads = leads?.length || 0;

  const getStageCount = (status) => {
    if (!status) return totalLeads;
    return leads?.filter(l => l.status === status).length || 0;
  };

  const getConversionRate = (currentCount, previousCount) => {
    if (previousCount === 0) return 0;
    return ((currentCount / previousCount) * 100).toFixed(1);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track leads through each stage of your sales process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelStages.map((stage, index) => {
              const count = getStageCount(stage.status);
              const previousCount = index === 0 ? totalLeads : getStageCount(funnelStages[index - 1].status);
              const conversionRate = getConversionRate(count, previousCount);
              const percentage = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : 0;

              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      <span className="font-medium text-slate-900 dark:text-white">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white">
                        {count} leads
                      </Badge>
                      {index > 0 && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {conversionRate}% conversion
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-1">
                    <div
                      className={`${stage.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {percentage}% of total leads
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Insights */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Conversion Insights</CardTitle>
          <CardDescription>Key observations about your funnel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Overall Conversion Rate
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {getConversionRate(getStageCount("Closed"), totalLeads)}%
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              From initial contact to closed deal
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
              Response Rate
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {getConversionRate(getStageCount("Responded"), getStageCount("Contacted"))}%
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Leads that responded after contact
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
              Closing Rate
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {getConversionRate(getStageCount("Closed"), getStageCount("Under Contract"))}%
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Contracts that closed successfully
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}