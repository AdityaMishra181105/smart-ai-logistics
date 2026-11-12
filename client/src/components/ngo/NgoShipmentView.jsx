import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Navigation, Clock, AlertTriangle, Truck, Radio,
  CheckCircle2, Compass, UserCheck, RefreshCw, AlertOctagon, ShieldAlert
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { calculateRoadRoute } from '../../services/routingService';
import { useLanguage } from '../../context/LanguageContext';
import useSocket from '../../hooks/useSocket';
import api from '../../services/api';

// Custom icons for Leaflet Map
const pickupMarkerIcon = L.divIcon({
  html: `<div style="background:#10b981;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,0.8);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">📍</div>`,
  className: 'custom-pickup-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const destMarkerIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.8);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">🏁</div>`,
  className: 'custom-dest-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const driverGpsIcon = L.divIcon({
  html: `<div style="background:#06b6d4;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 0 14px rgba(6,182,212,0.9);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;" class="animate-pulse">🚚</div>`,
  className: 'custom-driver-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Helper for distance calculation (Haversine formula in km)
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Shortest distance from point P(lat, lon) to segment AB [(latA, lonA), (latB, lonB)] in km
const pointToSegmentDistanceKm = (pLat, pLon, latA, lonA, latB, lonB) => {
  const meanLatRad = (((latA + latB) / 2) * Math.PI) / 180;
  const cosMeanLat = Math.cos(meanLatRad);

  const dxAB = (lonB - lonA) * cosMeanLat;
  const dyAB = latB - latA;

  const dxAP = (pLon - lonA) * cosMeanLat;
  const dyAP = pLat - latA;

  const lenSq = dxAB * dxAB + dyAB * dyAB;

  if (lenSq === 0) {
    return calculateHaversineDistance(pLat, pLon, latA, lonA);
  }

  let t = (dxAP * dxAB + dyAP * dyAB) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearestLat = latA + t * dyAB;
  const nearestLon = lonA + (t * dxAB) / (cosMeanLat || 1);

  return calculateHaversineDistance(pLat, pLon, nearestLat, nearestLon);
};

// Shortest distance from Driver GPS P(lat, lon) to entire LineString polyline [[lat, lon], ...]
const pointToPolylineDistanceKm = (pLat, pLon, polyline) => {
  if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
    return null;
  }

  let minDistance = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ptA = polyline[i];
    const ptB = polyline[i + 1];

    if (!ptA || !ptB || ptA.length < 2 || ptB.length < 2) continue;

    const dist = pointToSegmentDistanceKm(
      pLat, pLon,
      ptA[0], ptA[1],
      ptB[0], ptB[1]
    );

    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance === Infinity ? null : minDistance;
};

// Map Bounds Auto-fitter
const MapBoundsFitter = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        console.error('Fit bounds error:', err);
      }
    }
  }, [bounds, map]);
  return null;
};

// Map Wheel Zoom Enabler
const MapWheelZoomHandler = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.scrollWheelZoom.enable();
    const container = map.getContainer();
    const handleWheel = (e) => {
      e.stopPropagation();
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [map]);
  return null;
};

