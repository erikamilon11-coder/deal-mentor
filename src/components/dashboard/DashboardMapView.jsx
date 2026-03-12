import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import { Loader2, MapPin, DollarSign, Calendar } from "lucide-react";

// Custom marker icons for different statuses
const createMarkerIcon = (status) => {
  let color = "#64748b"; // default gray

  if (status === "Closed") {
    color = "#16a34a"; // green
  } else if (status === "Under Contract") {
    color = "#2563eb"; // blue
  } else if (["New", "Contacted", "Responded", "Talking", "Offer Sent"].includes(status)) {
    color = "#ea580c"; // orange for active
  }

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    className: "custom-marker",
  });
};

export default function DashboardMapView() {
  const [selectedLead, setSelectedLead] = useState(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: propertyData = {} } = useQuery({
    queryKey: ["propertyData"],
    queryFn: async () => {
      const data = await base44.entities.PropertyData.list();
      const map = {};
      data.forEach((p) => {
        map[p.lead_id] = p;
      });
      return map;
    },
  });

  // Filter and enrich leads with coordinates
  const leadsWithCoords = useMemo(() => {
    return leads.filter((lead) => lead.latitude && lead.longitude);
  }, [leads]);

  // Calculate center of map based on leads
  const mapCenter = useMemo(() => {
    if (leadsWithCoords.length === 0) {
      return [39.8283, -98.5795]; // Center of USA
    }

    const latSum = leadsWithCoords.reduce((sum, l) => sum + l.latitude, 0);
    const lngSum = leadsWithCoords.reduce((sum, l) => sum + l.longitude, 0);

    return [latSum / leadsWithCoords.length, lngSum / leadsWithCoords.length];
  }, [leadsWithCoords]);

  // Calculate days on market
  const getDaysOnMarket = (lead) => {
    if (!lead.created_date) return 0;
    const createdDate = new Date(lead.created_date);
    const today = new Date();
    return Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
  };

  // Status color mapping
  const statusBadgeColor = {
    Closed: "bg-green-100 text-green-800",
    "Under Contract": "bg-blue-100 text-blue-800",
    New: "bg-orange-100 text-orange-800",
    Contacted: "bg-orange-100 text-orange-800",
    Responded: "bg-orange-100 text-orange-800",
    Talking: "bg-orange-100 text-orange-800",
    "Offer Sent": "bg-orange-100 text-orange-800",
    Dead: "bg-slate-100 text-slate-800",
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (leadsWithCoords.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">
            No leads with location data to display on map
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lead Map</CardTitle>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Contract</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Closed</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative rounded-b-lg overflow-hidden" style={{ height: "400px" }}>
          <MapContainer
            center={mapCenter}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {leadsWithCoords.map((lead) => {
              const propData = propertyData[lead.id];
              const daysOnMarket = getDaysOnMarket(lead);
              const estimatedValue = propData?.estimated_value || 0;

              return (
                <Marker
                  key={lead.id}
                  position={[lead.latitude, lead.longitude]}
                  icon={createMarkerIcon(lead.status)}
                  eventHandlers={{
                    click: () => setSelectedLead(lead),
                  }}
                >
                  <Popup maxWidth={280} className="lead-popup">
                    <div className="p-2 space-y-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">
                          {lead.property_address}
                        </p>
                        <p className="text-xs text-slate-600">
                          {lead.city}, {lead.state} {lead.zip_code}
                        </p>
                      </div>

                      <Badge className={statusBadgeColor[lead.status]}>
                        {lead.status}
                      </Badge>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-700">
                            {estimatedValue
                              ? `$${(estimatedValue / 1000).toFixed(0)}k`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-700">
                            {daysOnMarket}d
                          </span>
                        </div>
                      </div>

                      {lead.next_action_suggestion && (
                        <p className="text-xs bg-slate-50 p-2 rounded text-slate-700">
                          {lead.next_action_suggestion}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {leadsWithCoords.filter((l) =>
                ["New", "Contacted", "Responded", "Talking", "Offer Sent"].includes(
                  l.status
                )
              ).length}
            </p>
            <p className="text-xs text-slate-600">Active Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {leadsWithCoords.filter((l) => l.status === "Under Contract").length}
            </p>
            <p className="text-xs text-slate-600">Under Contract</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {leadsWithCoords.filter((l) => l.status === "Closed").length}
            </p>
            <p className="text-xs text-slate-600">Closed Deals</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}