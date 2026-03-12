import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple nearest neighbor algorithm for route optimization
const optimizeRoute = (leads, startLat = null, startLon = null) => {
  if (leads.length === 0) return [];
  if (leads.length === 1) return leads;

  const unvisited = [...leads];
  const route = [];
  let current = unvisited.shift();
  route.push(current);

  while (unvisited.length > 0) {
    let nearest = unvisited[0];
    let minDistance = calculateDistance(
      current.latitude,
      current.longitude,
      nearest.latitude,
      nearest.longitude
    );

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(
        current.latitude,
        current.longitude,
        unvisited[i].latitude,
        unvisited[i].longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = unvisited[i];
      }
    }

    current = nearest;
    route.push(nearest);
    unvisited.splice(unvisited.indexOf(nearest), 1);
  }

  return route;
};

export default function RouteOptimizer({ leads, visibleLeads }) {
  const [routedLeads, setRoutedLeads] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [showRoute, setShowRoute] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("New");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const leadsToRoute = selectedStatus === "Visible" ? visibleLeads : leads.filter(l => l.status === selectedStatus);
  const leadsWithCoords = leadsToRoute.filter(l => l.latitude && l.longitude);

  const handleOptimizeRoute = () => {
    if (leadsWithCoords.length === 0) {
      toast.error("No leads with location data for this filter");
      return;
    }

    setIsOptimizing(true);
    // Simulate optimization delay for UX feedback
    setTimeout(() => {
      const optimized = optimizeRoute(leadsWithCoords);
      setRoutedLeads(optimized);

      // Calculate total distance
      let distance = 0;
      for (let i = 0; i < optimized.length - 1; i++) {
        distance += calculateDistance(
          optimized[i].latitude,
          optimized[i].longitude,
          optimized[i + 1].latitude,
          optimized[i + 1].longitude
        );
      }
      setTotalDistance(distance);
      setShowRoute(true);
      setIsOptimizing(false);
      toast.success("Route optimized!");
    }, 500);
  };

  const handleCopyDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/${routedLeads
      .map(l => `${l.latitude},${l.longitude}`)
      .join("/")}`;
    navigator.clipboard.writeText(directionsUrl);
    toast.success("Google Maps link copied!");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Navigation className="w-4 h-4" />
          Route Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showRoute ? (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Filter by Lead Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New ({leads.filter(l => l.status === "New" && l.latitude && l.longitude).length})</SelectItem>
                  <SelectItem value="Contacted">Contacted ({leads.filter(l => l.status === "Contacted" && l.latitude && l.longitude).length})</SelectItem>
                  <SelectItem value="Responded">Responded ({leads.filter(l => l.status === "Responded" && l.latitude && l.longitude).length})</SelectItem>
                  <SelectItem value="Visible">Visible on Map ({visibleLeads.filter(l => l.latitude && l.longitude).length})</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {leadsWithCoords.length} leads to visit
              </p>
            </div>

            <Button
              onClick={handleOptimizeRoute}
              disabled={isOptimizing || leadsWithCoords.length === 0}
              className="w-full"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Optimize Route ({leadsWithCoords.length})
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div>
                <p className="text-xs text-slate-500">Total Distance</p>
                <p className="text-lg font-bold text-slate-900">{totalDistance.toFixed(1)} miles</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Estimated Time</p>
                <p className="text-sm font-medium text-slate-700">~{Math.ceil(totalDistance / 30)} hours</p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {routedLeads.map((lead, idx) => (
                <div key={lead.id} className="flex items-start gap-2 pb-2 border-b last:border-0">
                  <span className="text-xs font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {lead.property_address}
                    </p>
                    <p className="text-xs text-slate-500">
                      {lead.city}, {lead.state}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRoute(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCopyDirections}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}