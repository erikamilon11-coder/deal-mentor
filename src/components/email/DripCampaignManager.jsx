import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Play, Pause, Clock, MousePointerClick, Eye, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";

export default function DripCampaignManager({ leadId, owner }) {
  const queryClient = useQueryClient();

  const { data: campaigns } = useQuery({
    queryKey: ["emailCampaigns", leadId],
    queryFn: () => base44.entities.EmailCampaign.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const { data: emailLogs } = useQuery({
    queryKey: ["emailLogs", leadId],
    queryFn: () => base44.entities.EmailLog.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const startCampaignMutation = useMutation({
    mutationFn: async () => {
      const campaign = await base44.entities.EmailCampaign.create({
        lead_id: leadId,
        campaign_name: "New Lead Welcome",
        status: "Active",
        current_sequence: 0,
        started_date: new Date().toISOString(),
        next_send_date: new Date().toISOString(),
      });

      // Trigger first email immediately
      await base44.functions.invoke("sendDripEmail", {
        campaign_id: campaign.id,
      });

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailCampaigns", leadId] });
      queryClient.invalidateQueries({ queryKey: ["emailLogs", leadId] });
    },
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async (campaign) => {
      const newStatus = campaign.status === "Active" ? "Paused" : "Active";
      return base44.entities.EmailCampaign.update(campaign.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailCampaigns", leadId] });
    },
  });

  const activeCampaign = campaigns?.find(c => c.status === "Active" || c.status === "Paused");
  const sortedLogs = emailLogs?.sort((a, b) => new Date(b.sent_date) - new Date(a.sent_date)) || [];

  const stats = {
    sent: sortedLogs.length,
    opened: sortedLogs.filter(log => log.opened).length,
    clicked: sortedLogs.filter(log => log.clicked).length,
    openRate: sortedLogs.length > 0 ? Math.round((sortedLogs.filter(log => log.opened).length / sortedLogs.length) * 100) : 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Email Drip Campaign</h3>
        </div>
        {activeCampaign && (
          <Badge
            variant="outline"
            className={
              activeCampaign.status === "Active"
                ? "bg-green-50 text-green-700 border-green-200"
                : activeCampaign.status === "Paused"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }
          >
            {activeCampaign.status}
          </Badge>
        )}
      </div>

      {!activeCampaign ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Start Automated Follow-ups</h4>
            <p className="text-sm text-slate-600 mb-4">
              Send a series of personalized emails automatically at 1 day, 7 days, and 30 days
            </p>
            {!owner?.email ? (
              <p className="text-xs text-amber-600 mb-3">
                ⚠️ Add owner email first to start campaign
              </p>
            ) : (
              <Button
                onClick={() => startCampaignMutation.mutate()}
                disabled={startCampaignMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {startCampaignMutation.isPending ? "Starting..." : "Start Campaign"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Campaign Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{activeCampaign.campaign_name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Started {format(new Date(activeCampaign.started_date), "MMM d, yyyy")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleCampaignMutation.mutate(activeCampaign)}
                disabled={toggleCampaignMutation.isPending}
                className="h-8"
              >
                {activeCampaign.status === "Active" ? (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </>
                )}
              </Button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600">Progress</span>
                <span className="text-xs font-semibold text-slate-700">
                  Email {activeCampaign.current_sequence} of 4
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${(activeCampaign.current_sequence / 4) * 100}%` }}
                />
              </div>
            </div>

            {activeCampaign.next_send_date && activeCampaign.status === "Active" && (
              <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                Next email: {formatDistanceToNow(new Date(activeCampaign.next_send_date), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Engagement Stats */}
          {sortedLogs.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <Mail className="w-4 h-4 text-blue-600 mb-1" />
                <p className="text-xl font-bold text-blue-900">{stats.sent}</p>
                <p className="text-xs text-blue-600">Sent</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <Eye className="w-4 h-4 text-green-600 mb-1" />
                <p className="text-xl font-bold text-green-900">{stats.opened}</p>
                <p className="text-xs text-green-600">Opened</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                <MousePointerClick className="w-4 h-4 text-purple-600 mb-1" />
                <p className="text-xl font-bold text-purple-900">{stats.clicked}</p>
                <p className="text-xs text-purple-600">Clicked</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                <TrendingUp className="w-4 h-4 text-indigo-600 mb-1" />
                <p className="text-xl font-bold text-indigo-900">{stats.openRate}%</p>
                <p className="text-xs text-indigo-600">Open Rate</p>
              </div>
            </div>
          )}

          {/* Email History */}
          {sortedLogs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Email History</h4>
              <div className="space-y-2">
                {sortedLogs.map((log) => (
                  <div key={log.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{log.subject}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Sent {format(new Date(log.sent_date), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          log.opened
                            ? "bg-green-50 text-green-700 border-green-200 text-xs"
                            : "bg-slate-100 text-slate-600 border-slate-200 text-xs"
                        }
                      >
                        {log.opened ? "Opened" : "Sent"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      {log.opened && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-green-600" />
                          <span>Opened {formatDistanceToNow(new Date(log.opened_date), { addSuffix: true })}</span>
                        </div>
                      )}
                      {log.clicked && (
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3 text-purple-600" />
                          <span>Clicked</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}