import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  MapPin,
  Home,
  DollarSign,
  Flame,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function MarketInsightsDashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  // Get unique cities for selection
  const uniqueCities = useMemo(() => {
    const cities = [...new Set(leads.map((l) => l.city))].filter(Boolean);
    return cities;
  }, [leads]);

  const [selectedCity, setSelectedCity] = useState(uniqueCities[0] || "");
  const [selectedState, setSelectedState] = useState("TX");

  const { data: marketData, isLoading } = useQuery({
    queryKey: ["marketTrends", selectedCity, selectedState],
    queryFn: async () => {
      const response = await base44.functions.invoke("fetchMarketTrends", {
        city: selectedCity,
        state: selectedState,
      });
      return response.data;
    },
    enabled: !!selectedCity && !!selectedState,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!marketData) {
    return <div className="text-center py-8 text-slate-500">Select a market to view insights</div>;
  }

  const { trends, competitive_pricing, neighborhoods } = marketData;

  // Format price range data
  const priceRangeData = trends.price_ranges
    ? [
        { name: "< $250K", value: trends.price_ranges.under_250k },
        { name: "$250K - $500K", value: trends.price_ranges["250k_to_500k"] },
        { name: "$500K - $1M", value: trends.price_ranges["500k_to_1m"] },
        { name: "> $1M", value: trends.price_ranges.over_1m },
      ]
    : [];

  const priceColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  // Sort neighborhoods by activity
  const neighborhoodsByActivity = [...(neighborhoods || [])].sort((a, b) => {
    const activityMap = { High: 3, Medium: 2, Low: 1 };
    return activityMap[b.activity_level] - activityMap[a.activity_level];
  });

  return (
    <div className="space-y-6">
      {/* Market Selection */}
      <div className="flex gap-3">
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-600">Average Price</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ${(trends.average_price / 1000).toFixed(0)}K
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-600">Price Trend</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    trends.price_trend > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trends.price_trend > 0 ? "+" : ""}
                  {trends.price_trend.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-600">Market Velocity</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {trends.market_velocity.toFixed(0)}%
                </p>
              </div>
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-600">Avg Days to Sell</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {Math.round(trends.average_days_on_market)}
                </p>
              </div>
              <Home className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Range Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priceRangeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priceRangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={priceColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Competitive Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Comparable Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {competitive_pricing && competitive_pricing.length > 0 ? (
              competitive_pricing.map((prop, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{prop.address}</p>
                    <div className="flex gap-3 mt-2 text-xs text-slate-600">
                      <span>{prop.beds} bed</span>
                      <span>{prop.baths} bath</span>
                      <span>{prop.sqft.toLocaleString()} sqft</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      ${(prop.price / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      ${prop.price_per_sqft}/sqft
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No comparable properties found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Neighborhood Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Neighborhood Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {neighborhoodsByActivity && neighborhoodsByActivity.length > 0 ? (
              neighborhoodsByActivity.map((neighborhood) => {
                const activityColor = {
                  High: "bg-red-100 text-red-800",
                  Medium: "bg-yellow-100 text-yellow-800",
                  Low: "bg-green-100 text-green-800",
                };

                return (
                  <div
                    key={neighborhood.zip_code}
                    className="p-4 rounded-lg border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-900">
                        ZIP {neighborhood.zip_code}
                      </h4>
                      <Badge
                        className={`${
                          activityColor[neighborhood.activity_level] ||
                          "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {neighborhood.activity_level} Activity
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Properties</p>
                        <p className="font-semibold text-slate-900">
                          {neighborhood.property_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Avg Price</p>
                        <p className="font-semibold text-slate-900">
                          ${(neighborhood.average_price / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Range</p>
                        <p className="font-semibold text-slate-900 text-xs">
                          ${(neighborhood.price_range[0] / 1000).toFixed(0)}K -{" "}
                          {neighborhood.price_range[1] ? `$${(neighborhood.price_range[1] / 1000).toFixed(0)}K` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No neighborhood data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Market Opportunity:</strong> {trends.market_velocity > 50
                ? "This is a hot market with high activity. Offers may face competition."
                : "This is a slower market. There may be more room for negotiation."}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-900">
              <strong>Price Trends:</strong> {trends.price_trend > 0
                ? `Prices are up ${trends.price_trend}% compared to last sales. Market is appreciating.`
                : `Prices are down ${Math.abs(trends.price_trend)}% compared to last sales. Buyer's market conditions.`}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Analyzed:</strong> {trends.properties_analyzed} properties in{" "}
              {selectedCity}, {selectedState}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}