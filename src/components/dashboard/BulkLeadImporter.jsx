import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BulkLeadImporter({ onImportComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setIsProcessing(true);

    try {
      // Upload the CSV file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV with mapping to Lead schema
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  property_address: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zip_code: { type: "string" },
                  lead_source: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["property_address"],
              },
            },
          },
        },
      });

      setIsUploading(false);

      if (extractionResult.status === "error") {
        throw new Error(extractionResult.details || "Failed to extract data from CSV");
      }

      const leads = extractionResult.output?.leads || [];

      if (leads.length === 0) {
        throw new Error("No valid leads found in the CSV file");
      }

      // Bulk create leads with default values
      const now = new Date().toISOString();
      const leadsToCreate = leads.map((lead) => ({
        property_address: lead.property_address,
        city: lead.city || "",
        state: lead.state || "",
        zip_code: lead.zip_code || "",
        lead_source: lead.lead_source || "List",
        status: "New",
        notes: lead.notes || "",
        last_activity_date: now,
        next_action_suggestion: "Make initial contact with the property owner",
      }));

      await base44.entities.Lead.bulkCreate(leadsToCreate);

      setResult({
        success: true,
        count: leadsToCreate.length,
      });

      setTimeout(() => {
        if (onImportComplete) onImportComplete();
      }, 1500);
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">Bulk Import Leads</h3>
          <p className="text-sm text-slate-500 mt-1">Upload a CSV file to create multiple leads at once</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-200">
        <div className="text-center space-y-3">
          <Upload className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="inline-block">
                <Button variant="outline" className="pointer-events-none" disabled={isProcessing}>
                  Choose CSV File
                </Button>
              </div>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
              />
            </Label>
            {file && (
              <p className="text-sm text-slate-700 mt-2 font-medium">{file.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-900 mb-2">CSV Format Requirements:</p>
        <ul className="text-blue-700 space-y-1 text-xs">
          <li>• <strong>property_address</strong> (required) - Street address</li>
          <li>• <strong>city</strong> (optional) - City name</li>
          <li>• <strong>state</strong> (optional) - State abbreviation</li>
          <li>• <strong>zip_code</strong> (optional) - ZIP code</li>
          <li>• <strong>lead_source</strong> (optional) - e.g., "List", "Driving for Dollars"</li>
          <li>• <strong>notes</strong> (optional) - Additional notes</li>
        </ul>
      </div>

      {result && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.success ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Import Successful!</p>
                <p className="text-sm text-green-700 mt-1">
                  Created {result.count} new lead{result.count !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Import Failed</p>
                <p className="text-sm text-red-700 mt-1">{result.error}</p>
              </div>
            </>
          )}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || isProcessing}
        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isUploading ? "Uploading..." : "Processing..."}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Import Leads
          </>
        )}
      </Button>
    </div>
  );
}