import React, { useState, useEffect } from 'react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { getMapIcon } from './mapIcons';
import { Eye, Navigation, Shield, Package, Route } from 'lucide-react';
import { calculateRoadRoute } from '../../services/routingService';

const ShipmentMarker = ({ shipments = [] }) => {
  const [routeCache, setRouteCache] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState({});
  // Resolve coordinates helper - ONLY use real data
  const getCoordinates = (locData) => {
    if (!locData) return null;
    
    // Only use real coordinates from database
    if (locData.latitude && locData.longitude) {
      return [locData.latitude, locData.longitude];
    }
    
    // No fallback to demo locations - return null if coordinates missing
    return null;
  };

  // Fetch real road routes for shipments with coordinates
  useEffect(() => {
    const fetchRoutes = async () => {
      for (const shipment of shipments) {
        const pickupCoords = getCoordinates(shipment.pickup);
        const destCoords = getCoordinates(shipment.destination);
        
        // Skip if coordinates missing or route already cached/loading
        if (!pickupCoords || !destCoords) continue;
        
        const routeKey = `${shipment._id}`;
        if (routeCache[routeKey] || loadingRoutes[routeKey]) continue;
        
        // Mark as loading
        setLoadingRoutes(prev => ({ ...prev, [routeKey]: true }));
        
        try {
          // Convert [lat, lon] to [lon, lat] for ORS
          const start = [pickupCoords[1], pickupCoords[0]];
          const end = [destCoords[1], destCoords[0]];
          
          const routeData = await calculateRoadRoute(start, end);
          
          if (routeData.success) {
            setRouteCache(prev => ({
              ...prev,
              [routeKey]: routeData.coordinates
            }));
          } else {
            // Use fallback straight line if routing fails
            setRouteCache(prev => ({
              ...prev,
              [routeKey]: [pickupCoords, destCoords]
            }));
          }
        } catch (error) {
          console.error(`Failed to fetch route for ${shipment.shipmentId}:`, error);
          // Fallback to straight line
          setRouteCache(prev => ({
            ...prev,
            [routeKey]: [pickupCoords, destCoords]
          }));
        } finally {
          setLoadingRoutes(prev => ({ ...prev, [routeKey]: false }));
        }
      }
    };
    
    if (shipments.length > 0) {
      fetchRoutes();
    }
  }, [shipments]);


  // Color mappings for polyline based on status
  const getLineColor = (status) => {
    switch (status) {
      case 'AT_RISK':
        return '#F59E0B'; // orange
      case 'DELAYED':
        return '#EF4444'; // red
      case 'DELIVERED':
        return '#10B981'; // green
      case 'ROUTE_SELECTED':
      case 'IN_TRANSIT':
        return '#3B82F6'; // blue
      default:
        return '#94A3B8'; // gray
    }
  };

  // Priority color styling helper
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'LOW': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Status color styling helper
  const getStatusClass = (status) => {
    switch (status) {
      case 'ROUTE_PENDING': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'ROUTE_SELECTED': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'IN_TRANSIT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'AT_RISK': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELAYED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <>
      {shipments.map((shipment) => {
        const pickupCoords = getCoordinates(shipment.pickup);
        const destCoords = getCoordinates(shipment.destination);

        // Skip rendering if we can't map both endpoints
        if (!pickupCoords || !destCoords) return null;

        const routeKey = `${shipment._id}`;
        const routeCoordinates = routeCache[routeKey] || [pickupCoords, destCoords]; // Fallback to straight line

        const lineOptions = {
          color: getLineColor(shipment.status),
          weight: routeCache[routeKey] ? 3.5 : 2.5, // Thicker for real routes
          dashArray: routeCache[routeKey] ? '0' : '8, 8', // Solid for real routes, dashed for fallback
          opacity: routeCache[routeKey] ? 0.85 : 0.6,
        };

        const renderPopup = (isPickup) => (
          <Popup>
            <div className="text-xs space-y-2 p-0.5 text-customText w-[230px]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-darkBorder pb-1.5 mb-1.5">
                <span className="font-bold text-customPrimary text-xs">{shipment.shipmentId}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getPriorityClass(shipment.priority)}`}>
                  {shipment.priority}
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-customMuted">Status:</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${getStatusClass(shipment.status)}`}>
                  {shipment.status?.replace('_', ' ')}
                </span>
              </div>

              {/* Cargo Details */}
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-customMuted flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  Cargo Type:
                </span>
                <span className="font-semibold text-customText">
                  {shipment.goodsType?.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <span className="text-customMuted">Cargo Quantity:</span>
                <span className="font-semibold text-customText">
                  {shipment.quantity} {shipment.unit}
                </span>
              </div>

              {/* Current node designation */}
              <div className="bg-darkBgSecondary p-2 rounded text-[10px] space-y-1">
                <div className="font-semibold text-customText flex items-center gap-1">
                  {isPickup ? (
                    <>
                      <Navigation className="w-3 h-3 text-customSecondary" />
                      Origin Pickup Point
                    </>
                  ) : (
                    <>
                      <Route className="w-3 h-3 text-customPrimary" />
                      Target Destination Node
                    </>
                  )}
                </div>
                <span className="text-customMuted block leading-tight">
                  {isPickup ? shipment.pickup.locationName : shipment.destination.locationName}
                </span>
                {isPickup && shipment.pickup.address && (
                  <span className="text-[9px] text-customMuted/80 block">{shipment.pickup.address}</span>
                )}
                {!isPickup && shipment.destination.address && (
                  <span className="text-[9px] text-customMuted/80 block">{shipment.destination.address}</span>
                )}
              </div>

              {/* Action Details Link */}
              <div className="pt-2 border-t border-darkBorder/40">
                <Link
                  to={`/shipments/${shipment._id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-customPrimary hover:bg-customPrimaryHover text-[10px] font-bold uppercase tracking-wider text-customText rounded transition-colors no-underline cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Shipment Details</span>
                </Link>
              </div>
            </div>
          </Popup>
        );

        return (
          <React.Fragment key={shipment._id}>
            {/* Pickup Marker */}
            <Marker position={pickupCoords} icon={getMapIcon('PICKUP')}>
              {renderPopup(true)}
            </Marker>

            {/* Destination Marker */}
            <Marker position={destCoords} icon={getMapIcon('DESTINATION')}>
              {renderPopup(false)}
            </Marker>

            {/* Connecting Route - Real road route or fallback straight line */}
            <Polyline positions={routeCoordinates} pathOptions={lineOptions} />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default ShipmentMarker;
