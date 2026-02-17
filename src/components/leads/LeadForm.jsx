import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, MapPin } from "lucide-react";

const LEAD_SOURCES = ["Driving for Dollars", "List", "Referral", "Other"];
const DISTRESS_TAGS = ["Vacant", "Overgrown", "Boarded", "FSBO", "Inherited", "Other"];

export default function LeadForm({ lead, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    property_address: lead?.property_address || "",
    city: lead?.city || "",
    state: lead?.state || "",
    zip_code: lead?.zip_code || "",
    lead_source: lead?.lead_source || "",
    distress_tags: lead?.distress_tags || [],
    notes: lead?.notes || "",
    deal_score: lead?.deal_score || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      deal_score: formData.deal_score ? Number(formData.deal_score) : null,
    });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      distress_tags: prev.distress_tags.includes(tag)
        ? prev.distress_tags.filter(t => t !== tag)
        : [...prev.distress_tags, tag]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="address" className="text-slate-700">Property Address *</Label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="address"
              value={formData.property_address}
              onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
              className="pl-10 h-12 rounded-xl"
              placeholder="123 Main Street"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label className="text-slate-700">City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="City"
            />
          </div>
          <div className="col-span-1">
            <Label className="text-slate-700">State</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="TX"
            />
          </div>
          <div className="col-span-1">
            <Label className="text-slate-700">ZIP</Label>
            <Input
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="12345"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-700">Lead Source</Label>
          <Select
            value={formData.lead_source}
            onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-xl">
              <SelectValue placeholder="How did you find this lead?" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-700">Distress Indicators</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DISTRESS_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.distress_tags.includes(tag)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-slate-700">Deal Score (1-10)</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={formData.deal_score}
            onChange={(e) => setFormData({ ...formData, deal_score: e.target.value })}
            className="mt-1.5 h-12 rounded-xl"
            placeholder="Rate this deal 1-10"
          />
        </div>

        <div>
          <Label className="text-slate-700">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1.5 rounded-xl min-h-[100px]"
            placeholder="Add any notes about this property..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}