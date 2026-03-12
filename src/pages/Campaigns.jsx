import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManager from "@/components/campaigns/CampaignManager";
import NurtureSequenceGuide from "@/components/campaigns/NurtureSequenceGuide";
import BulkEnrollmentTool from "@/components/campaigns/BulkEnrollmentTool";
import EnrollmentTracker from "@/components/campaigns/EnrollmentTracker";
import { Zap, BookOpen, Users, BarChart3 } from "lucide-react";

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

          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="enroll" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Bulk Enroll
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignManager />
          </TabsContent>

          <TabsContent value="enroll" className="space-y-6">
            <BulkEnrollmentTool />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            <EnrollmentTracker />
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <NurtureSequenceGuide />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}