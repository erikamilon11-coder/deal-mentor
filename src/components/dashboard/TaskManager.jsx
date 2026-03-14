import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Calendar, Home, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function TaskManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("open");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const leadsMap = useMemo(() => {
    return leads.reduce((acc, lead) => {
      acc[lead.id] = lead;
      return acc;
    }, {});
  }, [leads]);

  const completeMutation = useMutation({
    mutationFn: (taskId) =>
      base44.entities.Task.update(taskId, { status: "Done" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task marked as complete!");
    },
    onError: () => toast.error("Failed to update task"),
  });

  const snoozeTaskMutation = useMutation({
    mutationFn: (taskId) => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);
      return base44.entities.Task.update(taskId, {
        due_date: newDate.toISOString(),
        status: "Snoozed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task snoozed for 2 days");
    },
    onError: () => toast.error("Failed to snooze task"),
  });

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filter === "open") {
      filtered = tasks.filter((t) => t.status === "Open");
    } else if (filter === "snoozed") {
      filtered = tasks.filter((t) => t.status === "Snoozed");
    } else if (filter === "completed") {
      filtered = tasks.filter((t) => t.status === "Done");
    }

    // Sort by due date
    return filtered.sort(
      (a, b) => new Date(a.due_date) - new Date(b.due_date)
    );
  }, [tasks, filter]);

  // Calculate stats
  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === "Open").length,
    overdue: tasks.filter(
      (t) => t.status === "Open" && new Date(t.due_date) < new Date()
    ).length,
    completed: tasks.filter((t) => t.status === "Done").length,
  };

  const getTaskIcon = (taskType) => {
    switch (taskType) {
      case "Call":
        return <Phone className="w-4 h-4" />;
      case "Follow-up Text":
        return <MessageSquare className="w-4 h-4" />;
      case "Appointment":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
              <p className="text-xs text-slate-600 mt-1">Open Tasks</p>
            </div>
          </CardContent>
        </Card>

        {stats.overdue > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-red-700 mt-1">Overdue</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-slate-600 mt-1">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-600 mt-1">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["open", "snoozed", "completed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize whitespace-nowrap"
          >
            {f === "open" ? `Open (${stats.open})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const lead = leadsMap[task.lead_id];
            const overdue = isOverdue(task.due_date);

            return (
              <Card
                key={task.id}
                className={`${
                  overdue && task.status === "Open"
                    ? "border-red-200 bg-red-50"
                    : task.status === "Done"
                    ? "bg-slate-50"
                    : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={
                        task.status === "Done" ||
                        completeMutation.isPending
                      }
                      className="flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
                    >
                      {task.status === "Done" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTaskIcon(task.task_type)}
                        <h4 className={`font-medium text-sm ${
                          task.status === "Done"
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}>
                          {task.task_type}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        {lead?.property_address || "Unknown"}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-500">{task.description}</p>
                      )}
                    </div>

                    {/* Due Date & Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs whitespace-nowrap ${
                          overdue && task.status === "Open"
                            ? "bg-red-100 text-red-700 border-red-300"
                            : ""
                        }`}
                      >
                        {formatDate(task.due_date)}
                      </Badge>

                      {task.status === "Open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => snoozeTaskMutation.mutate(task.id)}
                          disabled={snoozeTaskMutation.isPending}
                          className="text-xs h-7 px-2"
                        >
                          {snoozeTaskMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Snooze"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-slate-500 text-sm">
                {filter === "open"
                  ? "No open tasks. Great work!"
                  : `No ${filter} tasks`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}