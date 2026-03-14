import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createLeadWithStageFallback, getStagePersistenceFields } from "@/lib/dealStages";

import LeadForm from "@/components/leads/LeadForm";

export default function AddLead() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { enrichmentData, ...leadData } = data;
      const leadPayload = {
        ...leadData,
        status: "New",
        last_activity_date: new Date().toISOString(),
        next_action_suggestion: leadData.next_action_suggestion || "Send First Message",
        ...getStagePersistenceFields({ ...leadData, status: "New" }, { updatedDate: new Date().toISOString() }),
      };

      let stageFallbackUsed = false;
      let stagePersistenceRiskDetected = false;

      const { lead } = await createLeadWithStageFallback(
        (payload) => base44.entities.Lead.create(payload),
        leadPayload,
        {
          onFallbackUsed: () => {
            stageFallbackUsed = true;
          },
          onOpaqueStagePersistenceRisk: () => {
            stagePersistenceRiskDetected = true;
          },
        }
      );

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

      return { lead, stageFallbackUsed, stagePersistenceRiskDetected };
    },
    onSuccess: ({ lead, stageFallbackUsed }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead saved. Next step: contact the seller and confirm motivation, timeline, and price expectations.");
      if (stageFallbackUsed) {
        toast.info("Lead saved successfully. We used compatibility mode for stage tracking while your workspace syncs updates.");
      }
      navigate(createPageUrl(`LeadDetail?id=${lead.id}`));
    },
    onError: (error) => {
      const fallbackHint =
        error?.stagePersistenceRiskDetected ||
        /validation|bad request|payload|schema/i.test(error?.message || "");

      toast.error(
        fallbackHint
          ? "We couldn't save this lead right now due to a temporary setup mismatch. Please try again or contact support if this continues."
          : "We couldn't save this lead right now. Please check the required fields and try again."
      );
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
            <h1 className="text-xl font-bold text-slate-900">Add New Lead</h1>
            <p className="text-sm text-slate-500">Capture the property opportunity first, then fill missing details later.</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">How to use this step</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-600">
            <li>Enter property address and location.</li>
            <li>Add seller contact details if available.</li>
            <li>Save now and set your next action so the lead does not go cold.</li>
          </ol>
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
