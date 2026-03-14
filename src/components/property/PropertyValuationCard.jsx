import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Home, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (value) => {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const getQualityColor = (quality) => {
  switch (quality) {
    case "verified":
      return "bg-green-100 text-green-800";
    case "estimated":
      return "bg-amber-100 text-amber-800";
    case "partial":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

export default function PropertyValuationCard({ lead, propertyData, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const fetchValuationMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke("fetchPropertyValuation", {
        lead_id: lead.id,
        property_address: lead.property_address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zip_code,
      }),
    onSuccess: () => {
      toast.success("Property valuation updated!");
      onRefresh();
    },
    onError: () => toast.error("Failed to fetch valuation"),
  });

  const comps = propertyData?.comps_data 
    ? JSON.parse(propertyData.comps_data) 
    : [];
  
  const taxHistory = propertyData?.tax_history
    ? JSON.parse(propertyData.tax_history)
    : [];

  const avgCompPrice = comps.length > 0
    ? comps.reduce((sum, c) => sum + (c.sale_price || 0), 0) / comps.length
    : null;

  const equity = propertyData?.estimated_value && propertyData?.tax_assessed_value
    ? propertyData.estimated_value - propertyData.tax_assessed_value
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="w-4 h-4" />
              Property Valuation
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchValuationMutation.mutate()}
              disabled={fetchValuationMutation.isPending}
            >
              {fetchValuationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!propertyData ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 text-sm mb-3">
                No valuation data yet. Fetch automated property valuation.
              </p>
              <Button
                onClick={() => fetchValuationMutation.mutate()}
                disabled={fetchValuationMutation.isPending}
                className="w-full"
              >
                {fetchValuationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Fetch Valuation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(propertyData.estimated_value)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Tax Assessed</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(propertyData.tax_assessed_value)}
                  </p>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                {propertyData.year_built && (
                  <div>
                    <p className="text-xs text-slate-500">Year Built</p>
                    <p className="text-sm font-medium text-slate-900">
                      {propertyData.year_built}
                    </p>
                  </div>
                )}
                {propertyData.square_footage && (
                  <div>
                    <p className="text-xs text-slate-500">Sq Ft</p>
                    <p className="text-sm font-medium text-slate-900">
                      {propertyData.square_footage.toLocaleString()}
                    </p>
                  </div>
                )}
                {propertyData.bedrooms && (
                  <div>
                    <p className="text-xs text-slate-500">Beds</p>
                    <p className="text-sm font-medium text-slate-900">
                      {propertyData.bedrooms}
                    </p>
                  </div>
                )}
                {propertyData.bathrooms && (
                  <div>
                    <p className="text-xs text-slate-500">Baths</p>
                    <p className="text-sm font-medium text-slate-900">
                      {propertyData.bathrooms}
                    </p>
                  </div>
                )}
              </div>

              {/* Last Sale Info */}
              {propertyData.last_sale_price && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Last Sale</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {formatCurrency(propertyData.last_sale_price)}
                  </p>
                  {propertyData.last_sale_date && (
                    <p className="text-xs text-blue-600 mt-1">
                      {new Date(propertyData.last_sale_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Comps Summary */}
              {comps.length > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <p className="text-xs text-emerald-600 mb-1">Average Comp Price</p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {formatCurrency(avgCompPrice)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Based on {comps.length} comparable sales
                  </p>
                </div>
              )}

              {/* Expandable Sections */}
              {comps.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">
                        Comparable Sales ({comps.length})
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                  
                  {expanded && (
                    <div className="p-3 space-y-2 bg-white">
                      {comps.map((comp, idx) => (
                        <div key={idx} className="text-sm border-b pb-2 last:border-0">
                          <p className="font-medium text-slate-900">{comp.address}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-600">
                              {formatCurrency(comp.sale_price)}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {comp.beds || "?"} bed • {comp.sqft || comp.square_footage?.toLocaleString() || "?"} sqft
                            </span>
                          </div>
                          {comp.sale_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Sold: {new Date(comp.sale_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Data Quality Badge */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">Data Source</span>
                <Badge variant="outline" className="text-xs">
                  AVM
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}