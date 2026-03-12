import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Loader2, Home } from "lucide-react";

import LeadCard from "@/components/dashboard/LeadCard";
import PullToRefresh from "@/components/PullToRefresh";

const STATUSES = ["All", "New", "Contacted", "Responded", "Talking", "Offer Sent", "Under Contract", "Closed", "Dead"];

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.property_address?.toLowerCase().includes(search.toLowerCase()) ||
      lead.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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
          <div className="pt-6 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Leads</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{leads?.length || 0} properties</p>
            </div>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address or city..."
              className="pl-10 h-12 rounded-xl bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-12 rounded-xl bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        <div className="space-y-3">
          {filteredLeads.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No leads found</p>
              {search && (
                <Button
                  variant="link"
                  onClick={() => setSearch("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} showFollowup />
          ))}
        </div>

          {/* Add Button */}
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
    </div>
  );
}