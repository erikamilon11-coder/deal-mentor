import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Plus, Check, X, Clock, Zap } from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CalendarSync from "@/components/calendar/CalendarSync";

const TASK_TYPES = ["Follow-up Text", "Call", "Appointment"];

export default function TaskSection({ leadId, tasks, lead, owner }) {
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({
    task_type: "Follow-up Text",
    due_date: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    description: "",
  });

  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, lead_id: leadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", leadId] });
      setShowAdd(false);
      setNewTask({
        task_type: "Follow-up Text",
        due_date: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
        description: "",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", leadId] }),
  });

  const openTasks = tasks?.filter(t => t.status === "Open") || [];
  const doneTasks = tasks?.filter(t => t.status === "Done") || [];

  const getDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return "Overdue";
    return format(d, "MMM d");
  };

  const getDateColor = (date) => {
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return "text-red-600 bg-red-50";
    if (isToday(d)) return "text-amber-600 bg-amber-50";
    return "text-slate-600 bg-slate-100";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-900">Stage 6 — Follow-up Management</p>
        <p className="mt-1 text-xs text-amber-800">
          Set your next task before leaving this lead. Verify due date + channel. Common miss: no follow-up task after a seller reply.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Follow-up Tasks
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendarSync(!showCalendarSync)}
            className="rounded-lg"
          >
            <Calendar className="w-3 h-3 mr-1" />
            {showCalendarSync ? "Hide" : "Schedule"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="text-slate-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Next Step
          </Button>
        </div>
      </div>

      {showCalendarSync && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <CalendarSync lead={lead} owner={owner} />
        </div>
      )}

      {showAdd && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <Select
            value={newTask.task_type}
            onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}
          >
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            className="h-10 rounded-lg"
          />
          <Input
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            className="h-10 rounded-lg"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => addTaskMutation.mutate(newTask)}
              disabled={addTaskMutation.isPending}
              className="bg-slate-900"
            >
              <Check className="w-3 h-3 mr-1" /> Add Task
            </Button>
          </div>
        </div>
      )}

      {openTasks.length === 0 && !showAdd && (
        <p className="text-sm text-slate-500 text-center py-4">No open follow-up tasks. Add your next seller touchpoint now.</p>
      )}

      <div className="space-y-2">
        {openTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3"
          >
            <Checkbox
              checked={task.status === "Done"}
              onCheckedChange={() =>
                updateTaskMutation.mutate({ id: task.id, data: { status: "Done" } })
              }
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{task.task_type}</span>
                {task.auto_generated && (
                  <Zap className="w-3 h-3 text-amber-500" />
                )}
              </div>
              {task.description && (
                <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getDateColor(task.due_date)}`}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {getDateLabel(task.due_date)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {doneTasks.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase mb-2">Completed</p>
          <div className="space-y-2">
            {doneTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="bg-slate-50 rounded-lg p-3 flex items-center gap-3 opacity-60"
              >
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600 line-through">{task.task_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
