import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CallLogger({ leadId, owner }) {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState(owner?.phone_number || "");
  const [isDialing, setIsDialing] = useState(false);

  const { data: callMessages = [] } = useQuery({
    queryKey: ["messages", leadId],
    queryFn: () => base44.entities.Message.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      if (!phoneNumber.match(/^\+?1?\d{10,14}$/)) {
        throw new Error("Invalid phone number format");
      }
      const response = await base44.functions.invoke("initiateCall", {
        lead_id: leadId,
        phone_number: phoneNumber,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Call initiated!");
      setIsDialing(false);
      setPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ["messages", leadId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate call");
      setIsDialing(false);
    },
  });

  const callLogs = callMessages
    ?.filter(m => m.channel === "Call")
    ?.sort((a, b) => new Date(b.message_timestamp) - new Date(a.message_timestamp)) || [];

  return (
    <div className="space-y-4">
      {/* Dial Pad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Initiate Call
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-900">Seller call prep</p>
            <p className="mt-1 text-xs text-blue-800">
              Confirm seller motivation, timeline, and expected price. End every call by setting a follow-up task.
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-2 block">Phone Number</label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={initiateCallMutation.isPending}
            />
          </div>
          <Button
            onClick={() => initiateCallMutation.mutate()}
            disabled={initiateCallMutation.isPending || !phoneNumber}
            className="w-full gap-2"
          >
            {initiateCallMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Start Call
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Call History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call History</CardTitle>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No calls yet</p>
          ) : (
            <div className="space-y-3">
              {callLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0"
                >
                  <div className="mt-1">
                    {log.direction === "Outbound" ? (
                      <Phone className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Phone className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={log.direction === "Outbound" ? "outline" : "default"} className="text-xs">
                        {log.direction}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(log.message_timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 break-words">{log.message_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
