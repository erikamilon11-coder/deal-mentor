import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Mail, MessageSquare, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const STATUSES = ["New", "Contacted", "Responded", "Talking", "Offer Sent", "Under Contract", "Closed", "Dead"];

const DEFAULT_STEP = {
  delay_days: 0,
  subject: "",
  message: ""
};

export default function CampaignBuilder({ campaign, onSave, onCancel }) {
  const [formData, setFormData] = useState(campaign || {
    campaign_name: "",
    trigger_type: "status_change",
    trigger_status: "New",
    trigger_days: 3,
    channel: "Email",
    is_active: true,
    sequence_steps: "[]"
  });

  const [steps, setSteps] = useState(
    campaign?.sequence_steps 
      ? JSON.parse(campaign.sequence_steps) 
      : [{ ...DEFAULT_STEP }]
  );

  const [expandedSteps, setExpandedSteps] = useState([0]);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        sequence_steps: JSON.stringify(steps)
      };
      
      if (campaign?.id) {
        return base44.entities.CampaignSequence.update(campaign.id, payload);
      } else {
        return base44.entities.CampaignSequence.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      if (onSave) onSave();
    }
  });

  const addStep = () => {
    setSteps([...steps, { ...DEFAULT_STEP, delay_days: steps.length }]);
    setExpandedSteps([...expandedSteps, steps.length]);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
    setExpandedSteps(expandedSteps.filter(i => i !== index));
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const toggleExpanded = (index) => {
    if (expandedSteps.includes(index)) {
      setExpandedSteps(expandedSteps.filter(i => i !== index));
    } else {
      setExpandedSteps([...expandedSteps, index]);
    }
  };

  const getTriggerDescription = () => {
    if (formData.trigger_type === "status_change") {
      return `When lead status changes to "${formData.trigger_status}"`;
    } else if (formData.trigger_type === "days_since_contact") {
      return `${formData.trigger_days} days after last contact`;
    } else {
      return `${formData.trigger_days} days after lead creation`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-slate-700">Campaign Name</Label>
          <Input
            value={formData.campaign_name}
            onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
            placeholder="e.g., New Lead Follow-up"
            className="mt-1.5 h-11 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-700">Channel</Label>
            <Select
              value={formData.channel}
              onValueChange={(value) => setFormData({ ...formData, channel: value })}
            >
              <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="SMS">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    SMS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-700">Trigger Type</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
            >
              <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="days_since_contact">Days Since Contact</SelectItem>
                <SelectItem value="days_since_created">Days Since Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.trigger_type === "status_change" ? (
          <div>
            <Label className="text-slate-700">Trigger Status</Label>
            <Select
              value={formData.trigger_status}
              onValueChange={(value) => setFormData({ ...formData, trigger_status: value })}
            >
              <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label className="text-slate-700">Days</Label>
            <Input
              type="number"
              value={formData.trigger_days}
              onChange={(e) => setFormData({ ...formData, trigger_days: parseInt(e.target.value) || 0 })}
              className="mt-1.5 h-11 rounded-xl"
              min="0"
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Auto-trigger</p>
            <p className="text-xs text-blue-700 mt-0.5">{getTriggerDescription()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-700">Campaign Active</Label>
            <p className="text-xs text-slate-500 mt-0.5">Enable to start enrolling leads</p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Sequence Steps</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define the messages in your drip sequence</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addStep}
            className="rounded-lg"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const isExpanded = expandedSteps.includes(index);
            return (
              <Card key={index} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {step.subject || formData.channel === "SMS" ? step.message?.substring(0, 40) || "Untitled step" : "Untitled step"}
                        {step.subject && step.subject.length > 40 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {index === 0 ? "Send immediately" : `Send after ${step.delay_days} day${step.delay_days !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStep(index);
                        }}
                        className="text-red-600 hover:text-red-700 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 pt-4 border-t">
                    <div>
                      <Label className="text-slate-700">
                        Delay {index === 0 && "(from trigger)"}
                      </Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          type="number"
                          value={step.delay_days}
                          onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                          className="h-10 rounded-lg"
                          min="0"
                          disabled={index === 0}
                        />
                        <span className="text-sm text-slate-600">days</span>
                      </div>
                    </div>

                    {formData.channel === "Email" && (
                      <div>
                        <Label className="text-slate-700">Subject Line</Label>
                        <Input
                          value={step.subject}
                          onChange={(e) => updateStep(index, 'subject', e.target.value)}
                          placeholder="Email subject"
                          className="mt-1.5 h-10 rounded-lg"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-slate-700">
                        {formData.channel === "Email" ? "Email Body" : "SMS Message"}
                      </Label>
                      <Textarea
                        value={step.message}
                        onChange={(e) => updateStep(index, 'message', e.target.value)}
                        placeholder={formData.channel === "Email" 
                          ? "Write your email message here..."
                          : "Write your SMS message here (160 char limit)"}
                        className="mt-1.5 rounded-lg"
                        rows={formData.channel === "Email" ? 6 : 3}
                        maxLength={formData.channel === "SMS" ? 160 : undefined}
                      />
                      {formData.channel === "SMS" && (
                        <p className="text-xs text-slate-500 mt-1">
                          {step.message?.length || 0}/160 characters
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                      <p className="font-medium mb-1">Available variables:</p>
                      <p>{'{{property_address}}, {{owner_name}}, {{city}}, {{state}}'}</p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={() => saveMutation.mutate(formData)}
          disabled={!formData.campaign_name || steps.some(s => !s.message) || saveMutation.isPending}
          className="flex-1 h-11 rounded-xl bg-slate-900"
        >
          {saveMutation.isPending ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
        </Button>
      </div>
    </div>
  );
}