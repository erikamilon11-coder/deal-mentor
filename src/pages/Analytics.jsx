import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, Clock, DollarSign, Home, Award, Target, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import PerformanceMetrics from "@/components/analytics/PerformanceMetrics";
import ConversionFunnel from "@/components/analytics/ConversionFunnel";
import ResponseTimeChart from "@/components/analytics/ResponseTimeChart";
import RevenueProjections from "@/components/analytics/RevenueProjections";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import ProfitabilityAnalyzer from "@/components/analytics/ProfitabilityAnalyzer";

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("30d");
  const [filters, setFilters] = useState({
    agent: "all",
    leadSource: "all",
    dateFrom: null,
    dateTo: null,
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  const { data: messages } = useQuery({
    queryKey: ["messages"],
    queryFn: () => base44.entities.Message.list("-message_timestamp"),
  });

  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date"),
  });

  const { data: offers } = useQuery({
    queryKey: ["offers"],
    queryFn: () => base44.entities.Offer.list("-created_date"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      // Agent filter
      if (filters.agent !== "all" && lead.created_by !== filters.agent) {
        return false;
      }

      // Lead source filter
      if (filters.leadSource !== "all" && lead.lead_source !== filters.leadSource) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const leadDate = new Date(lead.created_date);
        if (filters.dateFrom && leadDate < filters.dateFrom) {
          return false;
        }
        if (filters.dateTo) {
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (leadDate > endOfDay) {
            return false;
          }
        }
      }

      return true;
    });
  }, [leads, filters]);

  // Filter related data based on filtered leads
  const filteredOffers = useMemo(() => {
    if (!offers || !filteredLeads) return [];
    const leadIds = new Set(filteredLeads.map(l => l.id));
    return offers.filter(o => leadIds.has(o.lead_id));
  }, [offers, filteredLeads]);

  const filteredMessages = useMemo(() => {
    if (!messages || !filteredLeads) return [];
    const leadIds = new Set(filteredLeads.map(l => l.id));
    return messages.filter(m => leadIds.has(m.lead_id));
  }, [messages, filteredLeads]);

  const filteredContracts = useMemo(() => {
    if (!contracts || !filteredLeads) return [];
    const leadIds = new Set(filteredLeads.map(l => l.id));
    return contracts.filter(c => leadIds.has(c.lead_id));
  }, [contracts, filteredLeads]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const activeLeads = filteredLeads?.filter(l => !["Closed", "Dead"].includes(l.status)) || [];
  const closedDeals = filteredLeads?.filter(l => l.status === "Closed") || [];
  const underContract = filteredLeads?.filter(l => l.status === "Under Contract") || [];
  const totalRevenue = filteredOffers?.filter(o => o.outcome === "Accepted").reduce((sum, o) => sum + (o.assignment_fee_target || 0), 0) || 0;

  const kpiCards = [
    {
      title: "Active Leads",
      value: activeLeads.length,
      icon: Home,
      color: "bg-blue-500",
      change: "+12%",
      changeType: "positive"
    },
    {
      title: "Under Contract",
      value: underContract.length,
      icon: Activity,
      color: "bg-teal-500",
      change: "+8%",
      changeType: "positive"
    },
    {
      title: "Closed Deals",
      value: closedDeals.length,
      icon: Award,
      color: "bg-green-500",
      change: "+5%",
      changeType: "positive"
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-purple-500",
      change: "+18%",
      changeType: "positive"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track your performance and growth metrics</p>
            </div>
            <AnalyticsFilters onFilterChange={setFilters} users={users} />
          </div>
          {(filters.agent !== "all" || filters.leadSource !== "all" || filters.dateFrom || filters.dateTo) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              Showing filtered results: {filteredLeads.length} of {leads?.length || 0} leads
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{kpi.title}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                      <Badge variant={kpi.changeType === "positive" ? "default" : "destructive"} className="mt-2 text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {kpi.change}
                      </Badge>
                    </div>
                    <div className={`${kpi.color} p-3 rounded-xl`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="response">Response Time</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <PerformanceMetrics leads={filteredLeads} messages={filteredMessages} offers={filteredOffers} />
          </TabsContent>

          <TabsContent value="conversion">
            <ConversionFunnel leads={filteredLeads} />
          </TabsContent>

          <TabsContent value="response">
            <ResponseTimeChart leads={filteredLeads} messages={filteredMessages} />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueProjections leads={filteredLeads} offers={filteredOffers} contracts={filteredContracts} />
          </TabsContent>

          <TabsContent value="profitability">
            <ProfitabilityAnalyzer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}