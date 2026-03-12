import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Filter } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons for different lead statuses
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const statusColors = {
  "New": "#10b981",
  "Contacted": "#3b82f6",
  "Responded": "#8b5cf6",
  "Talking": "#f59e0b",
  "Offer Sent": "#f97316",
  "Under Contract": "#06b6d4",
  "Closed": "#22c55e",
  "Dead": "#6b7280",
};

export default function MapView() {
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date"),
  });

  const filteredLeads = leads?.filter((lead) => {
    if (statusFilter === "All") return true;
    return lead.status === statusFilter;
  }) || [];

  const leadsWithCoordinates = filteredLeads.filter(
    (lead) => lead.latitude && lead.longitude
  );

  const defaultCenter = leadsWithCoordinates.length > 0
    ? [leadsWithCoordinates[0].latitude, leadsWithCoordinates[0].longitude]
    : [41.8781, -87.6298]; // Chicago default

  const handleMarkerClick = (leadId) => {
    navigate(createPageUrl("LeadDetail") + `?id=${leadId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div
        className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
        style={{ paddingTop: "env(safe-area-inset-top, 1rem)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Lead Map
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {leadsWithCoordinates.length} of {filteredLeads.length} leads mapped
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 rounded-lg">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Responded">Responded</SelectItem>
                  <SelectItem value="Talking">Talking</SelectItem>
                  <SelectItem value="Offer Sent">Offer Sent</SelectItem>
                  <SelectItem value="Under Contract">Under Contract</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Dead">Dead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {leadsWithCoordinates.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                No leads with location data
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Add latitude and longitude to your leads to see them on the map
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {leadsWithCoordinates.map((lead) => (
              <Marker
                key={lead.id}
                position={[lead.latitude, lead.longitude]}
                icon={createCustomIcon(statusColors[lead.status] || statusColors["New"])}
                eventHandlers={{
                  click: () => handleMarkerClick(lead.id),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2">
                      {lead.property_address}
                    </h3>
                    {(lead.city || lead.state) && (
                      <p className="text-xs text-slate-600 mb-2">
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: statusColors[lead.status] + "20",
                          color: statusColors[lead.status],
                        }}
                      >
                        {lead.status}
                      </span>
                      {lead.deal_score && (
                        <span className="text-xs text-slate-600">
                          Score: {lead.deal_score}/10
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-slate-900 hover:bg-slate-800 h-8 text-xs"
                      onClick={() => handleMarkerClick(lead.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 overflow-x-auto">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Legend:
            </span>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5 whitespace-nowrap">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}