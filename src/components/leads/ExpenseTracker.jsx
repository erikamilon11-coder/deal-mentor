import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Trash2, X, Check } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const EXPENSE_TYPES = [
  "Marketing",
  "Inspection",
  "Appraisal",
  "Title Search",
  "Legal",
  "Closing",
  "Repair Estimate",
  "Other"
];

const expenseColors = {
  Marketing: "bg-blue-100 text-blue-700",
  Inspection: "bg-amber-100 text-amber-700",
  Appraisal: "bg-purple-100 text-purple-700",
  "Title Search": "bg-cyan-100 text-cyan-700",
  Legal: "bg-indigo-100 text-indigo-700",
  Closing: "bg-emerald-100 text-emerald-700",
  "Repair Estimate": "bg-orange-100 text-orange-700",
  Other: "bg-slate-100 text-slate-700",
};

export default function ExpenseTracker({ leadId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_type: "Marketing",
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", leadId],
    queryFn: () => base44.entities.Expense.filter({ lead_id: leadId }),
    enabled: !!leadId,
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Expense.create({
        ...data,
        lead_id: leadId,
        amount: Number(data.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", leadId] });
      setShowAdd(false);
      setNewExpense({
        expense_type: "Marketing",
        amount: "",
        description: "",
        expense_date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", leadId] }),
  });

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const formatCurrency = (value) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Expenses</h3>
          {totalExpenses > 0 && (
            <Badge className="bg-slate-900 text-white text-xs">
              {formatCurrency(totalExpenses)}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="text-slate-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {showAdd && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-700 text-sm">Type</Label>
              <Select
                value={newExpense.expense_type}
                onValueChange={(v) =>
                  setNewExpense({ ...newExpense, expense_type: v })
                }
              >
                <SelectTrigger className="mt-1 h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 text-sm">Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  placeholder="0"
                  className="pl-10 h-10 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Date</Label>
            <Input
              type="date"
              value={newExpense.expense_date}
              onChange={(e) =>
                setNewExpense({ ...newExpense, expense_date: e.target.value })
              }
              className="mt-1 h-10 rounded-lg"
            />
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Description (optional)</Label>
            <Input
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
              placeholder="e.g., Facebook ads campaign"
              className="mt-1 h-10 rounded-lg"
            />
          </div>

          <div>
            <Label className="text-slate-700 text-sm">Notes (optional)</Label>
            <Textarea
              value={newExpense.notes}
              onChange={(e) =>
                setNewExpense({ ...newExpense, notes: e.target.value })
              }
              placeholder="Additional details..."
              rows={2}
              className="mt-1 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(false)}
            >
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => addExpenseMutation.mutate(newExpense)}
              disabled={!newExpense.amount || addExpenseMutation.isPending}
              className="bg-slate-900"
            >
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {expenses.length === 0 && !showAdd && (
        <p className="text-sm text-slate-500 text-center py-4">No expenses logged</p>
      )}

      <div className="space-y-2">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-3"
          >
            <div
              className={`w-10 h-10 rounded-lg ${expenseColors[expense.expense_type]} flex items-center justify-center flex-shrink-0 font-semibold text-sm`}
            >
              {expense.expense_type[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">
                  {expense.expense_type}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              {expense.description && (
                <p className="text-sm text-slate-600 mt-0.5">{expense.description}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(expense.expense_date), "MMM d, yyyy")}
              </p>
            </div>
            <button
              onClick={() => deleteExpenseMutation.mutate(expense.id)}
              disabled={deleteExpenseMutation.isPending}
              className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}