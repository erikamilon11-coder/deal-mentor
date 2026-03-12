import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Save, MapPin, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LEAD_SOURCES = ["Driving for Dollars", "List", "Referral", "Other"];
const DISTRESS_TAGS = ["Vacant", "Overgrown", "Boarded", "FSBO", "Inherited", "Other"];

export default function LeadForm({ lead, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    property_address: lead?.property_address || "",
    city: lead?.city || "",
    state: lead?.state || "",
    zip_code: lead?.zip_code || "",
    latitude: lead?.latitude || "",
    longitude: lead?.longitude || "",
    lead_source: lead?.lead_source || "",
    distress_tags: lead?.distress_tags || [],
    notes: lead?.notes || "",
    deal_score: lead?.deal_score || "",
  });

  const [enrichmentData, setEnrichmentData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      deal_score: formData.deal_score ? Number(formData.deal_score) : null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      enrichmentData: enrichmentData,
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

  const fetchPropertyData = async () => {
    if (!formData.property_address || !formData.city || !formData.state) {
      setEnrichmentError("Please enter property address, city, and state first");
      return;
    }

    setIsEnriching(true);
    setEnrichmentError(null);

    try {
      const fullAddress = `${formData.property_address}, ${formData.city}, ${formData.state}${formData.zip_code ? ' ' + formData.zip_code : ''}`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find detailed public property records for: ${fullAddress}. Return ONLY the data in the exact JSON format specified, with null for any unavailable fields.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tax_assessed_value: { type: "number" },
            estimated_value: { type: "number" },
            last_sale_price: { type: "number" },
            last_sale_date: { type: "string" },
            year_built: { type: "number" },
            square_footage: { type: "number" },
            bedrooms: { type: "number" },
            bathrooms: { type: "number" },
            lot_size: { type: "number" },
            property_type: { type: "string" }
          }
        }
      });

      setEnrichmentData(result);
      
      // Auto-populate zip if found
      if (result.zip_code && !formData.zip_code) {
        setFormData(prev => ({ ...prev, zip_code: result.zip_code }));
      }
    } catch (error) {
      setEnrichmentError(error.message || "Failed to fetch property data");
    } finally {
      setIsEnriching(false);
    }
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

        {/* Property Enrichment */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Auto-Fetch Property Details</h4>
            </div>
            <Button
              type="button"
              onClick={fetchPropertyData}
              disabled={isEnriching || !formData.property_address || !formData.city || !formData.state}
              variant="outline"
              size="sm"
              className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Fetch Data
                </>
              )}
            </Button>
          </div>

          {enrichmentError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {enrichmentError}
            </p>
          )}

          {enrichmentData && (
            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">Property data found</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {enrichmentData.tax_assessed_value && (
                  <div>
                    <span className="text-slate-500">Tax Assessment:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      ${enrichmentData.tax_assessed_value.toLocaleString()}
                    </span>
                  </div>
                )}
                {enrichmentData.estimated_value && (
                  <div>
                    <span className="text-slate-500">Est. Value:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      ${enrichmentData.estimated_value.toLocaleString()}
                    </span>
                  </div>
                )}
                {enrichmentData.square_footage && (
                  <div>
                    <span className="text-slate-500">Sq Ft:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {enrichmentData.square_footage.toLocaleString()}
                    </span>
                  </div>
                )}
                {enrichmentData.year_built && (
                  <div>
                    <span className="text-slate-500">Year Built:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {enrichmentData.year_built}
                    </span>
                  </div>
                )}
                {enrichmentData.bedrooms && (
                  <div>
                    <span className="text-slate-500">Beds:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {enrichmentData.bedrooms}
                    </span>
                  </div>
                )}
                {enrichmentData.bathrooms && (
                  <div>
                    <span className="text-slate-500">Baths:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {enrichmentData.bathrooms}
                    </span>
                  </div>
                )}
                {enrichmentData.last_sale_price && (
                  <div>
                    <span className="text-slate-500">Last Sale:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      ${enrichmentData.last_sale_price.toLocaleString()}
                    </span>
                  </div>
                )}
                {enrichmentData.last_sale_date && (
                  <div>
                    <span className="text-slate-500">Sale Date:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {enrichmentData.last_sale_date}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                This data will be saved with the lead automatically
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-700">Latitude (optional)</Label>
            <Input
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="29.7604"
            />
          </div>
          <div>
            <Label className="text-slate-700">Longitude (optional)</Label>
            <Input
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="-95.3698"
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