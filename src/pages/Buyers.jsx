import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Loader2,
  X,
  Save,
  ChevronRight,
} from "lucide-react";

export default function Buyers() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [formData, setFormData] = useState({
    buyer_name: "",
    phone: "",
    email: "",
    buying_areas: [],
    buying_criteria: "",
    notes: "",
  });
  const [newArea, setNewArea] = useState("");

  const queryClient = useQueryClient();

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["buyers"],
    queryFn: () => base44.entities.Buyer.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Buyer.create(data),
    onMutate: async (newBuyer) => {
      await queryClient.cancelQueries({ queryKey: ["buyers"] });
      const previousBuyers = queryClient.getQueryData(["buyers"]);
      queryClient.setQueryData(["buyers"], (old) => [{ ...newBuyer, id: "temp-" + Date.now() }, ...(old || [])]);
      return { previousBuyers };
    },
    onError: (err, newBuyer, context) => {
      queryClient.setQueryData(["buyers"], context.previousBuyers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
      setShowAdd(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Buyer.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["buyers"] });
      const previousBuyers = queryClient.getQueryData(["buyers"]);
      queryClient.setQueryData(["buyers"], (old) =>
        old?.map((buyer) => (buyer.id === id ? { ...buyer, ...data } : buyer))
      );
      return { previousBuyers };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["buyers"], context.previousBuyers);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
      setSelectedBuyer(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      buyer_name: "",
      phone: "",
      email: "",
      buying_areas: [],
      buying_criteria: "",
      notes: "",
    });
    setNewArea("");
  };

  const handleEdit = (buyer) => {
    setFormData({
      buyer_name: buyer.buyer_name || "",
      phone: buyer.phone || "",
      email: buyer.email || "",
      buying_areas: buyer.buying_areas || [],
      buying_criteria: buyer.buying_criteria || "",
      notes: buyer.notes || "",
    });
    setSelectedBuyer(buyer);
  };

  const addArea = () => {
    if (newArea.trim() && !formData.buying_areas.includes(newArea.trim())) {
      setFormData({
        ...formData,
        buying_areas: [...formData.buying_areas, newArea.trim()],
      });
      setNewArea("");
    }
  };

  const removeArea = (area) => {
    setFormData({
      ...formData,
      buying_areas: formData.buying_areas.filter((a) => a !== area),
    });
  };

  const handleSubmit = () => {
    if (selectedBuyer) {
      updateMutation.mutate({ id: selectedBuyer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredBuyers = buyers?.filter(
    (buyer) =>
      buyer.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      buyer.buying_areas?.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const BuyerForm = () => (
    <div className="space-y-4 mt-4">
      <div>
        <Label className="text-slate-700">Name *</Label>
        <Input
          value={formData.buyer_name}
          onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
          className="mt-1.5 h-12 rounded-xl"
          placeholder="Buyer name"
        />
      </div>
      <div>
        <Label className="text-slate-700">Phone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1.5 h-12 rounded-xl"
          placeholder="(555) 123-4567"
        />
      </div>
      <div>
        <Label className="text-slate-700">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1.5 h-12 rounded-xl"
          placeholder="buyer@email.com"
        />
      </div>
      <div>
        <Label className="text-slate-700">Buying Areas</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArea())}
            className="h-10 rounded-xl"
            placeholder="Add city or zip..."
          />
          <Button type="button" onClick={addArea} size="icon" className="h-10 w-10 rounded-xl">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.buying_areas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.buying_areas.map((area) => (
              <Badge key={area} variant="secondary" className="flex items-center gap-1">
                {area}
                <button onClick={() => removeArea(area)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label className="text-slate-700">Buying Criteria</Label>
        <Textarea
          value={formData.buying_criteria}
          onChange={(e) => setFormData({ ...formData, buying_criteria: e.target.value })}
          className="mt-1.5 rounded-xl min-h-[80px]"
          placeholder="SFR, under $200k ARV, needs work..."
        />
      </div>
      <div>
        <Label className="text-slate-700">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1.5 rounded-xl min-h-[80px]"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-xl"
          onClick={() => {
            setShowAdd(false);
            setSelectedBuyer(null);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
          onClick={handleSubmit}
          disabled={!formData.buyer_name || createMutation.isPending || updateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {selectedBuyer ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 pb-24" style={{ paddingTop: "env(safe-area-inset-top, 1.5rem)" }}>
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buyers List</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{buyers?.length || 0} buyers</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or area..."
            className="pl-10 h-12 rounded-xl bg-white"
          />
        </div>

        {/* Buyers List */}
        <div className="space-y-3">
          {filteredBuyers.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No buyers yet</p>
              <p className="text-sm text-slate-400 mt-1">Add your first buyer to get started</p>
            </div>
          )}
          {filteredBuyers.map((buyer) => (
            <div
              key={buyer.id}
              onClick={() => handleEdit(buyer)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{buyer.buyer_name}</h3>
                  <div className="space-y-1 mt-2">
                    {buyer.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{buyer.phone}</span>
                      </div>
                    )}
                    {buyer.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{buyer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
              {buyer.buying_areas?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {buyer.buying_areas.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}>
          <div className="max-w-lg mx-auto">
            <Button
              onClick={() => {
                resetForm();
                setShowAdd(true);
              }}
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-lg font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Buyer
            </Button>
          </div>
        </div>

        {/* Add/Edit Sheet */}
        <Sheet
          open={showAdd || !!selectedBuyer}
          onOpenChange={(open) => {
            if (!open) {
              setShowAdd(false);
              setSelectedBuyer(null);
              resetForm();
            }
          }}
        >
          <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedBuyer ? "Edit Buyer" : "Add Buyer"}</SheetTitle>
            </SheetHeader>
            <BuyerForm />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}