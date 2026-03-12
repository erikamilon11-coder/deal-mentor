import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X,
  Loader2,
  Download
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const LEAD_FIELDS = [
  { value: "property_address", label: "Property Address", required: true },
  { value: "city", label: "City", required: false },
  { value: "state", label: "State", required: false },
  { value: "zip_code", label: "Zip Code", required: false },
  { value: "lead_source", label: "Lead Source", required: false },
  { value: "status", label: "Status", required: false },
  { value: "notes", label: "Notes", required: false },
];

const OWNER_FIELDS = [
  { value: "owner_name", label: "Owner Name", required: false },
  { value: "owner_email", label: "Owner Email", required: false },
  { value: "mailing_address", label: "Mailing Address", required: false },
  { value: "phone_number", label: "Phone Number", required: false },
];

const STATUSES = ["New", "Contacted", "Responded", "Talking", "Offer Sent", "Under Contract", "Closed", "Dead"];

export default function CSVImporter({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Validate, 4: Import
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [batchStatus, setBatchStatus] = useState("New");
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    });
    return { headers, rows };
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { headers: parsedHeaders, rows } = parseCSV(event.target.result);
        setHeaders(parsedHeaders);
        setCsvData(rows);
        setFile(uploadedFile);
        setStep(2);

        // Auto-map columns with similar names
        const autoMapping = {};
        parsedHeaders.forEach(header => {
          const normalizedHeader = header.toLowerCase().replace(/[_\s]/g, '');
          [...LEAD_FIELDS, ...OWNER_FIELDS].forEach(field => {
            const normalizedField = field.value.toLowerCase().replace(/[_\s]/g, '');
            if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
              autoMapping[header] = field.value;
            }
          });
        });
        setMapping(autoMapping);
      } catch (error) {
        alert('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(uploadedFile);
  };

  const validateData = async () => {
    setIsValidating(true);
    const errors = [];
    const warnings = [];

    csvData.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row
      
      // Check required field
      const addressField = Object.keys(mapping).find(k => mapping[k] === 'property_address');
      if (!addressField || !row[addressField]) {
        errors.push({
          row: rowNum,
          field: 'Property Address',
          message: 'Required field is missing',
          type: 'error'
        });
      }

      // Validate status
      const statusField = Object.keys(mapping).find(k => mapping[k] === 'status');
      if (statusField && row[statusField] && !STATUSES.includes(row[statusField])) {
        warnings.push({
          row: rowNum,
          field: 'Status',
          message: `Invalid status "${row[statusField]}". Will use "${batchStatus}" instead.`,
          type: 'warning'
        });
      }

      // Validate email format
      const emailField = Object.keys(mapping).find(k => mapping[k] === 'owner_email');
      if (emailField && row[emailField]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row[emailField])) {
          warnings.push({
            row: rowNum,
            field: 'Email',
            message: 'Invalid email format',
            type: 'warning'
          });
        }
      }
    });

    setValidationResults({
      errors,
      warnings,
      totalRows: csvData.length,
      validRows: csvData.length - errors.length
    });
    setIsValidating(false);
    setStep(3);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const results = { success: 0, failed: 0 };

      for (const row of csvData) {
        try {
          // Map lead data
          const leadData = {};
          Object.keys(mapping).forEach(csvHeader => {
            const fieldName = mapping[csvHeader];
            if (LEAD_FIELDS.find(f => f.value === fieldName)) {
              leadData[fieldName] = row[csvHeader];
            }
          });

          // Set batch status
          leadData.status = batchStatus;
          leadData.last_activity_date = new Date().toISOString();

          // Create lead
          const lead = await base44.entities.Lead.create(leadData);

          // Map owner data if available
          const ownerData = {};
          Object.keys(mapping).forEach(csvHeader => {
            const fieldName = mapping[csvHeader];
            if (OWNER_FIELDS.find(f => f.value === fieldName)) {
              if (fieldName === 'phone_number') {
                ownerData.phone = row[csvHeader];
              } else if (fieldName === 'owner_email') {
                ownerData.email = row[csvHeader];
              } else {
                ownerData[fieldName] = row[csvHeader];
              }
            }
          });

          // Create owner if data exists
          if (ownerData.owner_name || ownerData.email) {
            ownerData.lead_id = lead.id;
            if (!ownerData.owner_name) {
              ownerData.owner_name = "Unknown Owner";
            }
            const owner = await base44.entities.Owner.create(ownerData);

            // Create phone record if phone number exists
            if (ownerData.phone) {
              await base44.entities.Phone.create({
                owner_id: owner.id,
                phone_number: ownerData.phone,
                confidence_level: "Medium"
              });
            }
          }

          results.success++;
        } catch (error) {
          console.error('Import error:', error);
          results.failed++;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setStep(4);
      if (onComplete) {
        setTimeout(() => onComplete(results), 2000);
      }
    },
  });

  const downloadTemplate = () => {
    const headers = ['property_address', 'city', 'state', 'zip_code', 'owner_name', 'owner_email', 'phone_number', 'mailing_address', 'notes'];
    const csv = headers.join(',') + '\n' + '123 Main St,Austin,TX,78701,John Doe,john@example.com,555-0123,"456 Oak Ave, Austin, TX 78701",Vacant property';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['Upload', 'Map', 'Validate', 'Import'].map((label, index) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step > index + 1 ? 'bg-green-500 text-white' :
              step === index + 1 ? 'bg-slate-900 text-white' :
              'bg-slate-200 text-slate-400'
            }`}>
              {step > index + 1 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm ${step >= index + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              {label}
            </span>
            {index < 3 && <ArrowRight className="w-4 h-4 mx-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Upload CSV File</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload a CSV file with your lead data
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900">Need a template?</h4>
                <p className="text-xs text-blue-700 mt-1 mb-2">
                  Download our sample CSV to see the correct format
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="bg-white border-blue-300 text-blue-700"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Map Columns</h3>
              <p className="text-sm text-slate-500">Match your CSV columns to lead fields</p>
            </div>
            <Badge variant="outline" className="bg-slate-100">
              {csvData?.length || 0} rows
            </Badge>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
            {headers.map((header) => (
              <div key={header} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                <div className="flex-1">
                  <Label className="text-slate-700 font-medium">{header}</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sample: {csvData[0]?.[header] || 'N/A'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <Select
                  value={mapping[header] || "skip"}
                  onValueChange={(value) => {
                    setMapping(prev => {
                      const newMapping = { ...prev };
                      if (value === "skip") {
                        delete newMapping[header];
                      } else {
                        newMapping[header] = value;
                      }
                      return newMapping;
                    });
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Skip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip Column</SelectItem>
                    <SelectItem disabled>--- Lead Fields ---</SelectItem>
                    {LEAD_FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label} {field.required && '*'}
                      </SelectItem>
                    ))}
                    <SelectItem disabled>--- Owner Fields ---</SelectItem>
                    {OWNER_FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-slate-700 mb-2 block">Default Status for Batch</Label>
            <Select value={batchStatus} onValueChange={setBatchStatus}>
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1.5">
              All imported leads will be assigned this status
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={validateData} 
              className="flex-1 bg-slate-900"
              disabled={!Object.keys(mapping).find(k => mapping[k] === 'property_address')}
            >
              Continue to Validation
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Validate */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Validation Results</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {validationResults?.totalRows || 0}
                </div>
                <div className="text-xs text-blue-700">Total Rows</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-900">
                  {validationResults?.validRows || 0}
                </div>
                <div className="text-xs text-green-700">Valid</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-900">
                  {validationResults?.errors?.length || 0}
                </div>
                <div className="text-xs text-red-700">Errors</div>
              </div>
            </div>
          </div>

          {validationResults?.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-48 overflow-y-auto">
              <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errors ({validationResults.errors.length})
              </h4>
              <div className="space-y-2">
                {validationResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-white rounded p-2">
                    <span className="font-semibold">Row {error.row}:</span> {error.field} - {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResults?.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-h-48 overflow-y-auto">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Warnings ({validationResults.warnings.length})
              </h4>
              <div className="space-y-2">
                {validationResults.warnings.slice(0, 5).map((warning, index) => (
                  <div key={index} className="text-sm text-amber-700 bg-white rounded p-2">
                    <span className="font-semibold">Row {warning.row}:</span> {warning.field} - {warning.message}
                  </div>
                ))}
                {validationResults.warnings.length > 5 && (
                  <p className="text-xs text-amber-600">
                    +{validationResults.warnings.length - 5} more warnings
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Back to Mapping
            </Button>
            <Button 
              onClick={() => importMutation.mutate()}
              disabled={validationResults?.errors?.length > 0 || importMutation.isPending}
              className="flex-1 bg-slate-900"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${validationResults?.validRows || 0} Leads`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 text-xl mb-2">Import Complete!</h3>
          <p className="text-slate-600 mb-6">
            Successfully imported leads into your pipeline
          </p>
          <div className="bg-slate-50 rounded-xl p-4 max-w-sm mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Successful:</span>
              <span className="font-semibold text-green-600">
                {importMutation.data?.success || 0}
              </span>
            </div>
            {importMutation.data?.failed > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Failed:</span>
                <span className="font-semibold text-red-600">
                  {importMutation.data.failed}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}