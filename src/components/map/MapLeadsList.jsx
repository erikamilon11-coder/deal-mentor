import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronRight } from "lucide-react";

const statusColors = {
  "New": "bg-green-100 text-green-700",
  "Contacted": "bg-blue-100 text-blue-700",
  "Responded": "bg-purple-100 text-purple-700",
  "Talking": "bg-amber-100 text-amber-700",
  "Offer Sent": "bg-orange-100 text-orange-700",
  "Under Contract": "bg-cyan-100 text-cyan-700",
  "Closed": "bg-emerald-100 text-emerald-700",
  "Dead": "bg-slate-100 text-slate-700",
};

export default function MapLeadsList({ leads, title }) {
  const navigate = useNavigate();

  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No leads in this view</p>
        <p className="text-xs mt-1">Pan and zoom the map to explore</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leads.map((lead) => (
          <Card
            key={lead.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(createPageUrl("LeadDetail") + `?id=${lead.id}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                    {lead.property_address}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {[lead.city, lead.state].filter(Boolean).join(", ")}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={statusColors[lead.status]} variant="secondary">
                      {lead.status}
                    </Badge>
                    {lead.deal_score && (
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Score: {lead.deal_score}/10
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}