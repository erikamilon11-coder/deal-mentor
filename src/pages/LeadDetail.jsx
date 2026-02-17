import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  User,
  MessageSquare,
  Calendar,
  Calculator,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { addDays } from "date-fns";

import ActionSuggestion from "@/components/dashboard/ActionSuggestion";
import OwnerSection from "@/components/leads/OwnerSection";
import MessageSection from "@/components/leads/MessageSection";
import TaskSection from "@/components/leads/TaskSection";
import OfferCalculator from "@/components/offers/OfferCalculator";
import LeadForm from "@/components/leads/LeadForm";

const STATUSES = ["New", "Contacted", "Responded", "Talking", "Offer Sent", "Under Contract", "Closed", "Dead"];

const statusColors = {
  "New": "bg-blue-100 text-blue-700",
  "Contacted": "bg-amber-100 text-amber-700",
  "Responded": "bg-emerald-100 text-emerald-700",
  "Talking": "bg-purple-100 text-purple-700",
  "Offer Sent": "bg-indigo-100 text-indigo-700",
  "Under Contract": "bg-teal-100 text-teal-700",
  "Closed": "bg-green-100 text-green-700",
  "Dead": "bg-slate-100 text-slate-500",
};

export default function LeadDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("messages");
  const [showEdit, setShowEdit] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => base44.entities.Lead.filter({ id: leadId }).then(r => r[0]),
    enabled: !!leadId,
  });

  const { data: owners } = useQuery({
    queryKey: ["owners", leadId],
    queryFn: () => base44.entities.Owner.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const { data: phones } = useQuery({
    queryKey: ["phones"],
    queryFn: () => base44.entities.Phone.list(),
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", leadId],
    queryFn: () => base44.entities.Message.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", leadId],
    queryFn: () => base44.entities.Task.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const { data: offers } = useQuery({
    queryKey: ["offers", leadId],
    queryFn: () => base44.entities.Offer.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowEdit(false);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: () => base44.entities.Lead.delete(leadId),
    onSuccess: () => navigate(createPageUrl("Dashboard")),
  });

  const handleStatusChange = (newStatus) => {
    const updates = {
      status: newStatus,
      last_activity_date: new Date().toISOString(),
    };
    
    // Update next action suggestion based on status
    const suggestions = {
      "New": "Send First Message",
      "Contacted": "Ask Motivation Questions",
      "Responded": "Prepare Offer",
      "Talking": "Send Contract",
      "Offer Sent": "Follow Up for Decision",
    };
    if (suggestions[newStatus]) {
      updates.next_action_suggestion = suggestions[newStatus];
    }

    updateLeadMutation.mutate(updates);
  };

  const handleMessageSent = async () => {
    // Update lead status and create follow-up tasks
    const updates = {
      status: lead.status === "New" ? "Contacted" : lead.status,
      last_contact_date: new Date().toISOString(),
      last_activity_date: new Date().toISOString(),
    };

    // Create follow-up tasks
    const task2Days = {
      lead_id: leadId,
      task_type: "Follow-up Text",
      due_date: addDays(new Date(), 2).toISOString(),
      status: "Open",
      auto_generated: true,
      description: "Auto-generated 2-day follow-up",
    };

    const task7Days = {
      lead_id: leadId,
      task_type: "Follow-up Text",
      due_date: addDays(new Date(), 7).toISOString(),
      status: "Open",
      auto_generated: true,
      description: "Auto-generated 7-day follow-up",
    };

    await base44.entities.Task.bulkCreate([task2Days, task7Days]);
    updates.next_followup_date = addDays(new Date(), 2).toISOString();

    updateLeadMutation.mutate(updates);
    queryClient.invalidateQueries({ queryKey: ["tasks", leadId] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 mb-4">Lead not found</p>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))}>Go Back</Button>
      </div>
    );
  }

  const latestOffer = offers?.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pb-8">
        {/* Header */}
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px]">
                {lead.property_address}
              </h1>
              <div className="flex items-center gap-1 text-slate-500 text-sm">
                <MapPin className="w-3 h-3" />
                <span>{lead.city}, {lead.state} {lead.zip_code}</span>
              </div>
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Actions</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => {
                    setShowEdit(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-3" /> Edit Lead
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this lead?")) {
                      deleteLeadMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-3" /> Delete Lead
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              <Badge className={`mt-1 ${statusColors[lead.status]}`}>{lead.status}</Badge>
            </div>
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36 h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {lead.distress_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
              {lead.distress_tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Suggestion */}
        {!["Closed", "Dead", "Under Contract"].includes(lead.status) && (
          <div className="mb-4">
            <ActionSuggestion
              status={lead.status}
              onAction={() => {
                if (lead.status === "Responded" || lead.status === "Talking") {
                  setShowCalculator(true);
                } else {
                  setActiveTab("messages");
                }
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white border border-slate-200 p-1 rounded-xl mb-4">
            <TabsTrigger value="messages" className="flex-1 rounded-lg text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex-1 rounded-lg text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-1" />
              Owners
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 rounded-lg text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="offer" className="flex-1 rounded-lg text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Calculator className="w-4 h-4 mr-1" />
              Offer
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <TabsContent value="messages" className="mt-0">
              <MessageSection
                leadId={leadId}
                messages={messages}
                onMessageSent={handleMessageSent}
              />
            </TabsContent>

            <TabsContent value="owners" className="mt-0">
              <OwnerSection
                leadId={leadId}
                owners={owners}
                phones={phones}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TaskSection leadId={leadId} tasks={tasks} />
            </TabsContent>

            <TabsContent value="offer" className="mt-0">
              <OfferCalculator
                leadId={leadId}
                existingOffer={latestOffer}
                onSaved={() => {
                  if (lead.status === "Responded") {
                    handleStatusChange("Offer Sent");
                  }
                }}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Notes */}
        {lead.notes && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={showEdit} onOpenChange={setShowEdit}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Lead</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LeadForm
              lead={lead}
              onSave={(data) => updateLeadMutation.mutate(data)}
              onCancel={() => setShowEdit(false)}
              isLoading={updateLeadMutation.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Calculator Sheet */}
      <Sheet open={showCalculator} onOpenChange={setShowCalculator}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Calculate Offer</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <OfferCalculator
              leadId={leadId}
              existingOffer={latestOffer}
              onSaved={() => setShowCalculator(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}