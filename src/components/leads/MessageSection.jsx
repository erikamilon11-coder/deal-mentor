import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, Send, ArrowDown, ArrowUp, Zap, FileText } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import EmailComposer from "./EmailComposer";
import SMSAutomation from "@/components/sms/SMSAutomation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

export default function MessageSection({ leadId, messages, onMessageSent, lead, owner }) {
  const [newMessage, setNewMessage] = useState("");
  const [channel, setChannel] = useState("SMS");
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: () => base44.entities.SMSTemplate.list('-is_favorite', 50),
  });

  const updateTemplateUsageMutation = useMutation({
    mutationFn: ({ id, usage_count }) => 
      base44.entities.SMSTemplate.update(id, { usage_count: usage_count + 1 }),
  });

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

  const handleUseTemplate = (template) => {
    let text = template.message_text;
    
    // Replace placeholders
    if (lead?.property_address) {
      text = text.replace(/\{property_address\}/g, lead.property_address);
    }
    if (owner?.owner_name) {
      text = text.replace(/\{owner_name\}/g, owner.owner_name);
    }
    
    setNewMessage(text);
    setShowTemplates(false);
    
    // Update usage count
    updateTemplateUsageMutation.mutate({
      id: template.id,
      usage_count: template.usage_count || 0
    });
  };

  const sortedMessages = [...(messages || [])].sort(
    (a, b) => new Date(b.message_timestamp) - new Date(a.message_timestamp)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Communication
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAutomations(!showAutomations)}
            className="rounded-lg"
          >
            <Zap className="w-3 h-3 mr-1" />
            {showAutomations ? "Hide" : "SMS Auto"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailComposer(!showEmailComposer)}
            className="rounded-lg"
          >
            <Mail className="w-3 h-3 mr-1" />
            {showEmailComposer ? "Quick Log" : "Send Email"}
          </Button>
        </div>
      </div>

      {showAutomations && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <SMSAutomation />
        </div>
      )}

      {showEmailComposer ? (
        <EmailComposer
          lead={lead}
          owner={owner}
          onEmailSent={() => {
            setShowEmailComposer(false);
            if (onMessageSent) onMessageSent();
            queryClient.invalidateQueries({ queryKey: ["messages", leadId] });
          }}
          onCancel={() => setShowEmailComposer(false)}
        />
      ) : (
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
          <div className="relative">
            <Textarea
              placeholder={`Log ${channel} message...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[80px] rounded-lg resize-none pr-10"
            />
            {channel === "SMS" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTemplates(true)}
                className="absolute top-2 right-2 h-8 w-8 text-slate-500 hover:text-slate-700"
                title="Use Template"
              >
                <FileText className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="w-full bg-slate-900 hover:bg-slate-800"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMessageMutation.isPending ? "Sending..." : `Log ${channel}`}
          </Button>
        </div>
      )}

      <Sheet open={showTemplates} onOpenChange={setShowTemplates}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>SMS Templates</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                <p>No templates saved yet</p>
                <p className="text-xs mt-1">Create templates in Settings</p>
              </div>
            ) : (
              templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                    <Badge className="text-xs bg-blue-100 text-blue-700">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {template.message_text}
                  </p>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

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