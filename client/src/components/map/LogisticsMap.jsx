import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Polyline, Circle, Popup, Marker } from 'react-leaflet';
import { Shield, MapPin, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { getMapIcon } from './mapIcons';
import ShipmentMarker from './ShipmentMarker';
import Button from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

// Helper component to dynamically adjust bounds or center (only when explicitly needed)
const ChangeMapView = ({ center, bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    // Only adjust view if bounds are provided and valid
    if (bounds && bounds.length >= 2 && bounds[0] && bounds[1]) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (error) {
        console.error('Failed to fit bounds:', error);
      }
    }
    // Don't auto-center on every render - let user control the view
  }, [bounds, map]); // Removed center from dependencies
  
  // Handle map resize on window resize
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Also invalidate after a short delay to handle sidebar toggles
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [map]);
  
  return null;
};

const DEFAULT_ARRAY = [];

const LogisticsMap = ({
  shipments = DEFAULT_ARRAY,
  alerts = DEFAULT_ARRAY,
  mode = 'tracking', // 'tracking', 'dashboard', 'details'
  singleShipment = null,
  height = '500px',
  routes = DEFAULT_ARRAY,
  selectedRouteId = '',
  highlightedRouteId = '',
  onRouteClick = null,
  envSamples = DEFAULT_ARRAY,
  recommendedRouteId = '',
  rankedRoutes = DEFAULT_ARRAY
}) => {
  const { t, isHindi, translateSeverity } = useLanguage();
  const [mapError, setMapError] = useState(false);

  // Toggle states
  const [showEnvOverlay, setShowEnvOverlay] = useState(false);

  // Default focus - neutral world view (India center, but not locked)
  const defaultCenter = [20.5937, 78.9629]; // India center
  const defaultZoom = 5;
  // Remove maxBounds to allow free panning globally
  const maxBounds = null;

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapBounds, setMapBounds] = useState(null);

  // Resolve coordinates helper - ONLY use real data
  const getCoordinates = (locData) => {
    if (!locData) return null;
    
    // Only use real coordinates from database
    if (locData.latitude && locData.longitude) {
      return [locData.latitude, locData.longitude];
    }
    
    // No fallback to demo locations
    return null;
  };

  // Adjust center and bounds based on mode and inputs (only on meaningful changes)
  useEffect(() => {
    if (mode === 'details' && singleShipment) {
      const pCoords = getCoordinates(singleShipment.pickup);
      const dCoords = getCoordinates(singleShipment.destination);

      if (pCoords && dCoords) {
        setMapBounds([pCoords, dCoords]);
      } else if (pCoords) {
        setMapCenter(pCoords);
        setMapBounds(null);
      } else if (dCoords) {
        setMapCenter(dCoords);
        setMapBounds(null);
      }
    } else if (routes && routes.length > 0) {
      const firstRoute = routes[0];
      const pCoords = firstRoute.coordinates[0];
      const dCoords = firstRoute.coordinates[firstRoute.coordinates.length - 1];
      if (pCoords && dCoords) {
        setMapBounds([pCoords, dCoords]);
      }
    } else if (mode === 'dashboard' && shipments && shipments.length > 0) {
      // Auto-fit to shipment locations only on initial load
      const validCoords = [];
      
      shipments.forEach(s => {
        const pCoords = getCoordinates(s.pickup);
        const dCoords = getCoordinates(s.destination);
        if (pCoords) validCoords.push(pCoords);
        if (dCoords) validCoords.push(dCoords);
      });

      if (validCoords.length > 1) {
        // Multiple locations - fit bounds to show all
        setMapBounds(validCoords);
      } else if (validCoords.length === 1) {
        // Single location - center on it
        setMapCenter(validCoords[0]);
        setMapBounds(null);
      } else {
        // No valid coordinates - use default India center
        setMapCenter(defaultCenter);
        setMapBounds(null);
      }
    } else {
      setMapCenter(defaultCenter);
      setMapBounds(null);
    }
  }, [singleShipment, mode, routes, shipments?.length]); // Only re-run when shipment count changes, not on every shipment update

  const handleToggleEnvOverlay = () => {
    setShowEnvOverlay(prev => !prev);
  };

  return (
    <div className="relative border border-darkBorder rounded-lg overflow-hidden bg-darkBgSecondary flex flex-col" style={{ height }}>
      {/* Map Control overlay removed - no demo data to toggle */}

      {mapError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-darkCard text-xs text-customMuted">
          <AlertCircle className="w-10 h-10 text-customDanger" />
          <span className="font-semibold text-customText">Map Tiles Loading Failed</span>
          <span className="max-w-xs">Map tiles could not be loaded. Check your internet connection.</span>
          <Button variant="outline" size="sm" onClick={() => setMapError(false)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry Load
          </Button>
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={defaultZoom}
          maxBounds={maxBounds}
          minZoom={2}
          maxZoom={18}
          className="flex-1 w-full"
          attributionControl={true}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
          keyboard={true}
        >
          {/* Change view handler */}
          <ChangeMapView center={mapCenter} bounds={mapBounds} />

          {/* OpenStreetMap tiles - No API key required */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            subdomains={['a', 'b', 'c']}
            eventHandlers={{
              tileerror: () => {
                console.error('Tile Layer load failed.');
                setMapError(true);
              }
            }}
          />

          {/* Only show real shipment markers when data exists */}
          {(!routes || routes.length === 0) && shipments && shipments.length > 0 && (
            <ShipmentMarker
              shipments={mode === 'details' && singleShipment ? [singleShipment] : shipments}
            />
          )}

          {/* Empty state when shipments exist but have no coordinates */}
          {(!routes || routes.length === 0) && 
           mode === 'dashboard' && 
           shipments && 
           shipments.length > 0 && 
           !shipments.some(s => (s.pickup?.latitude && s.pickup?.longitude) || (s.destination?.latitude && s.destination?.longitude)) && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
              <div className="bg-darkCard/95 border border-darkBorder rounded-lg px-6 py-4 text-center space-y-2 shadow-lg max-w-sm">
                <MapPin className="w-8 h-8 text-customMuted mx-auto" />
                <p className="text-xs font-bold text-customText">{isHindi ? "शिपमेंट स्थान जियोकोड हो रहे हैं..." : "Geocoding Shipment Locations..."}</p>
                <p className="text-[10px] text-customMuted">
                  {shipments.length} {isHindi ? "शिपमेंट मिले। पते को मानचित्र निर्देशांक में बदला जा रहा है।" : `shipment${shipments.length !== 1 ? 's' : ''} found. Converting addresses to map coordinates.`}
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-customPrimary">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{isHindi ? "इसमें थोड़ा समय लग सकता है..." : "This may take a moment..."}</span>
                </div>
              </div>
            </div>
          )}

          {/* Empty state when no shipments at all */}
          {(!routes || routes.length === 0) && 
           mode === 'dashboard' && 
           (!shipments || shipments.length === 0) && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
              <div className="bg-darkCard/95 border border-darkBorder rounded-lg px-6 py-4 text-center space-y-2 shadow-lg">
                <Database className="w-8 h-8 text-customMuted mx-auto" />
                <p className="text-xs font-bold text-customText">{isHindi ? "कोई सक्रिय शिपमेंट नहीं" : "No Active Shipments"}</p>
                <p className="text-[10px] text-customMuted max-w-xs">
                  {isHindi ? "उन्हें मानचित्र पर देखने के लिए शिपमेंट बनाएं।" : "Create shipments to visualize them on the map."}
                </p>
              </div>
            </div>
          )}

          {/* Render Alert Markers */}
          {alerts && alerts.map((alert) => {
            if (!alert.location || !alert.location.latitude || !alert.location.longitude) {
              return null;
            }
            const pos = [alert.location.latitude, alert.location.longitude];
            return (
              <Marker
                key={alert._id}
                position={pos}
                icon={getMapIcon(`ALERT_${alert.severity}`)}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 text-slate-200 w-[200px]">
                    <div className="flex items-center justify-between border-b border-darkBorder pb-1">
                      <span className="font-bold text-customPrimary uppercase text-[8px]">{alert.alertId}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        alert.severity === 'CRITICAL' ? 'bg-customDanger/10 text-customDanger border-customDanger/20' :
                        alert.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        alert.severity === 'MEDIUM' ? 'bg-customWarning/10 text-customWarning border-customWarning/20' :
                        'bg-customPrimary/10 text-customPrimary border-customPrimary/20'
                      }`}>
                        {translateSeverity(alert.severity)}
                      </span>
                    </div>
                    <span className="block font-bold text-slate-100 uppercase tracking-wide">{alert.title}</span>
                    <span className="block text-[10px] text-customMuted leading-snug">{alert.description}</span>
                    {alert.location.region && (
                      <span className="block text-[9px] text-customSecondary font-semibold">{isHindi ? "क्षेत्र:" : "Region:"} {alert.location.region}</span>
                    )}
                    <div className="pt-1.5 border-t border-darkBorder/40 flex justify-end">
                      <a
                        href={`/alerts?alert=${alert._id}`}
                        className="text-[9px] font-bold uppercase text-customPrimary hover:underline"
                      >
                        {isHindi ? "खतरे का निरीक्षण करें →" : "Inspect Hazard \u2192"}
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Route Alternative Geometries */}
          {routes && routes.map((route) => {
            const isSelectedRoute = route.routeId === selectedRouteId;
            const isHighlightedRoute = route.routeId === highlightedRouteId;
            const isRecommended = route.routeId === recommendedRouteId;
            const isThick = isSelectedRoute || isHighlightedRoute;
            const ranked = rankedRoutes?.find(r => r.routeId === route.routeId);
            
            let color = '#06B6D4'; // BALANCED -> Cyan
            if (route.type === 'FASTEST') color = '#3B82F6'; // Blue
            if (route.type === 'SAFEST') color = '#10B981'; // Green
            if (isRecommended && !isThick) color = '#F59E0B'; // Highlight recommended option with gold

            return (
              <Polyline
                key={route.routeId}
                positions={route.coordinates}
                pathOptions={{
                  color,
                  weight: isThick ? 6.5 : isRecommended ? 5.0 : 3.2,
                  opacity: isThick ? 1.0 : isRecommended ? 0.85 : 0.65,
                  dashArray: isSelectedRoute ? '0' : '6, 6',
                }}
                eventHandlers={{
                  click: () => {
                    if (onRouteClick) {
                      onRouteClick(route.routeId);
                    }
                  }
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 text-slate-200">
                    {/* Alert Indicators */}
                    {(() => {
                      const score = ranked ? ranked.combinedRiskScore : route.riskScore;
                      if (score > 75) {
                        return (
                          <span className="block text-center font-bold text-customDanger border border-customDanger/30 bg-customDanger/10 py-1 rounded animate-pulse select-none text-[8px] uppercase tracking-wider">
                            🚨 CRITICAL RISK ALERTS ACTIVE
                          </span>
                        );
                      }
                      if (score > 50) {
                        return (
                          <span className="block text-center font-bold text-orange-400 border border-orange-500/30 bg-orange-500/10 py-0.5 rounded select-none text-[8px] uppercase tracking-wider">
                            ⚠ HIGH RISK WARNINGS ACTIVE
                          </span>
                        );
                      }
                      if (score > 25) {
                        return (
                          <span className="block text-center font-bold text-customWarning border border-customWarning/30 bg-customWarning/10 py-0.5 rounded select-none text-[8px] uppercase tracking-wider">
                            ⚠ ROUTE CAUTION ACTIVE
                          </span>
                        );
                      }
                      return null;
                    })()}

                    <span className="font-bold text-slate-100 block border-b border-darkBorder pb-1 flex items-center gap-0.5">
                      {isRecommended ? '★ Recommended Route' : `${route.type} Route`}
                    </span>
                    <span className="block font-semibold text-customText">{route.name}</span>
                    <span className="block text-customMuted">
                      Distance: {route.distanceKm.toFixed(1)} km
                    </span>
                    {ranked && (
                      <>
                        <span className="block text-customWarning font-bold">
                          Suitability Score: {ranked.overallScore} / 100
                        </span>
                        <span className="block text-[10px] text-customMuted">
                          Accessibility Level: <strong className="uppercase text-customText">
                            {ranked.combinedRiskScore > 75 ? 'POOR' : ranked.combinedRiskScore > 50 ? 'LIMITED' : 'GOOD'}
                          </strong>
                        </span>
                        {ranked.combinedRiskScore > 50 && (
                          <span className="block text-customPrimary font-bold text-[9px] underline">
                            Recommended Action: Review Safer Alternatives
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Environmental/Risk overlay - only show if real data exists */}
          {showEnvOverlay && envSamples && envSamples.length > 0 && envSamples.map((sample, idx) => {
            // Only render if this is real risk data with coordinates
            if (!sample.coordinates || sample.coordinates.length !== 2) return null;
            
            const [lat, lon] = sample.coordinates;
            
            // Map risk level to colors
            let color = '#10B981'; // LOW -> green
            if (sample.overallRisk.level === 'MEDIUM') color = '#F59E0B'; // yellow/orange
            if (sample.overallRisk.level === 'HIGH') color = '#EF4444'; // red
            if (sample.overallRisk.level === 'CRITICAL') color = '#B91C1C'; // deep red

            return (
              <Circle
                key={idx}
                center={[lat, lon]}
                radius={20000} // 20 km radius
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1 text-slate-200">
                    <span className="font-bold text-slate-100 block border-b border-darkBorder pb-1">
                      {sample.locationName}
                    </span>
                    <span className="block">
                      Environmental Risk: <strong className="text-customWarning">{sample.overallRisk.score} / 100</strong>
                    </span>
                    <span className="block">
                      Level: <strong className="uppercase">{sample.overallRisk.level}</strong>
                    </span>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        </MapContainer>
      )}
    </div>
  );
};

export default LogisticsMap;
