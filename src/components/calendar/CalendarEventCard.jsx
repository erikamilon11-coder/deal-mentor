import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Clock, Home } from "lucide-react";

export default function CalendarEventCard({ event, onViewLead }) {
  const typeIcons = {
    task: Clock,
    closing: Home,
  };

  const Icon = typeIcons[event.type] || Clock;

  const statusColors = {
    Open: "bg-blue-100 text-blue-700",
    Done: "bg-green-100 text-green-700",
    Snoozed: "bg-amber-100 text-amber-700",
    Draft: "bg-slate-100 text-slate-700",
    Sent: "bg-indigo-100 text-indigo-700",
    Signed: "bg-green-100 text-green-700",
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          event.type === "closing" ? "bg-teal-100" : "bg-blue-100"
        }`}>
          <Icon className={`w-5 h-5 ${
            event.type === "closing" ? "text-teal-600" : "text-blue-600"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {event.title}
              </h3>
              {event.lead && (
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.lead.property_address}</span>
                </div>
              )}
            </div>
            <Badge className={statusColors[event.status] || "bg-slate-100 text-slate-700"}>
              {event.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{event.time}</span>
            </div>
            {event.taskType && (
              <Badge variant="outline" className="text-xs">
                {event.taskType}
              </Badge>
            )}
          </div>

          {event.lead && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewLead}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Lead Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}