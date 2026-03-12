import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Mail, Eye, MousePointer, TrendingUp } from "lucide-react";

export default function EnrollmentTracker() {
  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => base44.entities.CampaignEnrollment.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.CampaignSequence.list(),
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => base44.entities.EmailLog.list(),
  });

  // Campaign performance stats
  const campaignStats = useMemo(() => {
    return campaigns.map((campaign) => {
      const campaignEnrollments = enrollments.filter((e) => e.campaign_id === campaign.id);
      const campaignLogs = emailLogs.filter((log) =>
        campaignEnrollments.some((e) => e.lead_id === log.lead_id)
      );

      const sends = campaignLogs.length;
      const opens = campaignLogs.filter((l) => l.opened).length;
      const clicks = campaignLogs.filter((l) => l.clicked).length;

      return {
        campaign_name: campaign.campaign_name,
        enrolled_count: campaignEnrollments.length,
        active_count: campaignEnrollments.filter((e) => e.status === "Active").length,
        sends,
        opens: opens || 0,
        clicks: clicks || 0,
        open_rate: sends > 0 ? ((opens / sends) * 100).toFixed(1) : 0,
        click_rate: sends > 0 ? ((clicks / sends) * 100).toFixed(1) : 0,
      };
    });
  }, [campaigns, enrollments, emailLogs]);

  // Enrollment status breakdown
  const statusBreakdown = useMemo(() => {
    const active = enrollments.filter((e) => e.status === "Active").length;
    const completed = enrollments.filter((e) => e.status === "Completed").length;
    const paused = enrollments.filter((e) => e.status === "Paused").length;
    const cancelled = enrollments.filter((e) => e.status === "Cancelled").length;

    return [
      { name: "Active", value: active, fill: "#3b82f6" },
      { name: "Completed", value: completed, fill: "#10b981" },
      { name: "Paused", value: paused, fill: "#f59e0b" },
      { name: "Cancelled", value: cancelled, fill: "#ef4444" },
    ];
  }, [enrollments]);

  // Daily enrollment trend
  const enrollmentTrend = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    return last7Days.map((date) => ({
      date,
      enrollments: enrollments.filter(
        (e) => e.enrollment_date?.startsWith(date)
      ).length,
      sends: emailLogs.filter((l) => l.sent_date?.startsWith(date)).length,
    }));
  }, [enrollments, emailLogs]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Mail className="w-5 h-5 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{enrollments.length}</p>
              <p className="text-xs text-slate-600">Total Enrollments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">
                {enrollments.filter((e) => e.status === "Active").length}
              </p>
              <p className="text-xs text-slate-600">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Eye className="w-5 h-5 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">
                {emailLogs.filter((l) => l.opened).length}
              </p>
              <p className="text-xs text-slate-600">Opens</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <MousePointer className="w-5 h-5 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">
                {emailLogs.filter((l) => l.clicked).length}
              </p>
              <p className="text-xs text-slate-600">Clicks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">By Campaign</TabsTrigger>
          <TabsTrigger value="status">Status Breakdown</TabsTrigger>
          <TabsTrigger value="trend">7-Day Trend</TabsTrigger>
        </TabsList>

        {/* Campaign Performance */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignStats.map((stat, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900">
                        {stat.campaign_name}
                      </h4>
                      <Badge variant="outline">{stat.enrolled_count} enrolled</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-slate-600">Sends</p>
                        <p className="font-semibold">{stat.sends}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Opens</p>
                        <p className="font-semibold text-blue-600">{stat.open_rate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Clicks</p>
                        <p className="font-semibold text-green-600">{stat.click_rate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Active</p>
                        <p className="font-semibold">{stat.active_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Breakdown */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">7-Day Activity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    stroke="#3b82f6"
                    name="New Enrollments"
                  />
                  <Line
                    type="monotone"
                    dataKey="sends"
                    stroke="#10b981"
                    name="Email Sends"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}