import CampaignManager from "@/components/campaigns/CampaignManager";

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <CampaignManager />
      </div>
    </div>
  );
}