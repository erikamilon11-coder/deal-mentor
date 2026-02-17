import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, Send, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const channelIcons = {
  SMS: MessageSquare,
  Call: Phone,
  Email: Mail,
};

const channelColors = {
  SMS: "bg-blue-100 text-blue-700",
  Call: "bg-green-100 text-green-700",
  Email: "bg-purple-100 text-purple-700",
};

export default function MessageSection({ leadId, messages, onMessageSent }) {
  const [newMessage, setNewMessage] = useState("");
  const [channel, setChannel] = useState("SMS");
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const message = await base44.entities.Message.create(data);
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", leadId] });
      setNewMessage("");
      if (onMessageSent) onMessageSent();
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({
      lead_id: leadId,
      direction: "Outbound",
      channel,
      message_text: newMessage,
      message_timestamp: new Date().toISOString(),
    });
  };

  const sortedMessages = [...(messages || [])].sort(
    (a, b) => new Date(b.message_timestamp) - new Date(a.message_timestamp)
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Conversation
      </h3>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          {["SMS", "Call", "Email"].map((ch) => {
            const Icon = channelIcons[ch];
            return (
              <Button
                key={ch}
                variant={channel === ch ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel(ch)}
                className={`flex-1 ${channel === ch ? "bg-slate-900" : ""}`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {ch}
              </Button>
            );
          })}
        </div>
        <Textarea
          placeholder={`Log ${channel} message...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="min-h-[80px] rounded-lg resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessageMutation.isPending}
          className="w-full bg-slate-900 hover:bg-slate-800"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendMessageMutation.isPending ? "Sending..." : `Log ${channel}`}
        </Button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {sortedMessages.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">No messages yet</p>
        )}
        {sortedMessages.map((msg) => {
          const Icon = channelIcons[msg.channel];
          const isOutbound = msg.direction === "Outbound";
          return (
            <div
              key={msg.id}
              className={`rounded-xl p-4 ${
                isOutbound ? "bg-slate-900 text-white ml-8" : "bg-white border border-slate-200 mr-8"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${channelColors[msg.channel]} text-xs`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {msg.channel}
                </Badge>
                {isOutbound ? (
                  <ArrowUp className="w-3 h-3 text-slate-400" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-emerald-500" />
                )}
                <span className={`text-xs ${isOutbound ? "text-slate-400" : "text-slate-500"}`}>
                  {format(new Date(msg.message_timestamp), "MMM d, h:mm a")}
                </span>
              </div>
              <p className={`text-sm ${isOutbound ? "text-slate-100" : "text-slate-700"}`}>
                {msg.message_text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}