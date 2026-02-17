import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MapPin } from "lucide-react";

const STAGES = [
  { id: "New", color: "bg-blue-500", lightColor: "bg-blue-50" },
  { id: "Contacted", color: "bg-amber-500", lightColor: "bg-amber-50" },
  { id: "Responded", color: "bg-emerald-500", lightColor: "bg-emerald-50" },
  { id: "Talking", color: "bg-purple-500", lightColor: "bg-purple-50" },
  { id: "Offer Sent", color: "bg-indigo-500", lightColor: "bg-indigo-50" },
  { id: "Under Contract", color: "bg-teal-500", lightColor: "bg-teal-50" },
];

export default function PipelineView({ leads }) {
  const getLeadsByStage = (stage) => leads?.filter(l => l.status === stage) || [];

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="font-semibold text-slate-700">{stage.id}</span>
                <Badge variant="secondary" className="ml-auto">
                  {stageLeads.length}
                </Badge>
              </div>
              <div className={`${stage.lightColor} rounded-2xl p-3 min-h-[200px] space-y-2`}>
                {stageLeads.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No leads</p>
                )}
                {stageLeads.map((lead) => (
                  <Link key={lead.id} to={createPageUrl(`LeadDetail?id=${lead.id}`)}>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {lead.property_address}
                      </p>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{lead.city}, {lead.state}</span>
                      </div>
                      {lead.distress_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lead.distress_tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}