import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManager from "@/components/campaigns/CampaignManager";
import NurtureSequenceGuide from "@/components/campaigns/NurtureSequenceGuide";
import { Zap, BookOpen } from "lucide-react";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Lead Nurture Campaigns
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Create automated email and SMS sequences that trigger based on lead status changes
            </p>
          </div>

          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignManager />
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <NurtureSequenceGuide />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}