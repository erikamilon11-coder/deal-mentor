import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Send, MessageSquare, Check, Calendar, MapPin, Edit3, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

const activityIcons = {
  lead_created: MapPin,
  status_changed: Check,
  sms_sent: MessageSquare,
  sms_received: MessageSquare,
  email_sent: Mail,
  call_made: Phone,
  note_added: Edit3,
  contract_created: FileText,
  contract_sent: Send,
  contract_signed: Check,
};

const activityColors = {
  lead_created: "bg-slate-100 text-slate-600",
  status_changed: "bg-blue-100 text-blue-600",
  sms_sent: "bg-green-100 text-green-600",
  sms_received: "bg-green-100 text-green-600",
  email_sent: "bg-purple-100 text-purple-600",
  call_made: "bg-amber-100 text-amber-600",
  note_added: "bg-indigo-100 text-indigo-600",
  contract_created: "bg-cyan-100 text-cyan-600",
  contract_sent: "bg-orange-100 text-orange-600",
  contract_signed: "bg-emerald-100 text-emerald-600",
};

export default function ActivityFeed({ lead, contracts }) {
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", lead?.id],
    queryFn: () => lead?.id ? base44.entities.Message.filter({ lead_id: lead.id }) : Promise.resolve([]),
    enabled: !!lead?.id,
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["emailLogs", lead?.id],
    queryFn: () => lead?.id ? base44.entities.EmailLog.filter({ lead_id: lead.id }) : Promise.resolve([]),
    enabled: !!lead?.id,
  });

  const activities = [];

  // Lead created
  if (lead?.created_date) {
    activities.push({
      type: "lead_created",
      title: "Lead created",
      timestamp: lead.created_date,
      description: `Property at ${lead.property_address} added to pipeline`,
    });
  }

  // Status changes
  if (lead?.last_contact_date || lead?.status) {
    activities.push({
      type: "status_changed",
      title: `Status: ${lead.status || "New"}`,
      timestamp: lead.updated_date || lead.created_date,
      description: lead.status === "New" ? "Lead added to system" : `Lead marked as ${lead.status}`,
    });
  }

  // SMS messages
  messages?.forEach((msg) => {
    if (msg.channel === "SMS") {
      activities.push({
        type: msg.direction === "Outbound" ? "sms_sent" : "sms_received",
        title: msg.direction === "Outbound" ? "SMS sent" : "SMS received",
        timestamp: msg.message_timestamp,
        description: msg.message_text || "(No message content)",
        preview: msg.message_text?.substring(0, 100),
      });
    }
  });

  // Email logs
  emailLogs?.forEach((email) => {
    activities.push({
      type: "email_sent",
      title: `Email: ${email.subject}`,
      timestamp: email.sent_date,
      description: `To: ${email.recipient_email}${email.opened ? " • Opened" : ""}${email.clicked ? " • Clicked" : ""}`,
      preview: email.body?.substring(0, 100),
    });
  });

  // Call logs (SMS channel with call type)
  messages?.forEach((msg) => {
    if (msg.channel === "Call") {
      activities.push({
        type: "call_made",
        title: msg.direction === "Outbound" ? "Call made" : "Call received",
        timestamp: msg.message_timestamp,
        description: msg.direction === "Outbound" ? "Outgoing call" : "Incoming call",
      });
    }
  });

  // Contract events
  contracts?.forEach((contract) => {
    if (contract.created_date) {
      activities.push({
        type: "contract_created",
        title: "Contract generated",
        timestamp: contract.created_date,
        description: `Purchase agreement created for ${contract.purchase_price ? `$${contract.purchase_price.toLocaleString()}` : "property"}`,
      });
    }

    if (contract.sent_date) {
      activities.push({
        type: "contract_sent",
        title: "Contract sent for signature",
        timestamp: contract.sent_date,
        description: `Sent to ${contract.signer_name || contract.signer_email || "recipient"} via DocuSign`,
      });
    }

    if (contract.signed_date) {
      activities.push({
        type: "contract_signed",
        title: "Contract signed",
        timestamp: contract.signed_date,
        description: `Signed by ${contract.signer_name || "recipient"}`,
      });
    }
  });

  // Sort by timestamp descending (newest first)
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No activity yet</p>
        <p className="text-sm text-slate-400 mt-1">Events will appear here as they happen</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || FileText;
        const colorClass = activityColors[activity.type] || "bg-slate-100 text-slate-600";

        return (
          <div
            key={`${activity.type}-${activity.timestamp}-${index}`}
            className="bg-white rounded-xl p-4 border border-slate-200 flex gap-3"
          >
            <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{activity.title}</p>
              <p className="text-sm text-slate-600 mt-0.5">{activity.description}</p>
              {activity.preview && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{activity.preview}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}