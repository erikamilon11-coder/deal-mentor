import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Phone, Mail, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SkipTraceButton({ leadId, lead, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const handleRunSkipTrace = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await base44.functions.invoke("skipTrace", {
        lead_id: leadId,
        property_address: lead.property_address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zip_code,
      });

      setResult(response.data.data);
      setShowResults(true);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["owners", leadId] });
      queryClient.invalidateQueries({ queryKey: ["phones"] });

      onComplete?.();
    } catch (err) {
      setError(err.message || "Failed to run skip trace");
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleRunSkipTrace}
        disabled={isLoading}
        variant="outline"
        className="h-10 gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running Skip Trace...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Run Skip Trace
          </>
        )}
      </Button>

      <Sheet open={showResults} onOpenChange={setShowResults}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Skip Trace Results</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            ) : result ? (
              <>
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {result.owner_name ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Data Found</Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <Badge className="bg-amber-100 text-amber-800">No Data Found</Badge>
                    </>
                  )}
                </div>

                {/* Owner Name */}
                {result.owner_name && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Owner Name
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {result.owner_name}
                    </p>
                  </div>
                )}

                {/* Entity Type */}
                {result.entity_type && result.entity_type !== 'Individual' && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Entity Type
                    </p>
                    <Badge className="bg-slate-100 text-slate-800">
                      {result.entity_type}
                    </Badge>
                  </div>
                )}

                {/* Phone Numbers */}
                {result.phone_numbers?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Phone Numbers
                    </p>
                    <div className="space-y-2">
                      {result.phone_numbers.map((phone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg"
                        >
                          <Phone className="w-4 h-4 text-slate-500" />
                          <a href={`tel:${phone}`} className="text-slate-900 hover:text-slate-700 font-medium">
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Addresses */}
                {result.email_addresses?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Email Addresses
                    </p>
                    <div className="space-y-2">
                      {result.email_addresses.map((email, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg"
                        >
                          <Mail className="w-4 h-4 text-slate-500" />
                          <a href={`mailto:${email}`} className="text-slate-900 hover:text-slate-700 font-medium">
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mailing Address */}
                {result.mailing_address && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Mailing Address
                    </p>
                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <p className="text-slate-900">{result.mailing_address}</p>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                {result.additional_details && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Additional Details
                    </p>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                      {result.additional_details}
                    </p>
                  </div>
                )}

                {/* Confidence Level */}
                {result.confidence_level && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                      Confidence:
                    </p>
                    <Badge
                      className={
                        result.confidence_level === 'High'
                          ? 'bg-green-100 text-green-800'
                          : result.confidence_level === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {result.confidence_level}
                    </Badge>
                  </div>
                )}

                <Button
                  onClick={() => setShowResults(false)}
                  className="w-full mt-6"
                >
                  Done
                </Button>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}