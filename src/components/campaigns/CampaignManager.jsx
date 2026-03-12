import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Mail, 
  MessageSquare, 
  Plus, 
  Zap, 
  Clock,
  Users,
  Pencil,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CampaignBuilder from "./CampaignBuilder";

export default function CampaignManager() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.CampaignSequence.list(),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['campaign-enrollments'],
    queryFn: () => base44.entities.CampaignEnrollment.list(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => 
      base44.entities.CampaignSequence.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });

  const getEnrollmentCount = (campaignId) => {
    return enrollments.filter(e => e.campaign_id === campaignId && e.status === "Active").length;
  };

  const getTriggerLabel = (campaign) => {
    if (campaign.trigger_type === "status_change") {
      return `Status: ${campaign.trigger_status}`;
    } else if (campaign.trigger_type === "days_since_contact") {
      return `${campaign.trigger_days}d since contact`;
    } else {
      return `${campaign.trigger_days}d since created`;
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowBuilder(true);
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    setShowBuilder(true);
  };

  const handleClose = () => {
    setShowBuilder(false);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Drip Campaigns</h2>
          <p className="text-sm text-slate-500 mt-1">Automated follow-up sequences</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-slate-900 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Zap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">No campaigns yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Create automated drip campaigns to follow up with leads
          </p>
          <Button onClick={handleCreate} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" />
            Create Your First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const steps = JSON.parse(campaign.sequence_steps || "[]");
            const enrollmentCount = getEnrollmentCount(campaign.id);
            
            return (
              <Card key={campaign.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {campaign.channel === "Email" ? (
                        <Mail className="w-5 h-5 text-slate-600" />
                      ) : (
                        <MessageSquare className="w-5 h-5 text-slate-600" />
                      )}
                      <h3 className="font-semibold text-slate-900">{campaign.campaign_name}</h3>
                      <Badge variant="outline" className={campaign.is_active 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-slate-100 text-slate-600"}>
                        {campaign.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4" />
                        {getTriggerLabel(campaign)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {steps.length} step{steps.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {enrollmentCount} enrolled
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {steps.slice(0, 3).map((step, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-slate-50">
                          Day {step.delay_days}: {step.subject || step.message?.substring(0, 30)}
                          {(step.subject?.length > 30 || step.message?.length > 30) && "..."}
                        </Badge>
                      ))}
                      {steps.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-50">
                          +{steps.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: campaign.id, 
                        is_active: !campaign.is_active 
                      })}
                      className="h-9 w-9"
                    >
                      {campaign.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(campaign)}
                      className="rounded-lg"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={showBuilder} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCampaign ? "Edit Campaign" : "Create Drip Campaign"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <CampaignBuilder
              campaign={editingCampaign}
              onSave={handleClose}
              onCancel={handleClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}