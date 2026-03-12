import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle2, AlertCircle, Phone, Mail, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SkipTraceButton({ owner, lead }) {
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const skipTraceMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("skipTrace", {
        owner_id: owner.id,
        owner_name: owner.owner_name,
        property_address: lead.property_address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zip_code,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["owners", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["phones"] });
    },
  });

  const qualityColors = {
    excellent: "bg-green-100 text-green-700 border-green-200",
    good: "bg-blue-100 text-blue-700 border-blue-200",
    partial: "bg-amber-100 text-amber-700 border-amber-200",
    poor: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={() => skipTraceMutation.mutate()}
        disabled={skipTraceMutation.isPending}
        variant="outline"
        className="w-full h-10 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      >
        {skipTraceMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Skip Tracing...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Skip Trace Owner
          </>
        )}
      </Button>

      {skipTraceMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Skip trace failed</p>
            <p className="text-xs text-red-700 mt-1">
              {skipTraceMutation.error?.message || "Unable to fetch contact information"}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-green-900">Skip Trace Complete</h4>
                <Badge
                  variant="outline"
                  className={qualityColors[result.data_quality] || "bg-slate-100"}
                >
                  {result.data_quality}
                </Badge>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">
                    <strong>{result.phones_found}</strong> phone number{result.phones_found !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">
                    <strong>{result.emails_found}</strong> email{result.emails_found !== 1 ? 's' : ''} found
                  </span>
                </div>
                {result.mailing_address_updated && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-green-800">Mailing address updated</span>
                  </div>
                )}
              </div>

              {result.details?.phones?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-2">Phone Numbers</p>
                  <div className="space-y-1">
                    {result.details.phones.map((phone, idx) => (
                      <div key={idx} className="text-sm bg-white/50 rounded-lg p-2 flex items-center justify-between">
                        <span className="font-medium text-green-900">{phone.number}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {phone.confidence}
                          </Badge>
                          {phone.type !== "unknown" && (
                            <Badge variant="secondary" className="text-xs">
                              {phone.type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.details?.emails?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-2">Email Addresses</p>
                  <div className="space-y-1">
                    {result.details.emails.map((email, idx) => (
                      <div key={idx} className="text-sm bg-white/50 rounded-lg p-2">
                        <span className="text-green-900">{email.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.notes && (
                <p className="text-xs text-green-700 mt-3 italic">
                  {result.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}