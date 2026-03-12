import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { differenceInDays, subDays, format } from "date-fns";

export default function PerformanceMetrics({ leads, messages, offers }) {
  // Calculate conversion rate
  const totalLeads = leads?.length || 0;
  const closedDeals = leads?.filter(l => l.status === "Closed").length || 0;
  const conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : 0;

  // Calculate average response time
  const calculateAvgResponseTime = () => {
    if (!leads || !messages) return 0;
    
    const responseTimes = leads.map(lead => {
      const firstMessage = messages.find(m => m.lead_id === lead.id && m.direction === "Outbound");
      if (!firstMessage) return null;
      
      const leadCreated = new Date(lead.created_date);
      const firstResponse = new Date(firstMessage.message_timestamp);
      return differenceInDays(firstResponse, leadCreated);
    }).filter(t => t !== null);

    if (responseTimes.length === 0) return 0;
    return (responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length).toFixed(1);
  };

  const avgResponseTime = calculateAvgResponseTime();

  // Calculate deals in last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentDeals = leads?.filter(l => {
    const created = new Date(l.created_date);
    return created >= thirtyDaysAgo;
  }).length || 0;

  // Generate weekly activity data
  const generateWeeklyData = () => {
    const weeks = [];
    for (let i = 4; i >= 0; i--) {
      const weekStart = subDays(new Date(), i * 7);
      const weekEnd = subDays(new Date(), (i - 1) * 7);
      
      const newLeads = leads?.filter(l => {
        const created = new Date(l.created_date);
        return created >= weekStart && created < weekEnd;
      }).length || 0;

      const contacted = messages?.filter(m => {
        const sent = new Date(m.message_timestamp);
        return sent >= weekStart && sent < weekEnd && m.direction === "Outbound";
      }).length || 0;

      weeks.push({
        week: format(weekStart, "MMM d"),
        leads: newLeads,
        contacts: contacted,
      });
    }
    return weeks;
  };

  const weeklyData = generateWeeklyData();

  // Status distribution
  const statusData = [
    { status: "New", count: leads?.filter(l => l.status === "New").length || 0 },
    { status: "Contacted", count: leads?.filter(l => l.status === "Contacted").length || 0 },
    { status: "Responded", count: leads?.filter(l => l.status === "Responded").length || 0 },
    { status: "Talking", count: leads?.filter(l => l.status === "Talking").length || 0 },
    { status: "Offer Sent", count: leads?.filter(l => l.status === "Offer Sent").length || 0 },
    { status: "Under Contract", count: leads?.filter(l => l.status === "Under Contract").length || 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Key Metrics */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
          <CardDescription>Your core metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Lead Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{conversionRate}%</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${conversionRate}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgResponseTime} days</p>
            </div>
            <p className="text-xs text-slate-400">Time from lead creation to first contact</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Deals (Last 30 Days)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{recentDeals}</p>
            </div>
            <p className="text-xs text-slate-400">New leads added this month</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Offers Sent</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{offers?.length || 0}</p>
            </div>
            <p className="text-xs text-slate-400">Total offers submitted</p>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>Leads and contacts over the last 5 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
              />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="New Leads" />
              <Line type="monotone" dataKey="contacts" stroke="#10b981" strokeWidth={2} name="Contacts Made" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
          <CardDescription>Leads across different stages</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px", color: "#fff" }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}