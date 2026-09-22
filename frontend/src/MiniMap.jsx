import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  MapPin, 
  Maximize2, 
  Minimize2, 
  X, 
  Navigation, 
  Zap, 
  Layers, 
  ChevronUp, 
  ChevronDown,
  Calendar,
  Compass
} from "lucide-react";
import "./MiniMap.css";

// Helper to parse "lat,lng" string
function parseCoords(coordStr) {
  if (!coordStr) return null;
  const parts = coordStr.split(",").map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
}

export default function MiniMap({
  stations = [],
  spotlightStationId = 1,
  onSelectStation,
  onBookStation,
  activeSession
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [activeStationData, setActiveStationData] = useState(null);

  // Calculate station availability count
  const availableCount = stations.filter(s => s.status === "available" || s.status === "Available").length;

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around VIT Vellore campus
      const defaultCenter = [12.9715, 79.1595];
      
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter tiles (sleek midnight style matching #22092C theme)
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Add zoom control on top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Force map size recalculation
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, isExpanded]);

  // Clean up map when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when stations or spotlightStationId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !stations || stations.length === 0) return;

    const bounds = [];

    stations.forEach((st) => {
      const coords = parseCoords(st.coordinates);
      if (!coords) return;

      bounds.push(coords);

      const isSpotlight = st.stationId === spotlightStationId;
      const isAvailable = (st.status === "available" || st.status === "Available");
      const isActivelyCharging = activeSession && activeSession.stationId === st.stationId && activeSession.status === "Charging";

      const pinClass = [
        "station-marker-pin",
        isAvailable ? "status-available" : "status-occupied",
        isSpotlight ? "is-spotlight" : "",
        isActivelyCharging ? "is-charging-active" : ""
      ].filter(Boolean).join(" ");

      const customIcon = L.divIcon({
        className: "voltnet-map-icon-wrapper",
        html: `
          <div class="${pinClass}" id="marker-pin-${st.stationId}">
            <div class="pin-beacon"></div>
            <div class="pin-bubble">
              <span class="pin-num">#${st.stationId}</span>
            </div>
            <div class="pin-tail"></div>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -42]
      });

      // If marker already exists, update position & icon
      if (markersRef.current[st.stationId]) {
        markersRef.current[st.stationId].setIcon(customIcon);
        markersRef.current[st.stationId].setLatLng(coords);
      } else {
        const marker = L.marker(coords, { icon: customIcon });
        
        marker.on("click", () => {
          if (onSelectStation) {
            onSelectStation(st.stationId);
          }
          setActiveStationData(st);
        });

        marker.addTo(map);
        markersRef.current[st.stationId] = marker;
      }
    });

    // Remove obsolete markers
    const currentIds = new Set(stations.map(s => s.stationId));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(Number(id))) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

  }, [stations, spotlightStationId, activeSession, isOpen]);

  // Pan to spotlight station when spotlightStationId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetStation = stations.find(s => s.stationId === spotlightStationId);
    if (targetStation) {
      const coords = parseCoords(targetStation.coordinates);
      if (coords) {
        map.panTo(coords, { animate: true, duration: 0.6 });
        setActiveStationData(targetStation);
      }
    }
  }, [spotlightStationId, stations]);

  // Fit all stations in view
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || stations.length === 0) return;

    const validCoords = stations
      .map(s => parseCoords(s.coordinates))
      .filter(Boolean);

    if (validCoords.length > 0) {
      map.fitBounds(L.latLngBounds(validCoords), { padding: [30, 30], maxZoom: 16 });
    }
  };

  return (
    <div className={`minimap-dock-wrapper ${isExpanded ? "expanded" : ""} ${!isOpen ? "collapsed" : ""}`}>
      {/* Collapsed Pill Button */}
      {!isOpen ? (
        <button 
          className="minimap-pill-toggle"
          onClick={() => setIsOpen(true)}
          title="Open Charging Stations Map"
          id="btn-open-minimap"
        >
          <div className="minimap-pill-pulse"></div>
          <Compass size={17} className="minimap-compass-icon" />
          <span className="minimap-pill-text">Campus Map</span>
          <span className="minimap-pill-badge">{availableCount}/{stations.length} Available</span>
        </button>
      ) : (
        /* Floating Mini Map Card */
        <div className="minimap-card" id="minimap-container">
          {/* Header */}
          <div className="minimap-header">
            <div className="minimap-header-title">
              <span className="minimap-live-dot"></span>
              <span className="minimap-title-text">VIT Station Radar</span>
              <span className="minimap-count-tag">{availableCount} Free</span>
            </div>

            <div className="minimap-header-actions">
              <button 
                className="minimap-btn-icon" 
                onClick={handleFitBounds}
                title="Fit all campus stations"
                id="btn-minimap-fit"
              >
                <Navigation size={14} />
              </button>
              <button 
                className="minimap-btn-icon" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse size" : "Expand size"}
                id="btn-minimap-expand"
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button 
                className="minimap-btn-icon" 
                onClick={() => setIsOpen(false)}
                title="Minimize map"
                id="btn-minimap-close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="minimap-body">
            <div ref={mapContainerRef} className="minimap-canvas" />

            {/* Floating Station Quick Info Overlay inside map */}
            {activeStationData && (
              <div className="minimap-station-overlay" id="minimap-overlay-info">
                <div className="overlay-info-row">
                  <div className="overlay-text">
                    <span className="overlay-station-title">
                      #{activeStationData.stationId} {activeStationData.name}
                    </span>
                    <span className="overlay-station-sub">
                      {activeStationData.status === "available" || activeStationData.status === "Available" 
                        ? "Available now" 
                        : "Occupied"}
                      {activeStationData.renewableRatio > 0 ? ` · ${activeStationData.renewableRatio}% Solar` : ""}
                    </span>
                  </div>

                  <div className="overlay-action-btns">
                    {onBookStation && (
                      <button 
                        className="btn-overlay-book"
                        onClick={() => onBookStation(activeStationData)}
                        id={`btn-minimap-book-${activeStationData.stationId}`}
                      >
                        <Calendar size={13} />
                        Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Quick Selector Pills */}
          <div className="minimap-footer">
            <div className="minimap-legend">
              <span className="legend-item"><span className="legend-dot available"></span> Available</span>
              <span className="legend-item"><span className="legend-dot occupied"></span> Occupied</span>
              <span className="legend-item"><span className="legend-dot spotlight"></span> Selected</span>
            </div>

            <div className="minimap-quick-pills">
              {stations.map(st => {
                const isSelected = st.stationId === spotlightStationId;
                const isFree = (st.status === "available" || st.status === "Available");
                return (
                  <button
                    key={st.stationId}
                    className={`minimap-chip ${isSelected ? "active" : ""} ${isFree ? "chip-free" : "chip-busy"}`}
                    onClick={() => {
                      if (onSelectStation) onSelectStation(st.stationId);
                    }}
                    title={`${st.name} (${st.status})`}
                  >
                    #{st.stationId}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
