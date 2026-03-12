import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { differenceInHours } from "date-fns";

export default function ResponseTimeChart({ leads, messages }) {
  // Calculate response time for each lead
  const calculateResponseTimes = () => {
    if (!leads || !messages) return [];

    const times = leads.map(lead => {
      const firstOutbound = messages.find(m => m.lead_id === lead.id && m.direction === "Outbound");
      if (!firstOutbound) return null;

      const leadCreated = new Date(lead.created_date);
      const firstResponse = new Date(firstOutbound.message_timestamp);
      const hours = differenceInHours(firstResponse, leadCreated);

      return {
        leadId: lead.id,
        address: lead.property_address,
        hours: hours,
        status: lead.status,
      };
    }).filter(t => t !== null && t.hours >= 0);

    return times;
  };

  const responseTimes = calculateResponseTimes();

  // Group by time buckets
  const buckets = [
    { range: "< 1 hour", min: 0, max: 1, color: "#22c55e" },
    { range: "1-6 hours", min: 1, max: 6, color: "#84cc16" },
    { range: "6-24 hours", min: 6, max: 24, color: "#f59e0b" },
    { range: "1-3 days", min: 24, max: 72, color: "#ef4444" },
    { range: "> 3 days", min: 72, max: Infinity, color: "#dc2626" },
  ];

  const bucketData = buckets.map(bucket => {
    const count = responseTimes.filter(t => t.hours >= bucket.min && t.hours < bucket.max).length;
    return {
      ...bucket,
      count,
    };
  });

  // Calculate average response time
  const avgResponseTime = responseTimes.length > 0
    ? (responseTimes.reduce((sum, t) => sum + t.hours, 0) / responseTimes.length).toFixed(1)
    : 0;

  // Fastest and slowest response
  const fastestResponse = responseTimes.length > 0
    ? Math.min(...responseTimes.map(t => t.hours))
    : 0;

  const slowestResponse = responseTimes.length > 0
    ? Math.max(...responseTimes.map(t => t.hours))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
          <CardDescription>How quickly you're reaching out to leads</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bucketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {bucketData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Response Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Average Response Time</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {avgResponseTime} <span className="text-lg text-slate-500">hrs</span>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fastest Response</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fastestResponse} <span className="text-sm text-slate-500">hrs</span>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Slowest Response</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {slowestResponse} <span className="text-sm text-slate-500">hrs</span>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Leads Contacted</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {responseTimes.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}