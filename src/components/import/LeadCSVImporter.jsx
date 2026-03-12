import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function LeadCSVImporter({ onComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, processing, success, error
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setStatus("uploading");
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setStatus("processing");
      
      // Extract data from CSV
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
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
                  status: { type: "string" },
                  owner_name: { type: "string" },
                  owner_email: { type: "string" },
                  mailing_address: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === "error") {
        throw new Error(extractResult.details || "Failed to parse CSV");
      }

      const leadsData = extractResult.output?.leads || [];
      
      if (leadsData.length === 0) {
        throw new Error("No leads found in CSV");
      }

      // Create leads and owners
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of leadsData) {
        try {
          // Create lead
          const leadData = {
            property_address: row.property_address,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code,
            lead_source: row.lead_source || "List",
            status: row.status || "New",
            notes: row.notes
          };

          const lead = await base44.entities.Lead.create(leadData);

          // Create owner if owner_name provided
          if (row.owner_name && lead.id) {
            await base44.entities.Owner.create({
              lead_id: lead.id,
              owner_name: row.owner_name,
              email: row.owner_email,
              mailing_address: row.mailing_address
            });
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            address: row.property_address,
            error: error.message
          });
        }
      }

      return {
        total: leadsData.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors
      };
    },
    onSuccess: (results) => {
      setResults(results);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (onComplete) onComplete();
    },
    onError: (error) => {
      setStatus("error");
      setResults({ error: error.message });
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setStatus("idle");
      setResults(null);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const downloadTemplate = () => {
    const template = `property_address,city,state,zip_code,lead_source,status,owner_name,owner_email,mailing_address,notes
123 Main St,Dallas,TX,75201,Driving for Dollars,New,John Smith,john@example.com,456 Oak Ave Dallas TX 75201,Vacant property
789 Elm Dr,Houston,TX,77001,List,Contacted,Jane Doe,jane@example.com,789 Elm Dr Houston TX 77001,Interested seller`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Lead Import
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload a CSV file with lead and owner data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Template
        </Button>
      </div>

      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6">
        <div className="text-center">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <label className="block">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={status === "uploading" || status === "processing"}
            />
            <Button
              variant="outline"
              onClick={() => document.querySelector('input[type="file"]').click()}
              disabled={status === "uploading" || status === "processing"}
              className="cursor-pointer"
            >
              Choose CSV File
            </Button>
          </label>
          {file && (
            <p className="text-sm text-slate-600 mt-2">
              Selected: {file.name}
            </p>
          )}
        </div>
      </div>

      {file && status === "idle" && (
        <Button
          onClick={handleUpload}
          className="w-full bg-slate-900 h-11"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Leads
        </Button>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-medium text-blue-900">
              {status === "uploading" ? "Uploading file..." : "Processing leads..."}
            </p>
            <p className="text-sm text-blue-700">Please wait</p>
          </div>
        </div>
      )}

      {status === "success" && results && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900">Import Complete</p>
              <p className="text-sm text-green-700 mt-1">
                Successfully imported {results.success} of {results.total} leads
              </p>
              {results.errors > 0 && (
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    {results.errors} leads failed to import:
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.errorDetails?.map((err, idx) => (
                      <p key={idx} className="text-xs text-slate-600">
                        • {err.address}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "error" && results && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Import Failed</p>
            <p className="text-sm text-red-700 mt-1">{results.error}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700 mb-2">CSV Format Requirements:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><span className="font-medium">property_address</span> (required) - Street address</li>
          <li><span className="font-medium">city, state, zip_code</span> - Location details</li>
          <li><span className="font-medium">lead_source</span> - e.g., "Driving for Dollars", "List", "Referral"</li>
          <li><span className="font-medium">status</span> - e.g., "New", "Contacted", "Responded"</li>
          <li><span className="font-medium">owner_name</span> - Property owner name</li>
          <li><span className="font-medium">owner_email, mailing_address</span> - Owner contact info</li>
          <li><span className="font-medium">notes</span> - Additional information</li>
        </ul>
      </div>
    </div>
  );
}