import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, MapPin, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MobileSelect from "@/components/leads/MobileSelect";

const LEAD_SOURCES = ["Driving for Dollars", "List", "Referral", "Other"];
const DISTRESS_TAGS = ["Vacant", "Overgrown", "Boarded", "FSBO", "Inherited", "Other"];

const getInitialFormData = (lead) => ({
  property_address: lead?.property_address || "",
  city: lead?.city || "",
  state: lead?.state || "",
  zip_code: lead?.zip_code || "",
  owner: lead?.owner || "",
  phone: lead?.phone || "",
  email: lead?.email || "",
  message: lead?.message || "",
  next_action_suggestion: lead?.next_action_suggestion || "",
  notes: lead?.notes || "",
  latitude: lead?.latitude ?? "",
  longitude: lead?.longitude ?? "",
  lead_source: lead?.lead_source || "",
  distress_tags: lead?.distress_tags || [],
  deal_score: lead?.deal_score ?? "",
});

export default function LeadForm({ lead, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(getInitialFormData(lead));
  const [errors, setErrors] = useState({});
  const [enrichmentData, setEnrichmentData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);

  useEffect(() => {
    setFormData(getInitialFormData(lead));
  }, [lead?.id, lead?.updated_date]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.property_address.trim()) nextErrors.property_address = "Property address is required.";
    if (!formData.city.trim()) nextErrors.city = "City is required.";
    if (!formData.state.trim()) nextErrors.state = "State is required.";
    if (!formData.zip_code.trim()) {
      nextErrors.zip_code = "ZIP code is required.";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code.trim())) {
      nextErrors.zip_code = "Enter a valid ZIP code.";
    }

    if (formData.phone.trim()) {
      const digitsOnly = formData.phone.replace(/\D/g, "");
      if (digitsOnly.length < 7) {
        nextErrors.phone = "Enter a valid phone number.";
      }
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSave({
      ...formData,
      property_address: formData.property_address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      zip_code: formData.zip_code.trim(),
      owner: formData.owner.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
      next_action_suggestion: formData.next_action_suggestion.trim(),
      notes: formData.notes.trim(),
      deal_score: formData.deal_score ? Number(formData.deal_score) : null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      enrichmentData,
    });
  };

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      distress_tags: prev.distress_tags.includes(tag)
        ? prev.distress_tags.filter((item) => item !== tag)
        : [...prev.distress_tags, tag],
    }));
  };

  const fetchPropertyData = async () => {
    if (!formData.property_address || !formData.city || !formData.state) {
      setEnrichmentError("Please enter property address, city, and state first.");
      return;
    }

    setIsEnriching(true);
    setEnrichmentError(null);

    try {
      const fullAddress = `${formData.property_address}, ${formData.city}, ${formData.state}${formData.zip_code ? ` ${formData.zip_code}` : ""}`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find detailed public property records for: ${fullAddress}. Return only the matching property data in the exact JSON shape requested, and use null for anything unavailable.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            city: { type: "string" },
            state: { type: "string" },
            zip_code: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
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
      setFormData((prev) => ({
        ...prev,
        city: result.city || prev.city,
        state: result.state || prev.state,
        zip_code: result.zip_code || prev.zip_code,
        latitude: result.latitude ?? prev.latitude,
        longitude: result.longitude ?? prev.longitude,
      }));
    } catch (error) {
      setEnrichmentError(error.message || "Failed to fetch property data.");
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="property_address" className="text-slate-700">Property Address</Label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="property_address"
              type="text"
              value={formData.property_address}
              onChange={(e) => updateField("property_address", e.target.value)}
              className="h-12 rounded-xl pl-10"
              placeholder="123 Main Street"
            />
          </div>
          {errors.property_address && <p className="mt-1.5 text-sm text-red-600">{errors.property_address}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-slate-700">City</Label>
            <Input
              type="text"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="City"
            />
            {errors.city && <p className="mt-1.5 text-sm text-red-600">{errors.city}</p>}
          </div>
          <div>
            <Label className="text-slate-700">State</Label>
            <Input
              type="text"
              value={formData.state}
              onChange={(e) => updateField("state", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="TX"
            />
            {errors.state && <p className="mt-1.5 text-sm text-red-600">{errors.state}</p>}
          </div>
          <div>
            <Label className="text-slate-700">ZIP Code</Label>
            <Input
              type="text"
              value={formData.zip_code}
              onChange={(e) => updateField("zip_code", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="12345"
            />
            {errors.zip_code && <p className="mt-1.5 text-sm text-red-600">{errors.zip_code}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-slate-700">Owner</Label>
            <Input
              type="text"
              value={formData.owner}
              onChange={(e) => updateField("owner", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="Owner name"
            />
          </div>
          <div>
            <Label className="text-slate-700">Phone</Label>
            <Input
              type="text"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="(555) 555-5555"
            />
            {errors.phone && <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <Label className="text-slate-700">Email</Label>
          <Input
            type="text"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
            placeholder="owner@email.com"
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <Label className="text-slate-700">Message</Label>
          <Textarea
            value={formData.message}
            onChange={(e) => updateField("message", e.target.value)}
            className="mt-1.5 min-h-[100px] rounded-xl"
            placeholder="Add the initial message or lead summary..."
          />
        </div>

        <div>
          <Label className="text-slate-700">Next Action Suggestion</Label>
          <Input
            type="text"
            value={formData.next_action_suggestion}
            onChange={(e) => updateField("next_action_suggestion", e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
            placeholder="Call seller tomorrow"
          />
        </div>

        <div>
          <Label className="text-slate-700">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="mt-1.5 min-h-[100px] rounded-xl"
            placeholder="Add any notes about this property..."
          />
        </div>

        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Auto-Fetch Property Details</h4>
            </div>
            <Button
              type="button"
              onClick={fetchPropertyData}
              disabled={isEnriching || !formData.property_address || !formData.city || !formData.state}
              variant="outline"
              size="sm"
              className="border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-3 w-3" />
                  Fetch Data
                </>
              )}
            </Button>
          </div>

          {enrichmentError && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
              {enrichmentError}
            </p>
          )}

          {enrichmentData && (
            <div className="space-y-2 rounded-lg bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">Property data found</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {enrichmentData.tax_assessed_value && <div><span className="text-slate-500">Tax Assessment:</span><span className="ml-1 font-medium text-slate-900">${enrichmentData.tax_assessed_value.toLocaleString()}</span></div>}
                {enrichmentData.estimated_value && <div><span className="text-slate-500">Est. Value:</span><span className="ml-1 font-medium text-slate-900">${enrichmentData.estimated_value.toLocaleString()}</span></div>}
                {enrichmentData.square_footage && <div><span className="text-slate-500">Sq Ft:</span><span className="ml-1 font-medium text-slate-900">{enrichmentData.square_footage.toLocaleString()}</span></div>}
                {enrichmentData.year_built && <div><span className="text-slate-500">Year Built:</span><span className="ml-1 font-medium text-slate-900">{enrichmentData.year_built}</span></div>}
                {enrichmentData.bedrooms && <div><span className="text-slate-500">Beds:</span><span className="ml-1 font-medium text-slate-900">{enrichmentData.bedrooms}</span></div>}
                {enrichmentData.bathrooms && <div><span className="text-slate-500">Baths:</span><span className="ml-1 font-medium text-slate-900">{enrichmentData.bathrooms}</span></div>}
                {enrichmentData.last_sale_price && <div><span className="text-slate-500">Last Sale:</span><span className="ml-1 font-medium text-slate-900">${enrichmentData.last_sale_price.toLocaleString()}</span></div>}
                {enrichmentData.last_sale_date && <div><span className="text-slate-500">Sale Date:</span><span className="ml-1 font-medium text-slate-900">{enrichmentData.last_sale_date}</span></div>}
              </div>
              <p className="mt-2 text-xs text-blue-700">This data will be saved with the lead automatically.</p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <Label className="text-slate-700">Lead Source</Label>
            <MobileSelect
              value={formData.lead_source}
              onValueChange={(value) => updateField("lead_source", value)}
              options={LEAD_SOURCES}
              placeholder="How did you find this lead?"
              label="Select Lead Source"
              triggerClassName="mt-1.5 h-12 rounded-xl w-full"
            />
          </div>

          <div>
            <Label className="text-slate-700">Distress Indicators</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DISTRESS_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${formData.distress_tags.includes(tag) ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-200"}`}
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
              onChange={(e) => updateField("deal_score", e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
              placeholder="Rate this deal 1-10"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-slate-700">Latitude (optional)</Label>
              <Input
                type="text"
                value={formData.latitude}
                onChange={(e) => updateField("latitude", e.target.value)}
                className="mt-1.5 h-12 rounded-xl"
                placeholder="29.7604"
              />
            </div>
            <div>
              <Label className="text-slate-700">Longitude (optional)</Label>
              <Input
                type="text"
                value={formData.longitude}
                onChange={(e) => updateField("longitude", e.target.value)}
                className="mt-1.5 h-12 rounded-xl"
                placeholder="-95.3698"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="h-12 flex-1 rounded-xl">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="h-12 flex-1 rounded-xl bg-slate-900 hover:bg-slate-800">
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}