import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MapPin, Loader2, Filter, List } from "lucide-react";
import MapLeadsList from "@/components/map/MapLeadsList";
import RouteOptimizer from "@/components/map/RouteOptimizer";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
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

// Component to fit map bounds to visible markers
function MapBounds({ leads }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (leads.length > 0) {
      const bounds = L.latLngBounds(leads.map(l => [l.latitude, l.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [leads, map]);
  
  return null;
}

export default function MapView() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedArea, setSelectedArea] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
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

  // Filter by map bounds when user interacts with map
  const visibleLeads = mapBounds
    ? leadsWithCoordinates.filter((lead) => {
        const lat = lead.latitude;
        const lng = lead.longitude;
        return (
          lat >= mapBounds.south &&
          lat <= mapBounds.north &&
          lng >= mapBounds.west &&
          lng <= mapBounds.east
        );
      })
    : leadsWithCoordinates;

  const handleMapMove = (e) => {
    const bounds = e.target.getBounds();
    setMapBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  };

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
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Lead Map
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {mapBounds ? `${visibleLeads.length} visible` : `${leadsWithCoordinates.length} mapped`} of {filteredLeads.length} leads
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <List className="w-4 h-4" />
                    {mapBounds ? `View ${visibleLeads.length}` : 'List'}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      {mapBounds ? "Leads in View" : "All Mapped Leads"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <RouteOptimizer 
                      leads={leadsWithCoordinates}
                      visibleLeads={mapBounds ? visibleLeads : leadsWithCoordinates}
                    />
                    <MapLeadsList 
                      leads={mapBounds ? visibleLeads : leadsWithCoordinates}
                      title={mapBounds ? "Visible on Map" : "All Leads"}
                    />
                  </div>
                </SheetContent>
              </Sheet>
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
            whenReady={(map) => {
              map.target.on('moveend', handleMapMove);
              map.target.on('zoomend', handleMapMove);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBounds leads={leadsWithCoordinates} />
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                const markers = cluster.getAllChildMarkers();
                const statusCounts = {};
                markers.forEach(marker => {
                  const status = marker.options.leadStatus;
                  statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
                const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0][0];
                const color = statusColors[dominantStatus] || statusColors["New"];
                
                return L.divIcon({
                  html: `<div style="
                    background: ${color};
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  ">${count}</div>`,
                  className: 'custom-cluster-icon',
                  iconSize: L.point(40, 40),
                });
              }}
            >
              {leadsWithCoordinates.map((lead) => (
                <Marker
                  key={lead.id}
                  position={[lead.latitude, lead.longitude]}
                  icon={createCustomIcon(statusColors[lead.status] || statusColors["New"])}
                  leadStatus={lead.status}
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
            </MarkerClusterGroup>
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