import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export default function InvestmentCriteriaManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    target_roi_percentage: 20,
    repair_cost_percentage: 15,
    holding_cost_months: 6,
    assignment_fee_target: 5000,
    closing_cost_percentage: 2,
    max_offer_discount: 30,
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ["investmentCriteria"],
    queryFn: () => base44.entities.InvestmentCriteria.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InvestmentCriteria.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentCriteria"] });
      toast.success("Criteria saved!");
      resetForm();
    },
    onError: () => toast.error("Failed to save criteria"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.InvestmentCriteria.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentCriteria"] });
      toast.success("Criteria updated!");
      resetForm();
    },
    onError: () => toast.error("Failed to update criteria"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InvestmentCriteria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentCriteria"] });
      toast.success("Criteria deleted!");
    },
    onError: () => toast.error("Failed to delete criteria"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id) => {
      // Unset all defaults
      const updates = criteria.map(c => 
        base44.entities.InvestmentCriteria.update(c.id, { is_default: c.id === id })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investmentCriteria"] });
      toast.success("Default criteria set!");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      target_roi_percentage: 20,
      repair_cost_percentage: 15,
      holding_cost_months: 6,
      assignment_fee_target: 5000,
      closing_cost_percentage: 2,
      max_offer_discount: 30,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Please enter a name");
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (crit) => {
    setFormData(crit);
    setEditingId(crit.id);
    setShowForm(true);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Investment Criteria
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Investment Criteria</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {showForm ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Conservative, Aggressive"
                  />
                </div>

                <div>
                  <Label>Target ROI (%)</Label>
                  <Input
                    type="number"
                    value={formData.target_roi_percentage}
                    onChange={(e) => setFormData({ ...formData, target_roi_percentage: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Repair Costs (% of ARV)</Label>
                  <Input
                    type="number"
                    value={formData.repair_cost_percentage}
                    onChange={(e) => setFormData({ ...formData, repair_cost_percentage: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Holding Period (months)</Label>
                  <Input
                    type="number"
                    value={formData.holding_cost_months}
                    onChange={(e) => setFormData({ ...formData, holding_cost_months: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Assignment Fee Target ($)</Label>
                  <Input
                    type="number"
                    value={formData.assignment_fee_target}
                    onChange={(e) => setFormData({ ...formData, assignment_fee_target: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Closing Costs (% of price)</Label>
                  <Input
                    type="number"
                    value={formData.closing_cost_percentage}
                    onChange={(e) => setFormData({ ...formData, closing_cost_percentage: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Max Discount from ARV (%)</Label>
                  <Input
                    type="number"
                    value={formData.max_offer_discount}
                    onChange={(e) => setFormData({ ...formData, max_offer_discount: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                New Criteria
              </Button>

              {criteria.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No criteria yet. Create your first investment profile.
                </div>
              ) : (
                criteria.map((crit) => (
                  <Card key={crit.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{crit.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {crit.target_roi_percentage}% ROI • {crit.repair_cost_percentage}% repairs
                            </p>
                          </div>
                          {crit.is_default && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t">
                          <div>
                            <span className="text-slate-500">Max Discount:</span>
                            <p className="font-medium text-slate-900">{crit.max_offer_discount}%</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Assign Fee:</span>
                            <p className="font-medium text-slate-900">${crit.assignment_fee_target}</p>
                          </div>
                        </div>

                        <div className="flex gap-1 pt-2">
                          {!crit.is_default && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDefaultMutation.mutate(crit.id)}
                              disabled={setDefaultMutation.isPending}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(crit)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(crit.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}