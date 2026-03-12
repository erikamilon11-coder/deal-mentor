import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import LeadForm from "@/components/leads/LeadForm";

export default function AddLead() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { enrichmentData, ...leadData } = data;

      const lead = await base44.entities.Lead.create({
        ...leadData,
        status: "New",
        last_activity_date: new Date().toISOString(),
        next_action_suggestion: leadData.next_action_suggestion || "Send First Message",
      });

      if (leadData.owner) {
        const owner = await base44.entities.Owner.create({
          lead_id: lead.id,
          owner_name: leadData.owner,
          email: leadData.email || null,
          mailing_address: "",
          entity_type: "Individual",
        });

        if (leadData.phone) {
          await base44.entities.Phone.create({
            owner_id: owner.id,
            phone_number: leadData.phone,
            confidence_level: "Medium",
          });
        }
      }

      if (enrichmentData) {
        await base44.entities.PropertyData.create({
          lead_id: lead.id,
          ...enrichmentData,
          data_source: "Public Records",
          fetched_date: new Date().toISOString(),
        });
      }

      return lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      navigate(createPageUrl(`LeadDetail?id=${lead.id}`));
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 pb-8" style={{ paddingTop: "env(safe-area-inset-top, 1.5rem)" }}>
        <div className="flex items-center gap-3 pb-4 pt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Add Lead</h1>
            <p className="text-sm text-slate-500">Enter the lead details below.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <LeadForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => navigate(createPageUrl("Dashboard"))}
            isLoading={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}