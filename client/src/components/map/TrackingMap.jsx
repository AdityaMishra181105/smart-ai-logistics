import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Truck, MapPin, Package, Navigation, Clock, AlertCircle, Loader } from 'lucide-react';
import { calculateRoadRoute } from '../../services/routingService';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for pickup location (green)
const pickupIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #10b981;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-center;
    ">
      <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Custom icon for destination (blue)
const destinationIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-center;
    ">
      <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Custom icon for vehicle/truck (orange - current position)
const vehicleIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #f59e0b;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
      display: flex;
      align-items: center;
      justify-center;
      animation: pulse 2s ease-in-out infinite;
    ">
      <svg style="width: 22px; height: 22px; color: white;" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 18.5a1.5 1.5 0 01-1.5-1.5 1.5 1.5 0 011.5-1.5 1.5 1.5 0 011.5 1.5 1.5 1.5 0 01-1.5 1.5m1.5-9l1.96 2.5H17V9.5M6 18.5A1.5 1.5 0 014.5 17 1.5 1.5 0 016 15.5 1.5 1.5 0 017.5 17 1.5 1.5 0 016 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 003 3 3 3 0 003-3h6a3 3 0 003 3 3 3 0 003-3h2v-5l-3-4z"/>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    </style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Component to fit map bounds
const FitBounds = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  // Handle map resize
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
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

