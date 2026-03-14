import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Calendar, ChevronRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { getLeadDealStage } from "@/lib/dealStages";

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

const stagePillClasses = "text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full";

export default function LeadCardSelectable({
  lead,
  showFollowup = false,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
}) {
  const dealStage = getLeadDealStage(lead);

  const handleCheckboxChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect(lead.id);
  };

  return (
    <div
      onClick={() => selectionMode && onToggleSelect(lead.id)}
      className={`transition-all ${selectionMode ? "cursor-pointer" : ""}`}
    >
      <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} onClick={(e) => selectionMode && e.preventDefault()}>
        <div
          className={`bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.98] ${
            isSelected
              ? "border-slate-900 bg-slate-50 dark:bg-slate-800"
              : "border-slate-100 hover:shadow-md hover:border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-start justify-between">
            {selectionMode && (
              <div className="mr-3 mt-1">
                <Checkbox
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className={`rounded ${
                    isSelected
                      ? "bg-slate-900 border-slate-900"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusColors[lead.status] || "bg-slate-100"}>
                  {lead.status}
                </Badge>
                <span className={stagePillClasses}>{dealStage}</span>
                {lead.deal_score && (
                  <span className="text-xs font-semibold text-slate-500">
                    Score: {lead.deal_score}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {lead.property_address}
              </h3>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{lead.city}, {lead.state} {lead.zip_code}</span>
              </div>
              {showFollowup && lead.next_followup_date && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm mt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Follow-up: {format(new Date(lead.next_followup_date), "MMM d")}</span>
                </div>
              )}
            </div>
            {!selectionMode && <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />}
            {selectionMode && isSelected && (
              <Check className="w-5 h-5 text-slate-900 dark:text-white flex-shrink-0 ml-2" />
            )}
          </div>
          {lead.distress_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {lead.distress_tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
