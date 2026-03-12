import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Home, Calendar, MessageSquare, LayoutGrid, Loader2, Upload } from "lucide-react";
import { isToday, isBefore, startOfDay } from "date-fns";

import StatsCard from "@/components/dashboard/StatsCard";
import LeadCard from "@/components/dashboard/LeadCard";
import PipelineView from "@/components/pipeline/PipelineView";
import PullToRefresh from "@/components/PullToRefresh";
import LeadsMapView from "@/components/map/LeadsMapView";
import BulkLeadImporter from "@/components/dashboard/BulkLeadImporter";
import TasksWidget from "@/components/dashboard/TasksWidget";
import FinancialWidget from "@/components/dashboard/FinancialWidget";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("followups");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  const { data: tasks } = useQuery({
    queryKey: ["allTasks"],
    queryFn: () => base44.entities.Task.filter({ status: "Open" }),
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["allTasks"] }),
    ]);
  };

  const todayStart = startOfDay(new Date());

  const followupLeads = leads?.filter(lead => {
    if (!lead.next_followup_date) return false;
    const followupDate = new Date(lead.next_followup_date);
    return isToday(followupDate) || isBefore(followupDate, todayStart);
  }) || [];

  const newLeads = leads?.filter(l => l.status === "New") || [];
  const respondedLeads = leads?.filter(l => l.status === "Responded") || [];
  const activeLeads = leads?.filter(l => !["Closed", "Dead"].includes(l.status)) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-lg mx-auto px-4" style={{ paddingTop: "env(safe-area-inset-top, 1.5rem)" }}>
          {/* Header */}
          <div className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deal Mentor</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your real estate acquisition CRM</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkImport(true)}
                className="rounded-lg"
              >
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard
            title="Active Leads"
            value={activeLeads.length}
            icon={Home}
            color="blue"
          />
          <StatsCard
            title="Follow-ups Today"
            value={followupLeads.length}
            icon={Calendar}
            color="amber"
          />
          <StatsCard
            title="New Leads"
            value={newLeads.length}
            icon={Plus}
            color="green"
          />
          <StatsCard
            title="Responses"
            value={respondedLeads.length}
            icon={MessageSquare}
            color="purple"
          />
        </div>

        {/* Tasks Widget */}
        <div className="mb-6">
          <TasksWidget />
        </div>

        {/* Financial Widget */}
        <div className="mb-6">
          <FinancialWidget />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl">
            <TabsTrigger value="followups" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">
              Follow-ups
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">
              New
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">
              Map
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">
              Pipeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followups" className="mt-4 space-y-3">
            {followupLeads.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No follow-ups due today</p>
                <p className="text-sm text-slate-400 mt-1">Great job staying on top of things!</p>
              </div>
            ) : (
              followupLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} showFollowup />
              ))
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-3">
            {newLeads.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Plus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No new leads</p>
                <Link to={createPageUrl("AddLead")}>
                  <Button className="mt-4 bg-slate-900">Add Your First Lead</Button>
                </Link>
              </div>
            ) : (
              newLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <LeadsMapView leads={leads} statusFilter="All" />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            <PipelineView leads={leads} />
          </TabsContent>
        </Tabs>

          {/* Quick Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}>
            <div className="max-w-lg mx-auto">
              <Link to={createPageUrl("AddLead")}>
                <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-lg font-semibold">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Lead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bulk Import Sheet */}
      <Sheet open={showBulkImport} onOpenChange={setShowBulkImport}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bulk Import Leads</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <BulkLeadImporter
              onImportComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["leads"] });
                setShowBulkImport(false);
              }}
              onClose={() => setShowBulkImport(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}