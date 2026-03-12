import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom status-based marker icons
const getMarkerIcon = (status) => {
  const colors = {
    "New": "#3b82f6",
    "Contacted": "#f59e0b",
    "Responded": "#10b981",
    "Talking": "#a855f7",
    "Offer Sent": "#6366f1",
    "Under Contract": "#14b8a6",
    "Closed": "#22c55e",
    "Dead": "#6b7280",
  };

  const color = colors[status] || "#64748b";
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: "custom-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to recenter map when bounds change
function MapBoundsUpdater({ leads }) {
  const map = useMap();

  useEffect(() => {
    if (leads && leads.length > 0) {
      const bounds = leads
        .filter(lead => lead.latitude && lead.longitude)
        .map(lead => [lead.latitude, lead.longitude]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [leads, map]);

  return null;
}

export default function LeadsMapView({ leads, statusFilter = "All" }) {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef();

  const filteredLeads = leads?.filter(lead => {
    const hasCoords = lead.latitude && lead.longitude;
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    return hasCoords && matchesStatus;
  }) || [];

  const activeLeads = leads?.filter(l => l.latitude && l.longitude && !["Closed", "Dead"].includes(l.status)) || [];
  const defaultCenter = activeLeads.length > 0 
    ? [activeLeads[0].latitude, activeLeads[0].longitude]
    : [39.8283, -98.5795]; // Center of USA

  const handleGetLocation = () => {
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 12);
        }
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLoadingLocation(false);
      }
    );
  };

  const statusColors = {
    "New": "bg-blue-100 text-blue-700",
    "Contacted": "bg-amber-100 text-amber-700",
    "Responded": "bg-emerald-100 text-emerald-700",
    "Talking": "bg-purple-100 text-purple-700",
    "Offer Sent": "bg-indigo-100 text-indigo-700",
    "Under Contract": "bg-teal-100 text-teal-700",
    "Closed": "bg-green-100 text-green-700",
    "Dead": "bg-slate-100 text-slate-500",
  };

  if (filteredLeads.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">No leads with location data</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add coordinates to view leads on the map</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} on map
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetLocation}
          disabled={isLoadingLocation}
          className="h-9 rounded-lg"
        >
          {isLoadingLocation ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          My Location
        </Button>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-lg" style={{ height: "500px" }}>
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapBoundsUpdater leads={filteredLeads} />

          {userLocation && (
            <Marker position={userLocation} icon={L.divIcon({
              html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);"></div>',
              className: "user-location-marker",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold text-blue-600">Your Location</p>
                </div>
              </Popup>
            </Marker>
          )}

          {filteredLeads.map((lead) => (
            <Marker
              key={lead.id}
              position={[lead.latitude, lead.longitude]}
              icon={getMarkerIcon(lead.status)}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold text-slate-900 mb-1">{lead.property_address}</h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {lead.city}, {lead.state} {lead.zip_code}
                  </p>
                  <Badge className={`${statusColors[lead.status]} mb-3`}>{lead.status}</Badge>
                  {lead.distress_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {lead.distress_tags.map((tag) => (
                        <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => navigate(createPageUrl("LeadDetail") + `?id=${lead.id}`)}
                    className="w-full bg-slate-900 hover:bg-slate-800"
                  >
                    View Details
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(statusColors).map(([status, colorClass]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorClass.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')}`}></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}