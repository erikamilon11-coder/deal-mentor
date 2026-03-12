import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import LeadForm from "@/components/leads/LeadForm";

export default function AddLead() {
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const lead = await base44.entities.Lead.create({
        ...data,
        status: "New",
        last_activity_date: new Date().toISOString(),
        next_action_suggestion: "Send First Message",
      });

      // If enrichment data exists, save it to PropertyData entity
      if (data.enrichmentData) {
        await base44.entities.PropertyData.create({
          lead_id: lead.id,
          ...data.enrichmentData,
          data_source: "Public Records API",
          fetched_date: new Date().toISOString()
        });
      }

      return lead;
    },
    onSuccess: (lead) => {
      navigate(createPageUrl(`LeadDetail?id=${lead.id}`));
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 pb-8" style={{ paddingTop: "env(safe-area-inset-top, 1.5rem)" }}>
        {/* Header */}
        <div className="pt-6 pb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Add New Lead</h1>
            <p className="text-slate-500 text-sm">Enter property details</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
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