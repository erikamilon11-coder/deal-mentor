import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

export default function TaskQuickAdd({ leads, onComplete, onCancel }) {
  const [taskData, setTaskData] = useState({
    lead_id: "",
    task_type: "Follow-up Text",
    due_date: new Date(),
    description: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      onComplete();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...taskData,
      status: "Open",
      due_date: taskData.due_date.toISOString(),
    });
  };

  const activeLeads = leads?.filter(l => !["Closed", "Dead"].includes(l.status)) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Lead</Label>
        <Select
          value={taskData.lead_id}
          onValueChange={(value) => setTaskData({ ...taskData, lead_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a lead" />
          </SelectTrigger>
          <SelectContent>
            {activeLeads.map(lead => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.property_address} - {lead.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Task Type</Label>
        <Select
          value={taskData.task_type}
          onValueChange={(value) => setTaskData({ ...taskData, task_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Follow-up Text">Follow-up Text</SelectItem>
            <SelectItem value="Call">Call</SelectItem>
            <SelectItem value="Appointment">Appointment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {taskData.due_date ? format(taskData.due_date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={taskData.due_date}
              onSelect={(date) => setTaskData({ ...taskData, due_date: date })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Description (Optional)</Label>
        <Textarea
          value={taskData.description}
          onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
          placeholder="Add notes about this task..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!taskData.lead_id || createTaskMutation.isPending}
          className="flex-1 bg-slate-900 hover:bg-slate-800"
        >
          {createTaskMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </form>
  );
}