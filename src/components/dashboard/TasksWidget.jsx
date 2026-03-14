import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Clock, Zap, ChevronRight } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";

export default function TasksWidget() {
  const { data: allTasks = [] } = useQuery({
    queryKey: ["allTasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  // Filter open tasks
  const openTasks = allTasks.filter(t => t.status === "Open");
  
  // Categorize tasks
  const overdueTasks = openTasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const todayTasks = openTasks.filter(t => isToday(new Date(t.due_date)));
  const upcomingTasks = openTasks.filter(t => !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  const getLeadName = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    return lead?.property_address?.split(" ")[0] || "Lead";
  };

  const getTaskDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return "Overdue";
    return format(d, "MMM d");
  };

  const displayTasks = [
    ...overdueTasks.slice(0, 1),
    ...todayTasks.slice(0, 2),
    ...upcomingTasks.slice(0, 2)
  ].slice(0, 4);

  return (
    <Card className="p-5 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Tasks</h3>
          {openTasks.length > 0 && (
            <Badge className="bg-slate-900 text-white text-xs">
              {openTasks.length}
            </Badge>
          )}
        </div>
        <Link to={createPageUrl("TaskBoard")}>
          <ChevronRight className="w-5 h-5 text-slate-400 hover:text-slate-600" />
        </Link>
      </div>

      {openTasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No tasks pending</p>
        </div>
      ) : (
        <div className="space-y-2">
          {overdueTasks.length > 0 && !displayTasks.includes(overdueTasks[0]) && (
            <div className="text-xs font-medium text-red-600 px-2 py-1 bg-red-50 rounded-lg">
              {overdueTasks.length} overdue
            </div>
          )}
          
          {displayTasks.map((task) => {
            const isOverdue = isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
            const isDueToday = isToday(new Date(task.due_date));
            
            return (
              <Link
                key={task.id}
                to={createPageUrl(`LeadDetail?id=${task.lead_id}`)}
                className="block"
              >
                <div className={`p-3 rounded-lg border-l-4 transition-colors cursor-pointer ${
                  isOverdue
                    ? "border-l-red-500 bg-red-50 hover:bg-red-100"
                    : isDueToday
                    ? "border-l-amber-500 bg-amber-50 hover:bg-amber-100"
                    : "border-l-blue-500 bg-blue-50 hover:bg-blue-100"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isOverdue ? "text-red-900" : isDueToday ? "text-amber-900" : "text-blue-900"
                      }`}>
                        {task.task_type}
                      </p>
                      <p className={`text-xs truncate ${
                        isOverdue ? "text-red-700" : isDueToday ? "text-amber-700" : "text-blue-700"
                      }`}>
                        {getLeadName(task.lead_id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {task.auto_generated && (
                        <Zap className="w-3 h-3 text-amber-600" title="Auto-generated" />
                      )}
                      <Badge variant="outline" className={`text-xs ${
                        isOverdue
                          ? "bg-red-100 text-red-700 border-red-300"
                          : isDueToday
                          ? "bg-amber-100 text-amber-700 border-amber-300"
                          : "bg-blue-100 text-blue-700 border-blue-300"
                      }`}>
                        {getTaskDate(task.due_date)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {openTasks.length > displayTasks.length && (
            <Link to={createPageUrl("TaskBoard")}>
              <div className="text-center py-2 text-xs text-slate-500 hover:text-slate-700 font-medium">
                +{openTasks.length - displayTasks.length} more tasks
              </div>
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}