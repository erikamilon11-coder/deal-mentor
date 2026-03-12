import { FileText, Send, CheckCircle, Calendar, User, MapPin } from "lucide-react";
import { format } from "date-fns";

const activityIcons = {
  contract_created: FileText,
  contract_sent: Send,
  contract_signed: CheckCircle,
  lead_created: MapPin,
  status_changed: Calendar,
};

const activityColors = {
  contract_created: "bg-blue-100 text-blue-600",
  contract_sent: "bg-amber-100 text-amber-600",
  contract_signed: "bg-green-100 text-green-600",
  lead_created: "bg-slate-100 text-slate-600",
  status_changed: "bg-purple-100 text-purple-600",
};

export default function ActivityFeed({ lead, contracts }) {
  const activities = [];

  // Lead created
  if (lead.created_date) {
    activities.push({
      type: "lead_created",
      title: "Lead created",
      timestamp: lead.created_date,
      description: `Property at ${lead.property_address} added to pipeline`,
    });
  }

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