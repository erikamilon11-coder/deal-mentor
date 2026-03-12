import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Home, Calendar, MessageSquare, Loader2, Upload } from "lucide-react";
import { isBefore, isToday, startOfDay } from "date-fns";

import StatsCard from "@/components/dashboard/StatsCard";
import LeadCard from "@/components/dashboard/LeadCard";
import PipelineView from "@/components/pipeline/PipelineView";
import PullToRefresh from "@/components/PullToRefresh";
import LeadsMapView from "@/components/map/LeadsMapView";
import BulkLeadImporter from "@/components/dashboard/BulkLeadImporter";
import TasksWidget from "@/components/dashboard/TasksWidget";
import TaskManager from "@/components/dashboard/TaskManager";
import DashboardMapView from "@/components/dashboard/DashboardMapView";
import FinancialWidget from "@/components/dashboard/FinancialWidget";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("followups");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  useQuery({
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
  const hasLeads = leads.length > 0;
  const followupLeads = leads.filter((lead) => {
    if (!lead.next_followup_date) return false;
    const followupDate = new Date(lead.next_followup_date);
    return isToday(followupDate) || isBefore(followupDate, todayStart);
  });
  const newLeads = leads.filter((lead) => lead.status === "New");
  const respondedLeads = leads.filter((lead) => lead.status === "Responded");
  const activeLeads = leads.filter((lead) => !["Closed", "Dead"].includes(lead.status));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="mx-auto max-w-lg px-4 pb-40" style={{ paddingTop: "env(safe-area-inset-top, 1.5rem)" }}>
          <div className="pb-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deal Mentor</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your real estate acquisition CRM</p>
              </div>
              {hasLeads && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkImport(true)}
                  className="rounded-lg"
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Import
                </Button>
              )}
            </div>
          </div>

          {!hasLeads ? (
            <div className="flex min-h-[65vh] items-center justify-center">
              <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Home className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h2 className="text-2xl font-bold text-slate-900">Welcome to Deal Mentor</h2>
                <p className="mt-2 text-sm text-slate-500">You have no leads yet. Add your first lead to begin.</p>
                <Link to={createPageUrl("AddLead")}>
                  <Button className="mt-6 h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold hover:bg-slate-800">
                    <Plus className="mr-2 h-5 w-5" />
                    Add Your First Lead
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3">
                <StatsCard title="Active Leads" value={activeLeads.length} icon={Home} color="blue" />
                <StatsCard title="Follow-ups Today" value={followupLeads.length} icon={Calendar} color="amber" />
                <StatsCard title="New Leads" value={newLeads.length} icon={Plus} color="green" />
                <StatsCard title="Responses" value={respondedLeads.length} icon={MessageSquare} color="purple" />
              </div>

              <div className="mb-6">
                <TasksWidget />
              </div>

              <div className="mb-6">
                <FinancialWidget />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="w-full rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                  <TabsTrigger value="followups" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Follow-ups</TabsTrigger>
                  <TabsTrigger value="new" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">New</TabsTrigger>
                  <TabsTrigger value="map" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Map</TabsTrigger>
                  <TabsTrigger value="pipeline" className="flex-1 rounded-lg text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Pipeline</TabsTrigger>
                </TabsList>

                <TabsContent value="followups" className="mt-4 space-y-3">
                  {followupLeads.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center">
                      <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                      <p className="text-slate-500">No follow-ups due today</p>
                      <p className="mt-1 text-sm text-slate-400">Great job staying on top of things.</p>
                    </div>
                  ) : (
                    followupLeads.map((lead) => <LeadCard key={lead.id} lead={lead} showFollowup />)
                  )}
                </TabsContent>

                <TabsContent value="new" className="mt-4 space-y-3">
                  {newLeads.length === 0 ? (
                    <div className="rounded-2xl bg-white p-8 text-center">
                      <Plus className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                      <p className="text-slate-500">No new leads</p>
                      <Link to={createPageUrl("AddLead")}>
                        <Button className="mt-4 bg-slate-900">Add Your First Lead</Button>
                      </Link>
                    </div>
                  ) : (
                    newLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                  )}
                </TabsContent>

                <TabsContent value="map" className="mt-4">
                  <LeadsMapView leads={leads} statusFilter="All" />
                </TabsContent>

                <TabsContent value="pipeline" className="mt-4">
                  <PipelineView leads={leads} />
                </TabsContent>
              </Tabs>

              <section className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Territory Map</h2>
                <DashboardMapView />
              </section>

              <section>
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Follow-up Tasks</h2>
                <TaskManager />
              </section>
            </>
          )}
        </div>
      </PullToRefresh>

      {hasLeads && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}>
          <div className="mx-auto max-w-lg">
            <Link to={createPageUrl("AddLead")}>
              <Button className="h-14 w-full rounded-2xl bg-slate-900 text-lg font-semibold hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                <Plus className="mr-2 h-5 w-5" />
                Add New Lead
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Sheet open={showBulkImport} onOpenChange={setShowBulkImport}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
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