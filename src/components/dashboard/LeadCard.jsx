import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors = {
  "New": "bg-blue-100 text-blue-700",
  "Contacted": "bg-amber-100 text-amber-700",
  "Responded": "bg-emerald-100 text-emerald-700",
  "Talking": "bg-purple-100 text-purple-700",
  "Offer Sent": "bg-indigo-100 text-indigo-700",
  "Under Contract": "bg-teal-100 text-teal-700",
  "Closed": "bg-green-100 text-green-700",
  "Dead": "bg-slate-100 text-slate-500",
};

export default function LeadCard({ lead, showFollowup = false }) {
  return (
    <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)}>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all active:scale-[0.98]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={statusColors[lead.status] || "bg-slate-100"}>
                {lead.status}
              </Badge>
              {lead.deal_score && (
                <span className="text-xs font-semibold text-slate-500">
                  Score: {lead.deal_score}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 truncate">
              {lead.property_address}
            </h3>
            <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{lead.city}, {lead.state} {lead.zip_code}</span>
            </div>
            {showFollowup && lead.next_followup_date && (
              <div className="flex items-center gap-1 text-amber-600 text-sm mt-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Follow-up: {format(new Date(lead.next_followup_date), "MMM d")}</span>
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
        </div>
        {lead.distress_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {lead.distress_tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}