import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, Calendar, Ruler, Bed, Bath, TrendingUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function PropertyDataCard({ propertyData, onRefresh, isRefreshing }) {
  const [showComps, setShowComps] = useState(false);
  const [showTaxHistory, setShowTaxHistory] = useState(false);

  if (!propertyData) {
    return null;
  }

  const comps = propertyData.comps_data ? JSON.parse(propertyData.comps_data) : [];
  const taxHistory = propertyData.tax_history ? JSON.parse(propertyData.tax_history) : [];

  const formatCurrency = (value) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Home className="w-4 h-4" />
          Property Data
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-xs text-slate-500">
             Updated {formatDate(propertyData.fetched_date) ? format(formatDate(propertyData.fetched_date), "MMM d, yyyy") : "N/A"}
           </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Values */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-600 font-medium">Estimated Value</p>
          </div>
          <p className="text-xl font-bold text-blue-900">
            {formatCurrency(propertyData.estimated_value)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-emerald-600 font-medium">Tax Assessed</p>
          </div>
          <p className="text-xl font-bold text-emerald-900">
            {formatCurrency(propertyData.tax_assessed_value)}
          </p>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Property Details
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {propertyData.square_footage && (
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">{propertyData.square_footage.toLocaleString()} sqft</span>
            </div>
          )}
          {propertyData.bedrooms && (
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">{propertyData.bedrooms} beds</span>
            </div>
          )}
          {propertyData.bathrooms && (
            <div className="flex items-center gap-2">
              <Bath className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">{propertyData.bathrooms} baths</span>
            </div>
          )}
          {propertyData.year_built && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">Built {propertyData.year_built}</span>
            </div>
          )}
          {propertyData.property_type && (
            <div className="col-span-2">
              <Badge variant="outline" className="bg-white">
                {propertyData.property_type}
              </Badge>
            </div>
          )}
        </div>

        {propertyData.last_sale_price && (
          <div className="pt-3 mt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">Last Sale</p>
            <p className="text-sm font-semibold text-slate-700">
              {formatCurrency(propertyData.last_sale_price)}
              {propertyData.last_sale_date && formatDate(propertyData.last_sale_date) && (
                <span className="text-xs font-normal text-slate-500 ml-2">
                  ({format(formatDate(propertyData.last_sale_date), "MMM yyyy")})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Comps */}
      {comps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <button
            onClick={() => setShowComps(!showComps)}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              Comparable Sales ({comps.length})
            </h4>
            <span className="text-xs text-slate-500">
              {showComps ? "Hide" : "Show"}
            </span>
          </button>
          
          {showComps && (
            <div className="mt-3 space-y-2">
              {comps.map((comp, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 text-xs">
                  <p className="font-medium text-slate-900 mb-1">{comp.address}</p>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(comp.sale_price)}
                    </span>
                    <span>{comp.bedrooms}bd • {comp.bathrooms}ba • {comp.square_footage?.toLocaleString()} sqft</span>
                  </div>
                  {comp.sale_date && formatDate(comp.sale_date) && (
                    <p className="text-slate-500 mt-1">
                      Sold {format(formatDate(comp.sale_date), "MMM yyyy")} • {comp.distance_miles} mi away
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tax History */}
      {taxHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <button
            onClick={() => setShowTaxHistory(!showTaxHistory)}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              Tax Assessment History
            </h4>
            <span className="text-xs text-slate-500">
              {showTaxHistory ? "Hide" : "Show"}
            </span>
          </button>
          
          {showTaxHistory && (
            <div className="mt-3 space-y-2">
              {taxHistory.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 text-sm">
                  <span className="font-medium text-slate-700">{record.year}</span>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(record.assessed_value)}
                    </p>
                    {record.tax_amount && (
                      <p className="text-xs text-slate-500">
                        Tax: {formatCurrency(record.tax_amount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}