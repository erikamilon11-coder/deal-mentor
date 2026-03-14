import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Users,
  CheckCircle2,
  Loader2,
  Search,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

export default function BulkEnrollmentTool() {
  const queryClient = useQueryClient();
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.CampaignSequence.filter({ is_active: true }),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => base44.entities.CampaignEnrollment.list(),
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => base44.entities.EmailLog.list(),
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("bulkEnrollCampaign", {
        lead_ids: Array.from(selectedLeads),
        campaign_id: selectedCampaign,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Enrolled ${data.enrolled_count} leads into campaign`);
      setSelectedLeads(new Set());
      setSelectedCampaign("");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
    onError: (error) => toast.error(error.message || "Failed to enroll leads"),
  });

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.city?.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === "active") {
        const hasActiveEnrollment = enrollments.some(
          (e) => e.lead_id === lead.id && e.status === "Active"
        );
        return matchesSearch && !hasActiveEnrollment;
      }

      if (filterStatus === "enrolled") {
        const hasAnyEnrollment = enrollments.some((e) => e.lead_id === lead.id);
        return matchesSearch && hasAnyEnrollment;
      }

      return matchesSearch;
    });
  }, [leads, enrollments, searchTerm, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const selectedLeadIds = Array.from(selectedLeads);
    const selectedEnrollments = enrollments.filter((e) =>
      selectedLeadIds.includes(e.lead_id)
    );
    const opens = emailLogs.filter((log) =>
      selectedLeadIds.includes(log.lead_id) && log.opened
    ).length;
    const clicks = emailLogs.filter((log) =>
      selectedLeadIds.includes(log.lead_id) && log.clicked
    ).length;

    return { opens, clicks, enrollmentCount: selectedEnrollments.length };
  }, [selectedLeads, enrollments, emailLogs]);

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const toggleLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Select Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a campaign to enroll leads..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaign_name} ({campaign.channel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lead Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Leads ({selectedLeads.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by address or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="active">Not Enrolled</SelectItem>
                <SelectItem value="enrolled">Already Enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 py-2 border-b">
            <Checkbox
              checked={
                selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
              }
              onCheckedChange={toggleSelectAll}
            />
            <label className="text-sm font-medium text-slate-700 cursor-pointer">
              Select All ({filteredLeads.length})
            </label>
          </div>

          {/* Lead List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No leads found</p>
            ) : (
              filteredLeads.map((lead) => {
                const isEnrolled = enrollments.some(
                  (e) => e.lead_id === lead.id && e.status === "Active"
                );

                return (
                  <div
                    key={lead.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                      disabled={isEnrolled}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {lead.property_address}
                      </p>
                      <p className="text-xs text-slate-500">
                        {lead.city}, {lead.state} {lead.zip_code}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {lead.status}
                        </Badge>
                        {isEnrolled && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Enrolled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Preview */}
      {selectedLeads.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Campaign Performance Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {selectedLeads.size}
                </p>
                <p className="text-xs text-slate-600 mt-1">Leads Selected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.opens}</p>
                <p className="text-xs text-slate-600 mt-1">Email Opens</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.clicks}</p>
                <p className="text-xs text-slate-600 mt-1">Link Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Action */}
      {selectedLeads.size > 0 && selectedCampaign && (
        <Button
          onClick={() => enrollMutation.mutate()}
          disabled={enrollMutation.isPending || selectedLeads.size === 0}
          size="lg"
          className="w-full gap-2"
        >
          {enrollMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Enroll {selectedLeads.size} Leads in Campaign
            </>
          )}
        </Button>
      )}
    </div>
  );
}