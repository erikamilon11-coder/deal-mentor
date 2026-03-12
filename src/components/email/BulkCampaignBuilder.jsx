import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Send, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LEAD_STATUSES = ["New", "Contacted", "Responded", "Talking", "Offer Sent", "Under Contract", "Closed"];
const LEAD_SOURCES = ["Driving for Dollars", "List", "Referral", "Other"];

export default function BulkCampaignBuilder() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState({
    statuses: [],
    sources: [],
    minDealScore: "",
  });
  const [formData, setFormData] = useState({
    campaign_name: "",
    template_id: "",
    recipient_filter: "{}",
  });
  const [previewLeads, setPreviewLeads] = useState([]);

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => base44.entities.EmailTemplate.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["bulkEmailCampaigns"],
    queryFn: () => base44.entities.BulkEmailCampaign.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => base44.entities.BulkEmailCampaign.create(data),
    onSuccess: (newCampaign) => {
      queryClient.invalidateQueries({ queryKey: ["bulkEmailCampaigns"] });
      toast.success("Campaign created!");
      resetForm();
      // Auto-send if confirmed
      if (window.confirm("Would you like to send this campaign now?")) {
        sendCampaignMutation.mutate(newCampaign.id);
      }
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (campaignId) =>
      base44.functions.invoke("sendBulkEmailCampaign", { campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulkEmailCampaigns"] });
      toast.success("Campaign sent!");
      resetForm();
    },
    onError: () => toast.error("Failed to send campaign"),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => base44.entities.BulkEmailCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulkEmailCampaigns"] });
      toast.success("Campaign deleted!");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const resetForm = () => {
    setFormData({ campaign_name: "", template_id: "", recipient_filter: "{}" });
    setFilters({ statuses: [], sources: [], minDealScore: "" });
    setPreviewLeads([]);
    setStep(1);
    setMode("list");
  };

  const getFilteredLeads = () => {
    return leads.filter((lead) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(lead.status)) {
        return false;
      }
      if (filters.sources.length > 0 && !filters.sources.includes(lead.lead_source)) {
        return false;
      }
      if (filters.minDealScore && (lead.deal_score || 0) < parseInt(filters.minDealScore)) {
        return false;
      }
      return true;
    });
  };

  const handlePreview = () => {
    const filtered = getFilteredLeads();
    setPreviewLeads(filtered);
    setFormData((prev) => ({
      ...prev,
      recipient_filter: JSON.stringify(filters),
    }));
  };

  const handleCreateCampaign = () => {
    if (!formData.campaign_name || !formData.template_id) {
      toast.error("Please enter campaign name and select a template");
      return;
    }

    const filtered = getFilteredLeads();
    if (filtered.length === 0) {
      toast.error("No leads match your filters");
      return;
    }

    createCampaignMutation.mutate({
      ...formData,
      total_recipients: filtered.length,
    });
  };

  if (mode === "create" || mode === "edit") {
    const filteredLeads = getFilteredLeads();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create Email Campaign</h2>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step {step}: {step === 1 ? "Campaign Details" : step === 2 ? "Target Leads" : "Review"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    placeholder="e.g., March Follow-up Campaign"
                  />
                </div>

                <div>
                  <Label>Select Email Template</Label>
                  <Select value={formData.template_id} onValueChange={(value) => setFormData({ ...formData, template_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => setStep(2)} disabled={!formData.campaign_name || !formData.template_id}>
                  Next: Target Leads
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Lead Status</Label>
                    <div className="space-y-2">
                      {LEAD_STATUSES.map((status) => (
                        <div key={status} className="flex items-center gap-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.statuses.includes(status)}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => ({
                                ...prev,
                                statuses: checked
                                  ? [...prev.statuses, status]
                                  : prev.statuses.filter((s) => s !== status),
                              }));
                            }}
                          />
                          <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Lead Source</Label>
                    <div className="space-y-2">
                      {LEAD_SOURCES.map((source) => (
                        <div key={source} className="flex items-center gap-2">
                          <Checkbox
                            id={`source-${source}`}
                            checked={filters.sources.includes(source)}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => ({
                                ...prev,
                                sources: checked
                                  ? [...prev.sources, source]
                                  : prev.sources.filter((s) => s !== source),
                              }));
                            }}
                          />
                          <label htmlFor={`source-${source}`} className="text-sm cursor-pointer">
                            {source}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Minimum Deal Score (optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={filters.minDealScore}
                      onChange={(e) => setFilters({ ...filters, minDealScore: e.target.value })}
                      placeholder="Leave empty for no minimum"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    {filteredLeads.length} leads match your current filters
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handlePreview}>
                    Preview Recipients
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Campaign</p>
                    <p className="font-medium text-slate-900">{formData.campaign_name}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Recipients</p>
                    <p className="font-medium text-slate-900">{previewLeads.length} leads</p>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {previewLeads.slice(0, 10).map((lead) => (
                    <div key={lead.id} className="text-sm text-slate-700 pb-2 border-b last:border-0">
                      {lead.property_address} ({lead.status})
                    </div>
                  ))}
                  {previewLeads.length > 10 && (
                    <p className="text-xs text-slate-500 pt-2">
                      ...and {previewLeads.length - 10} more
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Create & Send Campaign
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="w-6 h-6" />
          Email Campaigns
        </h2>
        <Button onClick={() => setMode("create")}>+ New Campaign</Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <Send className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No campaigns yet. Create your first bulk email campaign!</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const openRate = campaign.total_recipients > 0 ? ((campaign.open_count / campaign.total_recipients) * 100).toFixed(1) : 0;
            const clickRate = campaign.total_recipients > 0 ? ((campaign.click_count / campaign.total_recipients) * 100).toFixed(1) : 0;

            return (
              <Card key={campaign.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{campaign.campaign_name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Status: <span className="font-medium capitalize">{campaign.status}</span>
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Sent</p>
                          <p className="font-medium text-slate-900">{campaign.sent_count}/{campaign.total_recipients}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Open Rate</p>
                          <p className="font-medium text-slate-900">{openRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Click Rate</p>
                          <p className="font-medium text-slate-900">{clickRate}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}