import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, DollarSign, FileText, CheckCircle2, Circle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const DEFAULT_CHECKLIST_ITEMS = [
  {
    category: "Title Company",
    icon: FileText,
    color: "blue",
    tasks: [
      { name: "Contact title company", description: "Initiate title search and coordination" },
      { name: "Submit purchase agreement", description: "Provide signed contract to title company" },
      { name: "Review title commitment", description: "Check for liens or encumbrances" },
      { name: "Schedule closing date", description: "Coordinate with all parties" },
    ],
  },
  {
    category: "Earnest Money",
    icon: DollarSign,
    color: "green",
    tasks: [
      { name: "Deposit earnest money", description: "Submit to escrow account" },
      { name: "Obtain deposit receipt", description: "Get proof of earnest money deposit" },
      { name: "Track refund deadline", description: "Note inspection contingency dates" },
    ],
  },
  {
    category: "Inspections",
    icon: ClipboardCheck,
    color: "amber",
    tasks: [
      { name: "Schedule property inspection", description: "Arrange within inspection period" },
      { name: "Review inspection report", description: "Identify any issues or repairs needed" },
      { name: "Negotiate repairs if needed", description: "Submit repair requests or price adjustments" },
      { name: "Final walkthrough", description: "Verify property condition before closing" },
    ],
  },
  {
    category: "Documentation",
    icon: FileText,
    color: "purple",
    tasks: [
      { name: "Gather closing documents", description: "Collect all required paperwork" },
      { name: "Review closing disclosure", description: "Verify all numbers and terms" },
      { name: "Prepare assignment contract", description: "If wholesaling to end buyer" },
      { name: "Wire transfer instructions", description: "Obtain secure wiring details" },
    ],
  },
];

export default function ClosingChecklist({ leadId, contract }) {
  const [checklistTasks, setChecklistTasks] = useState({});
  const queryClient = useQueryClient();

  const generateChecklistMutation = useMutation({
    mutationFn: async () => {
      const tasksToCreate = [];
      const now = new Date();

      DEFAULT_CHECKLIST_ITEMS.forEach((category, categoryIndex) => {
        category.tasks.forEach((task, taskIndex) => {
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + (categoryIndex * 7) + taskIndex);

          tasksToCreate.push({
            lead_id: leadId,
            task_type: "Follow-up Text",
            description: `[${category.category}] ${task.name}: ${task.description}`,
            due_date: dueDate.toISOString(),
            status: "Open",
            auto_generated: true,
          });
        });
      });

      await base44.entities.Task.bulkCreate(tasksToCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", leadId] });
    },
  });

  const toggleTask = (categoryIndex, taskIndex) => {
    const key = `${categoryIndex}-${taskIndex}`;
    setChecklistTasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const completedCount = Object.values(checklistTasks).filter(Boolean).length;
  const totalCount = DEFAULT_CHECKLIST_ITEMS.reduce((sum, cat) => sum + cat.tasks.length, 0);
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Closing Checklist
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {completedCount} of {totalCount} tasks completed
          </p>
        </div>
        <Badge
          variant="outline"
          className={`${
            progress === 100
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {progress}% Complete
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Generate Tasks Button */}
      {!generateChecklistMutation.isSuccess && (
        <Button
          onClick={() => generateChecklistMutation.mutate()}
          disabled={generateChecklistMutation.isPending}
          className="w-full bg-slate-900 hover:bg-slate-800 h-11 rounded-xl"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {generateChecklistMutation.isPending
            ? "Generating Tasks..."
            : "Generate Checklist Tasks"}
        </Button>
      )}

      {generateChecklistMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700 font-medium">
            Checklist tasks created successfully! Check the Tasks tab.
          </p>
        </div>
      )}

      {/* Checklist Categories */}
      <div className="space-y-4">
        {DEFAULT_CHECKLIST_ITEMS.map((category, categoryIndex) => {
          const CategoryIcon = category.icon;
          const categoryCompleted = category.tasks.filter(
            (_, taskIndex) => checklistTasks[`${categoryIndex}-${taskIndex}`]
          ).length;

          return (
            <div
              key={categoryIndex}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg bg-${category.color}-100 flex items-center justify-center`}
                  >
                    <CategoryIcon className={`w-4 h-4 text-${category.color}-600`} />
                  </div>
                  <h4 className="font-semibold text-slate-900">{category.category}</h4>
                </div>
                <span className="text-xs text-slate-500">
                  {categoryCompleted}/{category.tasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {category.tasks.map((task, taskIndex) => {
                  const isChecked = checklistTasks[`${categoryIndex}-${taskIndex}`];
                  return (
                    <div
                      key={taskIndex}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        isChecked ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <Checkbox
                        id={`task-${categoryIndex}-${taskIndex}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleTask(categoryIndex, taskIndex)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`task-${categoryIndex}-${taskIndex}`}
                          className={`text-sm font-medium cursor-pointer ${
                            isChecked
                              ? "line-through text-slate-400"
                              : "text-slate-700"
                          }`}
                        >
                          {task.name}
                        </Label>
                        <p
                          className={`text-xs mt-0.5 ${
                            isChecked ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="font-semibold text-green-900 text-lg">All Set for Closing!</h4>
          <p className="text-sm text-green-700 mt-1">
            You've completed all checklist items. Ready to close the deal!
          </p>
        </div>
      )}
    </div>
  );
}