const NgoShipmentView = ({ shipment, onRefresh }) => {
  const navigate = useNavigate();
  const { t, translateStatus } = useLanguage();

  // Live Telemetry Tracking State
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Pickup Road Routing State (Driver GPS -> Pickup Location)
  const [pickupRouting, setPickupRouting] = useState({
    distanceKm: null,
    durationMinutes: null,
    loading: false,
    error: null
  });

  const lastRoutingCoordsRef = useRef(null);
  const lastRoutingTimeRef = useRef(0);

  // Fetch telemetry from backend
  const fetchTracking = async () => {
    if (!shipment || !shipment._id) return;
    try {
      const res = await api.get(`/tracking/${shipment._id}`);
      if (res.data && res.data.success) {
        setTrackingData(res.data.tracking);
      }
    } catch (err) {
      console.error('[NgoShipmentView] Tracking fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, [shipment?._id]);

  // Real-time Socket.IO Location Updates
  useSocket('vehicle:location:update', (data) => {
    if (data && String(data.shipmentId) === String(shipment?._id)) {
      setTrackingData(prev => ({
        ...(prev || {}),
        liveLocation: data.liveLocation
      }));
    }
  });

  useSocket('location:update', (data) => {
    if (data && String(data.shipmentId) === String(shipment?._id)) {
      setTrackingData(prev => ({
        ...(prev || {}),
        liveLocation: data.liveLocation
      }));
    }
  });

  const liveLoc = trackingData?.liveLocation || shipment?.liveLocation;
  const hasLiveGps = liveLoc && liveLoc.latitude !== null && liveLoc.longitude !== null && liveLoc.latitude !== undefined && liveLoc.longitude !== undefined;

  // Pickup & Destination Coordinates
  const pickupCoords = shipment.pickup?.latitude && shipment.pickup?.longitude
    ? [shipment.pickup.latitude, shipment.pickup.longitude]
    : [26.8467, 80.9462];

  const destCoords = shipment.destination?.latitude && shipment.destination?.longitude
    ? [shipment.destination.latitude, shipment.destination.longitude]
    : [28.6692, 77.4538];

  const driverCurrentCoords = hasLiveGps ? [liveLoc.latitude, liveLoc.longitude] : null;

  // Resolve selected route geometry LineString coordinates from MongoDB
  const getSelectedRouteGeometry = () => {
    if (shipment?.selectedRoute?.coordinates && Array.isArray(shipment.selectedRoute.coordinates) && shipment.selectedRoute.coordinates.length >= 2) {
      return shipment.selectedRoute.coordinates.map(c => {
        if (Array.isArray(c) && c.length >= 2) {
          if (c[0] > 50 && c[1] < 40) {
            return [c[1], c[0]];
          }
          return [c[0], c[1]];
        }
        return c;
      });
    }
    if (shipment?.selectedRoute?.geometry?.coordinates && Array.isArray(shipment.selectedRoute.geometry.coordinates) && shipment.selectedRoute.geometry.coordinates.length >= 2) {
      return shipment.selectedRoute.geometry.coordinates.map(c => [c[1], c[0]]);
    }
    return [];
  };

  const selectedRoutePolyline = getSelectedRouteGeometry();
  const routeGeometryValid = selectedRoutePolyline.length >= 2;

  // Calculate Shortest Point-to-LineString Route Deviation
  let routeDeviationKm = null;
  let isOffRoute = false;

  if (hasLiveGps && driverCurrentCoords && routeGeometryValid) {
    const minLineDist = pointToPolylineDistanceKm(
      driverCurrentCoords[0],
      driverCurrentCoords[1],
      selectedRoutePolyline
    );

    if (minLineDist !== null) {
      routeDeviationKm = parseFloat(minLineDist.toFixed(1));
      if (routeDeviationKm > 5.0) {
        isOffRoute = true;
      }
    }
  }

  // Real-time Road Distance & ETA calculation from Driver GPS to Pickup Location via OSRM
  useEffect(() => {
    if (!hasLiveGps || !driverCurrentCoords || !shipment?.pickup?.latitude || !shipment?.pickup?.longitude) {
      setPickupRouting({
        distanceKm: null,
        durationMinutes: null,
        loading: false,
        error: null
      });
      return;
    }

    const driverLat = driverCurrentCoords[0];
    const driverLon = driverCurrentCoords[1];
    const pickupLat = shipment.pickup.latitude;
    const pickupLon = shipment.pickup.longitude;

    const now = Date.now();
    const lastTime = lastRoutingTimeRef.current;
    const lastCoords = lastRoutingCoordsRef.current;

    // Throttle: avoid calling OSRM API if < 10 seconds ago AND moved < 0.2 km
    if (lastCoords && (now - lastTime < 10000)) {
      const movedKm = calculateHaversineDistance(driverLat, driverLon, lastCoords[0], lastCoords[1]);
      if (movedKm < 0.2) {
        return;
      }
    }

    lastRoutingTimeRef.current = now;
    lastRoutingCoordsRef.current = [driverLat, driverLon];

    let isMounted = true;
    setPickupRouting(prev => ({ ...prev, loading: prev.distanceKm === null }));

    const fetchPickupRoute = async () => {
      try {
        const res = await calculateRoadRoute(
          [driverLon, driverLat], // OSRM [longitude, latitude]
          [pickupLon, pickupLat]  // OSRM [longitude, latitude]
        );

        if (isMounted) {
          if (res && res.success && !res.fallback) {
            setPickupRouting({
              distanceKm: res.distanceKm,
              durationMinutes: res.durationMinutes,
              loading: false,
              error: null
            });
          } else {
            setPickupRouting({
              distanceKm: null,
              durationMinutes: null,
              loading: false,
              error: res?.error || 'Routing failed'
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setPickupRouting({
            distanceKm: null,
            durationMinutes: null,
            loading: false,
            error: err.message
          });
        }
      }
    };

    fetchPickupRoute();

    return () => {
      isMounted = false;
    };
  }, [
    hasLiveGps,
    liveLoc?.latitude,
    liveLoc?.longitude,
    shipment?.pickup?.latitude,
    shipment?.pickup?.longitude
  ]);

  // Compute map bounds
  const mapBounds = [pickupCoords, destCoords];
  if (driverCurrentCoords) mapBounds.push(driverCurrentCoords);
  if (selectedRoutePolyline.length > 0) {
    selectedRoutePolyline.forEach(pt => mapBounds.push(pt));
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'LOW': return <Badge variant="neutral">{t('lowPriority', 'Low Priority')}</Badge>;
      case 'MEDIUM': return <Badge variant="info">{t('mediumPriority', 'Medium Priority')}</Badge>;
      case 'HIGH': return <Badge variant="warning">{t('highPriority', 'High Priority')}</Badge>;
      case 'CRITICAL': return <Badge variant="danger">{t('criticalPriority', 'Critical Priority')}</Badge>;
      default: return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ROUTE_PENDING':
        return <Badge variant="neutral" className="border-slate-500/40 text-slate-400 bg-slate-500/10">{translateStatus('ROUTE_PENDING')}</Badge>;
      case 'ROUTE_SELECTED':
        return <Badge variant="primary" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10">{translateStatus('ROUTE_SELECTED')}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info" className="border-blue-500/40 text-blue-400 bg-blue-500/10 font-bold animate-pulse">{translateStatus('IN_TRANSIT')}</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10 font-bold">{translateStatus('AT_RISK')}</Badge>;
      case 'DELAYED':
        return <Badge variant="danger" className="border-red-500/40 text-red-400 bg-red-500/10 font-bold">{translateStatus('DELAYED')}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-bold">{translateStatus('DELIVERED')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" className="border-gray-500/40 text-gray-500 bg-gray-500/10">{translateStatus('CANCELLED')}</Badge>;
      default:
        return <Badge variant="neutral">{translateStatus(status)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-darkBorder">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="p-2"
            onClick={() => navigate('/shipments')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-customPrimary/20 text-customPrimary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-customPrimary/30">
                {t('ngoLiveShipmentTrackingHeader', 'NGO Live Shipment Tracking')}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-customText">
                {t('shipment', 'Shipment')} {shipment.shipmentId}
              </h1>
            </div>
            <p className="text-xs text-customMuted mt-0.5">
              {t('ngoShipmentSub', 'Real-time vehicle telemetry, confirmed route map, and arrival monitoring')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getPriorityBadge(shipment.priority)}
          {getStatusBadge(shipment.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracking}
            className="font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 border-darkBorder"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('refreshBtn', 'Refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shipment Info & Live GPS Telemetry Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Cargo & Transport Summary Card */}
          <Card className="p-4 sm:p-5">
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {t('shipmentInformation', 'Shipment & Transport Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 pb-2.5 border-b border-darkBorder/40">
                  <span className="text-customMuted font-medium">{t('shipmentReference', 'Shipment Reference')}</span>
                  <span className="font-bold text-customText font-mono text-right">{shipment.shipmentId}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 pb-2.5 border-b border-darkBorder/40">
                  <span className="text-customMuted font-medium">{t('cargo', 'Cargo Category')}</span>
                  <span className="font-semibold text-customText text-right capitalize">{shipment.goodsType?.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 pb-2.5 border-b border-darkBorder/40">
                  <span className="text-customMuted font-medium">{t('quantity', 'Quantity / Load')}</span>
                  <span className="font-bold text-customText text-right">{shipment.quantity} {shipment.unit}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 pb-2.5 border-b border-darkBorder/40">
                  <span className="text-customMuted font-medium">{t('assignedVehicle', 'Assigned Vehicle')}</span>
                  <span className="font-bold text-cyan-400 uppercase font-mono text-right">
                    {shipment.assignedVehicle?.registrationNumber || shipment.vehicleNumber || t('notSpecified', 'Not Specified')}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 pb-2.5 border-b border-darkBorder/40">
                  <span className="text-customMuted font-medium">{t('assignedDriver', 'Assigned Driver')}</span>
                  <span className="font-semibold text-customText text-right">
                    {shipment.assignedDriver?.name || t('notSpecified', 'Not Specified')}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-3 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-lg space-y-1">
                  <span className="text-customMuted block text-[10px] uppercase font-bold tracking-wider">{t('pickupLocation', 'Pickup Location')}</span>
                  <span className="font-semibold text-customText text-xs flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{shipment.pickup?.locationName}</span>
                  </span>
                </div>
                <div className="p-3 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-lg space-y-1">
                  <span className="text-customMuted block text-[10px] uppercase font-bold tracking-wider">{t('destinationLocation', 'Destination Location')}</span>
                  <span className="font-semibold text-customText text-xs flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{shipment.destination?.locationName}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Location Telemetry Panel */}
          <Card className={`border ${
            hasLiveGps
              ? 'border-customSuccess/40 bg-customSuccess/5'
              : 'border-darkBorder'
          }`}>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${hasLiveGps ? 'text-customSuccess animate-pulse' : ''}`} />
                  {t('vehicleTelemetryStatus', 'Vehicle Telemetry Status')}
                </CardTitle>
                {hasLiveGps ? (
                  <Badge variant="success" className="text-[9px] uppercase font-extrabold animate-pulse">
                    ● {t('gpsConnected', 'GPS Connected')}
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[9px] uppercase font-semibold">
                    {t('gpsOffline', 'GPS Offline')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {hasLiveGps ? (
                <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-customSuccess flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-customSuccess animate-ping" />
                      {t('liveVehicleTrackingActive', 'LIVE VEHICLE TRACKING ACTIVE')}
                    </span>
                    <span className="text-[10px] text-customMuted font-mono">
                      {liveLoc.updatedAt ? new Date(liveLoc.updatedAt).toLocaleTimeString() : t('justNow', 'Just now')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-customSuccess/20 text-[11px]">
                    <div>
                      <span className="text-customMuted block text-[9px]">{t('latitude', 'Latitude')}</span>
                      <span className="font-mono font-bold text-customText">{liveLoc.latitude?.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-customMuted block text-[9px]">{t('longitude', 'Longitude')}</span>
                      <span className="font-mono font-bold text-customText">{liveLoc.longitude?.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-customMuted block text-[9px]">{t('currentSpeed', 'Current Speed')}</span>
                      <span className="font-bold text-cyan-400">
                        {liveLoc.speed !== null && liveLoc.speed !== undefined ? `${liveLoc.speed} km/h` : t('na', 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-customMuted block text-[9px]">{t('gpsAccuracy', 'GPS Accuracy')}</span>
                      <span className="font-bold text-customText">
                        {liveLoc.accuracy !== null && liveLoc.accuracy !== undefined ? `±${liveLoc.accuracy} m` : t('na', 'N/A')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl space-y-2 text-center text-customMuted">
                  <AlertOctagon className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-bold text-customText text-xs">{t('liveLocationUnavailable', 'Live location unavailable')}</p>
                  <p className="text-[10px] leading-relaxed">
                    {t('driverGpsOffNotice', 'The assigned driver has not enabled live GPS sharing yet. The confirmed shipment route remains displayed on the map.')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Route Map & Live Navigation Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-3 flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Compass className="w-4 h-4" />
                {t('selectedRouteTrackingMap', 'Selected Route & Live Tracking Map')}
              </CardTitle>
              {hasLiveGps && routeDeviationKm !== null ? (
                isOffRoute ? (
                  <Badge variant="danger" className="text-[10px] uppercase font-black animate-pulse">
                    ⚠️ {t('routeDeviationDetected', 'ROUTE DEVIATION DETECTED')} ({routeDeviationKm} km)
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] uppercase font-bold">
                    ✓ {t('withinRouteCorridor', 'WITHIN ROUTE CORRIDOR')} ({routeDeviationKm} km)
                  </Badge>
                )
              ) : !routeGeometryValid && hasLiveGps ? (
                <Badge variant="neutral" className="text-[10px] uppercase font-semibold">
                  {t('routeGeometryUnavailable', 'Route Geometry Unavailable')}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Prediction Metrics Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-darkBgSecondary/70 border border-darkBorder/60 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider block">{t('selectedRoute', 'Selected Route')}</span>
                  <strong className="text-customText block font-semibold text-xs truncate">
                    {shipment.selectedRoute?.name || t('primaryConfirmedRoute', 'Primary Confirmed Route')}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/70 border border-darkBorder/60 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider block">{t('totalRouteDistance', 'Total Route Distance')}</span>
                  <strong className="text-customText block font-bold text-xs">
                    {shipment.selectedRoute?.distanceKm ? `${shipment.selectedRoute.distanceKm} km` : t('na', 'N/A')}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/70 border border-darkBorder/60 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider block">{t('distanceToPickup', 'Distance to Pickup')}</span>
                  <strong className="text-cyan-400 block font-bold text-xs">
                    {pickupRouting.loading
                      ? t('calculating', 'Calculating...')
                      : pickupRouting.distanceKm !== null
                      ? `${pickupRouting.distanceKm} km`
                      : t('na', 'N/A')}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/70 border border-darkBorder/60 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider block">{t('etaToPickup', 'ETA to Pickup')}</span>
                  <strong className="text-customSuccess block font-bold text-xs">
                    {pickupRouting.loading
                      ? t('calculating', 'Calculating...')
                      : pickupRouting.durationMinutes !== null
                      ? (pickupRouting.durationMinutes >= 60
                          ? `${Math.floor(pickupRouting.durationMinutes / 60)}h ${pickupRouting.durationMinutes % 60}m`
                          : `${pickupRouting.durationMinutes} min`)
                      : t('na', 'N/A')}
                  </strong>
                </div>
              </div>

              {/* Off-Route Alert Banner */}
              {hasLiveGps && isOffRoute && routeDeviationKm !== null && (
                <div className="p-3.5 bg-customDanger/15 border-2 border-customDanger rounded-xl text-xs flex items-center justify-between gap-3 text-customDanger animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase block text-xs">⚠️ {t('offRouteDeviationBanner', 'OFF ROUTE DEVIATION')}</span>
                      <span className="text-[10px] text-customMuted block">
                        {t('vehicleOffRouteNotice', 'The vehicle position is away from the Admin-selected transit route corridor.')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-customMuted block">{t('distanceFromSelectedRoute', 'Distance from selected route')}</span>
                    <strong className="text-sm font-extrabold text-customDanger font-mono">{routeDeviationKm} km</strong>
                  </div>
                </div>
              )}

              {/* Within-Route Safe Banner */}
              {hasLiveGps && !isOffRoute && routeDeviationKm !== null && (
                <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 rounded-xl text-xs flex items-center justify-between gap-3 text-customSuccess">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-customSuccess" />
                    <div>
                      <span className="font-bold uppercase text-[11px] block">{t('withinRouteCorridor', 'WITHIN ROUTE CORRIDOR')}</span>
                      <span className="text-[10px] text-customMuted block">
                        {t('vehicleFollowingCorridor', 'The vehicle is following the Admin-selected transit route corridor.')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-customMuted block">{t('distanceFromSelectedRoute', 'Distance from selected route')}</span>
                    <strong className="text-xs font-bold text-customSuccess font-mono">{routeDeviationKm} km</strong>
                  </div>
                </div>
              )}

              {/* Leaflet Real Road Map Container */}
              <div className="h-[450px] w-full rounded-xl overflow-hidden border border-darkBorder bg-darkBgSecondary/40 relative shadow-inner">
                <MapContainer
                  center={driverCurrentCoords || pickupCoords}
                  zoom={8}
                  scrollWheelZoom={true}
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapBoundsFitter bounds={mapBounds} />
                  <MapWheelZoomHandler />

                  {/* Pickup Marker */}
                  <Marker position={pickupCoords} icon={pickupMarkerIcon}>
                    <Popup>
                      <div className="text-xs font-bold text-slate-900">
                        📍 Pickup: {shipment.pickup?.locationName}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Destination Marker */}
                  <Marker position={destCoords} icon={destMarkerIcon}>
                    <Popup>
                      <div className="text-xs font-bold text-slate-900">
                        🏁 Destination: {shipment.destination?.locationName}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Active Driver Live Position Marker */}
                  {hasLiveGps && driverCurrentCoords && (
                    <Marker position={driverCurrentCoords} icon={driverGpsIcon}>
                      <Popup>
                        <div className="text-xs font-bold text-slate-900 space-y-1">
                          <p>🚚 Driver Live Location</p>
                          <p>Speed: {liveLoc.speed !== null && liveLoc.speed !== undefined ? `${liveLoc.speed} km/h` : 'N/A'}</p>
                          <p>Accuracy: {liveLoc.accuracy !== null && liveLoc.accuracy !== undefined ? `±${liveLoc.accuracy} m` : 'N/A'}</p>
                          <p>Updated: {liveLoc.updatedAt ? new Date(liveLoc.updatedAt).toLocaleTimeString() : 'Just now'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Selected Real Road Geometry Polyline */}
                  {selectedRoutePolyline.length > 0 && (
                    <Polyline
                      positions={selectedRoutePolyline}
                      pathOptions={{
                        color: isOffRoute ? '#ef4444' : '#06b6d4',
                        weight: 6,
                        opacity: 0.95
                      }}
                    />
                  )}
                </MapContainer>

                {/* Map Overlay Badge */}
                <div className="absolute top-3 right-3 z-[1000] bg-darkCard/90 border border-darkBorder px-3.5 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${hasLiveGps ? 'bg-customSuccess animate-ping' : 'bg-amber-400'}`} />
                  <span className="font-bold text-customText text-[11px]">
                    {hasLiveGps
                      ? `Live Vehicle Active${liveLoc.speed !== null && liveLoc.speed !== undefined ? ` • ${liveLoc.speed} km/h` : ''}`
                      : 'Selected Route View'}
                  </span>
                </div>
              </div>

              {/* Map Footer Information */}
              <div className="flex justify-between items-center text-[10px] text-customMuted pt-1">
                <span>
                  Admin Selected Route: <strong className="text-customText">{shipment.selectedRoute?.name || 'Primary Corridor'}</strong>
                </span>
                <span>
                  Vehicle: <strong className="text-customText">{shipment.assignedVehicle?.registrationNumber || shipment.vehicleNumber || 'Assigned'}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NgoShipmentView;
