import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import TaskQuickAdd from "@/components/calendar/TaskQuickAdd";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => base44.entities.Task.update(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const syncWithGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke("syncTasksToCalendar", {
        force_sync: true,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      console.error("Calendar sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date) => {
    const events = [];

    // Add tasks
    tasks?.forEach(task => {
      if (!task.due_date) return;
      const taskDate = parseISO(task.due_date);
      if (isSameDay(taskDate, date)) {
        const lead = leads?.find(l => l.id === task.lead_id);
        events.push({
          id: task.id,
          type: "task",
          title: task.description || task.task_type,
          time: format(taskDate, "h:mm a"),
          status: task.status,
          taskType: task.task_type,
          lead: lead,
          data: task,
        });
      }
    });

    // Add contract closing dates
    contracts?.forEach(contract => {
      if (!contract.closing_date) return;
      const closingDate = parseISO(contract.closing_date);
      if (isSameDay(closingDate, date)) {
        const lead = leads?.find(l => l.id === contract.lead_id);
        events.push({
          id: contract.id,
          type: "closing",
          title: `Closing: ${lead?.property_address || "Unknown"}`,
          time: "All Day",
          status: contract.status,
          lead: lead,
          data: contract,
        });
      }
    });

    return events.sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleDragStart = (e, event) => {
    e.dataTransfer.setData("eventId", event.id);
    e.dataTransfer.setData("eventType", event.type);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    const eventType = e.dataTransfer.getData("eventType");

    if (eventType === "task") {
      const newDueDate = targetDate.toISOString();
      updateTaskMutation.mutate({
        taskId: eventId,
        updates: { due_date: newDueDate },
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const taskTypeColors = {
    "Follow-up Text": "bg-blue-100 text-blue-700 border-blue-300",
    "Call": "bg-green-100 text-green-700 border-green-300",
    "Appointment": "bg-purple-100 text-purple-700 border-purple-300",
  };

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[140px] text-center">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {format(currentDate, "MMMM yyyy")}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="h-9 w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="ml-2"
              >
                Today
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncWithGoogleCalendar}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync with Google
            </Button>
            <Button
              size="sm"
              onClick={() => setShowQuickAdd(true)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div
                key={day}
                className="p-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const events = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  onDrop={(e) => handleDrop(e, day)}
                  onDragOver={handleDragOver}
                  className={`min-h-[120px] p-2 border-r border-b border-slate-200 dark:border-slate-700 ${
                    index % 7 === 6 ? "border-r-0" : ""
                  } ${
                    Math.floor(index / 7) === Math.floor(calendarDays.length / 7) ? "border-b-0" : ""
                  } ${
                    !isCurrentMonth ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-800"
                  } hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? "bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center"
                          : !isCurrentMonth
                          ? "text-slate-400 dark:text-slate-600"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {events.length > 0 && (
                      <Badge variant="outline" className="text-xs h-5">
                        {events.length}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    {events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        draggable={event.type === "task"}
                        onDragStart={(e) => handleDragStart(e, event)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-sm transition-shadow ${
                          event.type === "task"
                            ? taskTypeColors[event.taskType] || "bg-slate-100 text-slate-700 border-slate-300"
                            : "bg-teal-100 text-teal-700 border-teal-300"
                        } ${event.status === "Done" ? "opacity-50 line-through" : ""}`}
                      >
                        <p className="font-medium truncate">{event.title}</p>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                        +{events.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 items-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Follow-up</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Call</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-teal-100 border border-teal-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Closing</span>
          </div>
        </div>
      </div>

      {/* Selected Date Sheet */}
      <Sheet open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No events scheduled</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDate(null);
                    setShowQuickAdd(true);
                  }}
                  className="mt-4"
                >
                  Add Task
                </Button>
              </div>
            ) : (
              selectedDate &&
              getEventsForDate(selectedDate).map(event => (
                <CalendarEventCard
                  key={event.id}
                  event={event}
                  onViewLead={() => {
                    if (event.lead) {
                      navigate(createPageUrl("LeadDetail") + `?id=${event.lead.id}`);
                    }
                  }}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Add Task Sheet */}
      <Sheet open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <TaskQuickAdd
              leads={leads}
              onComplete={() => {
                setShowQuickAdd(false);
                queryClient.invalidateQueries({ queryKey: ["tasks"] });
              }}
              onCancel={() => setShowQuickAdd(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}