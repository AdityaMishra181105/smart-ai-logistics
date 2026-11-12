import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, AlertTriangle, Loader, TrendingUp } from 'lucide-react';
import { calculateRoadRoute, geocodeAddress } from '../../services/routingService';

/**
 * Route Intelligence Panel
 * 
 * Displays route information WITHOUT a map.
 * - Geocodes addresses if coordinates missing
 * - Calculates real road distance and ETA
 * - Shows risk profile based on shipment data
 * - NO demo/fake data
 */
const RouteIntelligencePanel = ({ shipment }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);

  // Get or geocode coordinates
  useEffect(() => {
    const resolveCoordinates = async () => {
      if (!shipment) return;

      setLoading(true);
      setError(null);

      try {
        // Get pickup coordinates
        let pickup = null;
        if (shipment.pickup?.latitude && shipment.pickup?.longitude) {
          pickup = [shipment.pickup.latitude, shipment.pickup.longitude];
        } else if (shipment.pickup?.address || shipment.pickup?.locationName) {
          const address = shipment.pickup.address || shipment.pickup.locationName;
          const geocoded = await geocodeAddress(address);
          if (geocoded.success) {
            pickup = [geocoded.latitude, geocoded.longitude];
          }
        }

        // Get destination coordinates
        let destination = null;
        if (shipment.destination?.latitude && shipment.destination?.longitude) {
          destination = [shipment.destination.latitude, shipment.destination.longitude];
        } else if (shipment.destination?.address || shipment.destination?.locationName) {
          const address = shipment.destination.address || shipment.destination.locationName;
          const geocoded = await geocodeAddress(address);
          if (geocoded.success) {
            destination = [geocoded.latitude, geocoded.longitude];
          }
        }

        setPickupCoords(pickup);
        setDestCoords(destination);

        // Calculate route if both coordinates available
        if (pickup && destination) {
          const route = await calculateRoadRoute(
            [pickup[1], pickup[0]], // [lon, lat]
            [destination[1], destination[0]]
          );

          if (route.success) {
            setRouteData(route);
            setError(null);
          } else {
            setError('Unable to calculate route at this time.');
            // Still set fallback data for straight-line distance
            setRouteData(route);
          }
        } else {
          setError(pickup ? 'Destination location could not be resolved.' : 'Pickup location could not be resolved.');
        }
      } catch (err) {
        console.error('Route calculation error:', err);
        setError('Unable to calculate route information.');
      } finally {
        setLoading(false);
      }
    };

    resolveCoordinates();
  }, [shipment]);

  // Determine risk level based on shipment data
  const getRiskLevel = () => {
    if (!shipment) return 'Unknown';

    // Use selectedRoute risk if available
    if (shipment.selectedRoute?.riskLevel) {
      return shipment.selectedRoute.riskLevel;
    }

    // Otherwise determine from status
    switch (shipment.status) {
      case 'DELAYED':
      case 'AT_RISK':
        return 'High';
      case 'IN_TRANSIT':
        return 'Medium';
      case 'DELIVERED':
        return 'Low';
      default:
        return 'Pending';
    }
  };

  const getRiskColor = (level) => {
    const levelStr = typeof level === 'string' ? level.toLowerCase() : '';
    if (levelStr.includes('high') || levelStr.includes('critical')) return 'text-customDanger';
    if (levelStr.includes('medium') || levelStr.includes('moderate')) return 'text-orange-400';
    if (levelStr.includes('low')) return 'text-customSuccess';
    return 'text-customMuted';
  };

  // Format distance
  const formatDistance = () => {
    if (routeData?.distanceKm && routeData.distanceKm > 0) {
      return `${routeData.distanceKm} km`;
    }
    if (shipment?.selectedRoute?.distanceKm) {
      return `${shipment.selectedRoute.distanceKm.toFixed(1)} km`;
    }
    return 'Unavailable';
  };

  // Format duration
  const formatDuration = () => {
    let mins = null;
    
    if (routeData?.durationMinutes && routeData.durationMinutes > 0) {
      mins = routeData.durationMinutes;
    } else if (shipment?.selectedRoute?.estimatedDurationMinutes) {
      mins = shipment.selectedRoute.estimatedDurationMinutes;
    }

    if (mins) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
    }

    return 'Unavailable';
  };

  // Route status
  const getRouteStatus = () => {
    if (pickupCoords && destCoords && routeData && !error) {
      return 'Available';
    }
    if (error) {
      return 'Unavailable';
    }
    if (loading) {
      return 'Calculating...';
    }
    return 'Pending';
  };

  if (!shipment) {
    return (
      <div className="bg-darkBgSecondary/40 border border-dashed border-darkBorder rounded-lg p-4 text-center text-xs text-customMuted">
        <MapPin className="w-5 h-5 text-customWarning mx-auto mb-2" />
        <span className="font-semibold text-customText block">No Shipment Data</span>
        <span className="mt-0.5 block">Select a shipment to view route intelligence.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {loading && (
        <div className="bg-darkBgSecondary/60 border border-darkBorder rounded-lg p-4 flex items-center gap-3 text-xs">
          <Loader className="w-5 h-5 text-customPrimary animate-spin flex-shrink-0" />
          <div>
            <span className="font-semibold text-customText block">Analyzing Route Data...</span>
            <span className="text-customMuted text-[10px] block mt-0.5">Geocoding addresses and calculating distance</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-customWarning/10 border border-customWarning/30 rounded-lg p-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-customWarning flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-customWarning block">Route Calculation Issue</span>
            <span className="text-customMuted text-[10px] block mt-0.5">{error}</span>
          </div>
        </div>
      )}

      {/* Route Intelligence Data */}
      {!loading && (
        <div className="bg-darkBgSecondary/60 border border-darkBorder rounded-lg p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-darkBorder/40">
            <span className="font-bold text-customText flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-customPrimary" />
              Route Intelligence
            </span>
            <span className="text-[10px] text-customMuted uppercase tracking-wider">
              {getRouteStatus()}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            {/* Distance */}
            <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-2">
              <span className="text-customMuted block mb-1 text-[9px] uppercase font-semibold">Distance</span>
              <span className="font-bold text-customText block">{formatDistance()}</span>
            </div>

            {/* Travel Time */}
            <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-2">
              <span className="text-customMuted block mb-1 text-[9px] uppercase font-semibold flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                Travel Time
              </span>
              <span className="font-bold text-customText block">{formatDuration()}</span>
            </div>

            {/* Risk Profile */}
            <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-2">
              <span className="text-customMuted block mb-1 text-[9px] uppercase font-semibold">Risk Profile</span>
              <span className={`font-bold block ${getRiskColor(getRiskLevel())}`}>
                {getRiskLevel()}
              </span>
            </div>
          </div>

          {/* Route Summary */}
          {routeData && routeData.success && (
            <div className="mt-2 pt-2 border-t border-darkBorder/40 text-[10px] text-customMuted">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-customSuccess" />
                <span>Real road route calculated successfully</span>
              </div>
            </div>
          )}

          {/* Fallback route notice */}
          {routeData && routeData.fallback && (
            <div className="mt-2 pt-2 border-t border-darkBorder/40 text-[10px]">
              <div className="flex items-start gap-1.5 text-customWarning">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Showing direct path. Real road routing temporarily unavailable.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteIntelligencePanel;