const TrackingMap = ({ shipment, height = '500px' }) => {
  const [mapError, setMapError] = useState(false);
  const [realRoute, setRealRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Get coordinates for pickup and destination - ONLY from real data
  const getCoordinates = (locData) => {
    if (!locData) return null;
    
    // Only use real coordinates from the location data
    if (locData.latitude && locData.longitude) {
      return [locData.latitude, locData.longitude];
    }
    
    // No fallback to demo data - return null if coordinates missing
    return null;
  };

  const pickupCoords = useMemo(() => {
    return shipment ? getCoordinates(shipment.pickup) : null;
  }, [shipment]);

  const destinationCoords = useMemo(() => {
    return shipment ? getCoordinates(shipment.destination) : null;
  }, [shipment]);

  // Fetch real road route when coordinates are available
  useEffect(() => {
    const fetchRealRoute = async () => {
      // Skip if no coordinates
      if (!pickupCoords || !destinationCoords) {
        setRealRoute(null);
        return;
      }

      // Skip if route already exists in shipment
      if (shipment?.selectedRoute?.coordinates && Array.isArray(shipment.selectedRoute.coordinates) && shipment.selectedRoute.coordinates.length > 2) {
        setRealRoute(shipment.selectedRoute.coordinates);
        return;
      }

      setLoadingRoute(true);
      setRouteError(null);

      try {
        // Call routing service: expects [lon, lat] format
        const start = [pickupCoords[1], pickupCoords[0]]; // Convert [lat, lon] to [lon, lat]
        const end = [destinationCoords[1], destinationCoords[0]];
        
        const result = await calculateRoadRoute(start, end);
        
        if (result.success && result.coordinates) {
          setRealRoute(result.coordinates);
          setRouteError(null);
        } else if (result.fallback) {
          // Routing failed, using fallback straight line
          setRealRoute(result.coordinates);
          setRouteError('Unable to calculate road route. Showing direct path.');
        } else {
          setRouteError('Route calculation failed');
          setRealRoute([pickupCoords, destinationCoords]); // Fallback to straight line
        }
      } catch (error) {
        console.error('Route fetch error:', error);
        setRouteError('Unable to calculate the route at this time.');
        setRealRoute([pickupCoords, destinationCoords]); // Fallback to straight line
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRealRoute();
  }, [pickupCoords, destinationCoords, shipment]);

  // Get route coordinates - prioritize real route from routing service
  const routeCoords = useMemo(() => {
    // Use real calculated route if available
    if (realRoute && Array.isArray(realRoute) && realRoute.length > 0) {
      return realRoute;
    }
    
    // Fallback to shipment's selected route if it exists
    if (shipment?.selectedRoute?.coordinates && Array.isArray(shipment.selectedRoute.coordinates)) {
      return shipment.selectedRoute.coordinates;
    }
    
    // Final fallback: straight line between pickup and destination
    if (pickupCoords && destinationCoords) {
      return [pickupCoords, destinationCoords];
    }
    
    return [];
  }, [realRoute, shipment, pickupCoords, destinationCoords]);

  // Calculate current vehicle position based on status
  const vehiclePosition = useMemo(() => {
    if (!routeCoords || routeCoords.length === 0) return null;
    
    // Position vehicle along the route based on status
    const status = shipment?.status;
    let progress = 0;
    
    switch (status) {
      case 'CREATED':
      case 'ROUTE_PENDING':
      case 'ROUTE_SELECTED':
        progress = 0; // At pickup
        break;
      case 'IN_TRANSIT':
        progress = 0.5; // Middle of journey
        break;
      case 'DELAYED':
      case 'AT_RISK':
        progress = 0.6; // Slightly past middle
        break;
      case 'DELIVERED':
        progress = 1; // At destination
        break;
      default:
        progress = 0;
    }
    
    // Calculate position along route
    if (routeCoords.length === 2) {
      // Simple interpolation between two points
      const [lat1, lon1] = routeCoords[0];
      const [lat2, lon2] = routeCoords[routeCoords.length - 1];
      return [
        lat1 + (lat2 - lat1) * progress,
        lon1 + (lon2 - lon1) * progress
      ];
    } else {
      // For multi-point routes, find the segment
      const totalSegments = routeCoords.length - 1;
      const segmentIndex = Math.floor(progress * totalSegments);
      const segmentProgress = (progress * totalSegments) - segmentIndex;
      
      const pointA = routeCoords[Math.min(segmentIndex, routeCoords.length - 1)];
      const pointB = routeCoords[Math.min(segmentIndex + 1, routeCoords.length - 1)];
      
      return [
        pointA[0] + (pointB[0] - pointA[0]) * segmentProgress,
        pointA[1] + (pointB[1] - pointA[1]) * segmentProgress
      ];
    }
  }, [routeCoords, shipment?.status]);

  // Calculate bounds for the map
  const mapBounds = useMemo(() => {
    if (pickupCoords && destinationCoords) {
      return [pickupCoords, destinationCoords];
    }
    return null;
  }, [pickupCoords, destinationCoords]);

  // Default center (neutral India center, not NE India)
  const defaultCenter = [20.5937, 78.9629];

  // Show empty state if no shipment or no coordinates
  if (!shipment) {
    return (
      <div className="relative border border-darkBorder rounded-lg overflow-hidden bg-darkCard flex flex-col items-center justify-center text-center p-8" style={{ height }}>
        <Package className="w-16 h-16 text-customMuted mb-4" />
        <h3 className="text-lg font-semibold text-customText mb-2">No Shipment Selected</h3>
        <p className="text-sm text-customMuted max-w-md">
          Select a shipment to view live tracking with pickup location, destination, and real-time route information.
        </p>
      </div>
    );
  }

  if (!pickupCoords && !destinationCoords) {
    return (
      <div className="relative border border-darkBorder rounded-lg overflow-hidden bg-darkCard flex flex-col items-center justify-center text-center p-8" style={{ height }}>
        <AlertCircle className="w-16 h-16 text-customWarning mb-4" />
        <h3 className="text-lg font-semibold text-customText mb-2">Location Data Unavailable</h3>
        <p className="text-sm text-customMuted max-w-md">
          Pickup or destination coordinates are not available for this shipment. Please ensure location data is properly configured.
        </p>
        <div className="mt-4 text-xs text-customMuted bg-darkBgSecondary border border-darkBorder rounded-lg p-3">
          <p className="font-semibold">Shipment: {shipment.shipmentId}</p>
          <p className="mt-1">Pickup: {shipment.pickup?.locationName || 'Unknown'}</p>
          <p>Destination: {shipment.destination?.locationName || 'Unknown'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border border-darkBorder rounded-lg overflow-hidden bg-darkCard" style={{ height }}>
      {mapError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-darkCard text-xs text-customMuted" style={{ height }}>
          <AlertCircle className="w-10 h-10 text-customDanger" />
          <span className="font-semibold text-customText">Map Loading Failed</span>
          <span className="max-w-xs">Unable to load map tiles. Please check your internet connection.</span>
        </div>
      ) : (
        <MapContainer
          center={pickupCoords || defaultCenter}
          zoom={8}
          className="w-full h-full"
          zoomControl={true}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
          keyboard={true}
          minZoom={2}
          maxZoom={18}
        >
          <FitBounds bounds={mapBounds} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            eventHandlers={{
              tileerror: () => {
                console.error('Map tile loading failed');
                setMapError(true);
              }
            }}
          />

          {/* Pickup Marker */}
          {pickupCoords && (
            <Marker position={pickupCoords} icon={pickupIcon}>
            </Marker>
          )}

          {/* Destination Marker */}
          {destinationCoords && (
            <Marker position={destinationCoords} icon={destinationIcon}>
            </Marker>
          )}

          {/* Route Polyline */}
          {routeCoords.length > 0 && (
            <>
              {/* Background route line (gray) */}
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#374151',
                  weight: 8,
                  opacity: 0.5,
                }}
              />
              {/* Active route line (blue) */}
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 4,
                  opacity: 0.9,
                }}
              />
            </>
          )}

          {/* Vehicle Position Marker (only show if in transit or beyond) */}
          {vehiclePosition && shipment.status !== 'CREATED' && shipment.status !== 'ROUTE_PENDING' && shipment.status !== 'ROUTE_SELECTED' && (
            <Marker position={vehiclePosition} icon={vehicleIcon}>
            </Marker>
          )}
        </MapContainer>
      )}

      {/* Floating info card */}
      <div className="absolute top-4 left-4 bg-darkCard/95 border border-darkBorder rounded-lg p-3 shadow-lg max-w-xs z-[1000]">
        {loadingRoute && (
          <div className="mb-3 flex items-center gap-2 text-customPrimary text-xs">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Calculating road route...</span>
          </div>
        )}
        
        {routeError && !loadingRoute && (
          <div className="mb-3 flex items-start gap-2 text-customWarning text-xs bg-customWarning/10 border border-customWarning/20 rounded p-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{routeError}</span>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <div className="p-2 bg-customPrimary/10 rounded-lg">
            <Truck className="w-5 h-5 text-customPrimary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-customText truncate">{shipment.shipmentId}</p>
            <p className="text-xs text-customMuted mt-0.5">{shipment.goodsType.replace('_', ' ')}</p>
          </div>
        </div>
        
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-customSuccess mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-customMuted text-[10px]">Pickup</p>
              <p className="text-customText font-medium truncate">{shipment.pickup?.locationName}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-customPrimary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-customMuted text-[10px]">Destination</p>
              <p className="text-customText font-medium truncate">{shipment.destination?.locationName}</p>
            </div>
          </div>
        </div>

        {shipment.selectedRoute && (
          <div className="mt-3 pt-3 border-t border-darkBorder text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-customMuted">Distance</span>
              <span className="text-customText font-semibold">{shipment.selectedRoute.distanceKm?.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-customMuted">Est. Duration</span>
              <span className="text-customText font-semibold">{Math.floor(shipment.selectedRoute.estimatedDurationMinutes / 60)}h {shipment.selectedRoute.estimatedDurationMinutes % 60}m</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingMap;
