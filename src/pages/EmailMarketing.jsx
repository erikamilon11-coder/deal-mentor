import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send } from "lucide-react";
import EmailTemplateBuilder from "@/components/email/EmailTemplateBuilder";
import BulkCampaignBuilder from "@/components/email/BulkCampaignBuilder";

export default function EmailMarketing() {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Email Marketing Suite
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Design branded templates and send bulk campaigns with real-time tracking
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <EmailTemplateBuilder />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <BulkCampaignBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}