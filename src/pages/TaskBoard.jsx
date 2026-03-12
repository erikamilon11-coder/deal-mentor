import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Phone, MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const taskTypeIcons = {
  "Follow-up Text": MessageSquare,
  "Call": Phone,
  "Appointment": Calendar,
};

const columns = [
  { id: "Open", title: "To Do", color: "bg-blue-500" },
  { id: "In Progress", title: "In Progress", color: "bg-amber-500" },
  { id: "Done", title: "Completed", color: "bg-green-500" },
];

export default function TaskBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => 
      base44.entities.Task.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    updateTaskMutation.mutate({
      taskId: draggableId,
      status: newStatus,
    });
  };

  const getLeadInfo = (leadId) => {
    return leads?.find((l) => l.id === leadId);
  };

  const getTasksByStatus = (status) => {
    return tasks?.filter((t) => t.status === status) || [];
  };

  const getDateBadgeStyle = (dueDate) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { className: "bg-red-100 text-red-700", icon: AlertCircle };
    }
    if (isToday(date)) {
      return { className: "bg-amber-100 text-amber-700", icon: Clock };
    }
    return { className: "bg-slate-100 text-slate-600", icon: Calendar };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Task Board</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Drag and drop tasks to update their status
          </p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              
              return (
                <div key={column.id} className="flex flex-col">
                  <div className={`${column.color} text-white rounded-t-xl px-4 py-3`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{column.title}</h2>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`bg-slate-100 dark:bg-slate-800 rounded-b-xl p-3 min-h-[500px] transition-colors ${
                          snapshot.isDraggingOver ? "bg-slate-200 dark:bg-slate-700" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          {columnTasks.map((task, index) => {
                            const lead = getLeadInfo(task.lead_id);
                            const TaskIcon = taskTypeIcons[task.task_type] || CheckCircle2;
                            const dateStyle = getDateBadgeStyle(task.due_date);
                            const DateIcon = dateStyle.icon;

                            return (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-grab active:cursor-grabbing transition-shadow ${
                                      snapshot.isDragging ? "shadow-xl ring-2 ring-blue-400" : ""
                                    }`}
                                    onClick={() => {
                                      if (!snapshot.isDragging && lead) {
                                        navigate(createPageUrl("LeadDetail") + `?id=${lead.id}`);
                                      }
                                    }}
                                  >
                                    <CardContent className="p-4">
                                      <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                          <div className={`${column.color} p-1.5 rounded-lg mt-0.5`}>
                                            <TaskIcon className="w-4 h-4 text-white" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white text-sm">
                                              {task.task_type}
                                            </p>
                                            {task.description && (
                                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                {task.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {lead && (
                                          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                                            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                              {lead.property_address}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                              {[lead.city, lead.state].filter(Boolean).join(", ")}
                                            </p>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                          <Badge className={`${dateStyle.className} text-xs`}>
                                            <DateIcon className="w-3 h-3 mr-1" />
                                            {format(new Date(task.due_date), "MMM d")}
                                          </Badge>
                                          {task.auto_generated && (
                                            <Badge variant="outline" className="text-xs">
                                              Auto
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          
                          {columnTasks.length === 0 && (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p className="text-sm">No tasks</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}