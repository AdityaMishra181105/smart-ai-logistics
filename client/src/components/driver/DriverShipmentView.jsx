import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Navigation, Clock, AlertTriangle, Truck, Radio,
  ShieldAlert, CheckCircle2, Crosshair, RefreshCw, Activity, Compass, AlertOctagon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import StatusUpdateModal from '../layout/StatusUpdateModal';
import { getShipmentAlerts } from '../../services/alertService';
import { calculateRoadRoute } from '../../services/routingService';
import { useLanguage } from '../../context/LanguageContext';
import useSocket from '../../hooks/useSocket';
import api from '../../services/api';

// Custom icons for Map
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

const DriverShipmentView = ({ shipment, onStatusUpdate, onRefresh }) => {
  const navigate = useNavigate();
  const { t, translateStatus } = useLanguage();

  // Status Update Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Shipment Alerts State
  const [alertsData, setAlertsData] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Live GPS Tracking State
  const [gpsState, setGpsState] = useState({
    status: 'OFF', // 'OFF' | 'REQUESTING' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE'
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    lastUpdated: null,
    errorMessage: ''
  });

  const watchIdRef = useRef(null);
  const lastSentTimeRef = useRef(0);

  // Pickup Road Routing State (Driver GPS -> Pickup Location)
  const [pickupRouting, setPickupRouting] = useState({
    distanceKm: null,
    durationMinutes: null,
    loading: false,
    error: null
  });

  const lastRoutingCoordsRef = useRef(null);
  const lastRoutingTimeRef = useRef(0);

  // Real-time Road Distance & ETA calculation from Driver GPS to Pickup Location via OSRM
  useEffect(() => {
    if (
      gpsState.status !== 'ACTIVE' ||
      gpsState.latitude === null ||
      gpsState.longitude === null ||
      !shipment?.pickup?.latitude ||
      !shipment?.pickup?.longitude
    ) {
      setPickupRouting({
        distanceKm: null,
        durationMinutes: null,
        loading: false,
        error: null
      });
      return;
    }

    const driverLat = gpsState.latitude;
    const driverLon = gpsState.longitude;
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
    gpsState.status,
    gpsState.latitude,
    gpsState.longitude,
    shipment?.pickup?.latitude,
    shipment?.pickup?.longitude
  ]);

  const { on: onSocketEvent } = useSocket();

  // Fetch Alerts for assigned shipment
  useEffect(() => {
    if (shipment && shipment._id) {
      const fetchAlerts = async () => {
        setAlertsLoading(true);
        try {
          const res = await getShipmentAlerts(shipment._id);
          if (res.data && res.data.success) {
            setAlertsData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load driver shipment alerts:', err);
        } finally {
          setAlertsLoading(false);
        }
      };
      fetchAlerts();
    }
  }, [shipment?._id]);

  // Real-time Socket.IO alert updates for assigned shipment
  useEffect(() => {
    if (!onSocketEvent || !shipment?._id) return;

    const handleNewAlert = (alertPayload) => {
      if (
        alertPayload && (
          String(alertPayload.relatedShipment) === String(shipment._id) ||
          String(alertPayload.shipmentId) === String(shipment._id) ||
          String(alertPayload.relatedRoute) === String(shipment.selectedRouteId)
        )
      ) {
        getShipmentAlerts(shipment._id).then(res => {
          if (res.data && res.data.success) {
            setAlertsData(res.data.data);
          }
        }).catch(err => console.error('Error refreshing alerts on socket event:', err));
      }
    };

    const unSubNew = onSocketEvent('alert:new', handleNewAlert);
    const unSubCreated = onSocketEvent('alert:created', handleNewAlert);

    return () => {
      if (unSubNew) unSubNew();
      if (unSubCreated) unSubCreated();
    };
  }, [onSocketEvent, shipment?._id, shipment?.selectedRouteId]);

  // Clean up WatchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Enable Live Location Handler
  const handleEnableLiveLocation = () => {
    if (!navigator.geolocation) {
      setGpsState(prev => ({
        ...prev,
        status: 'UNAVAILABLE',
        errorMessage: 'Geolocation is not supported by your browser/device.'
      }));
      return;
    }

    setGpsState(prev => ({ ...prev, status: 'REQUESTING', errorMessage: '' }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const now = Date.now();
        const realSpeed = speed !== null && speed !== undefined && !isNaN(speed) && speed >= 0
          ? Math.round(speed * 3.6)
          : null;
        const realAccuracy = accuracy !== null && accuracy !== undefined && !isNaN(accuracy)
          ? Math.round(accuracy)
          : null;
        const updateTime = position.timestamp ? new Date(position.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

        console.log('[REAL GPS UPDATE]', {
          latitude,
          longitude,
          accuracy: realAccuracy,
          speed: realSpeed,
          timestamp: position.timestamp
        });

        setGpsState({
          status: 'ACTIVE',
          latitude,
          longitude,
          accuracy: realAccuracy,
          speed: realSpeed,
          heading: heading || null,
          lastUpdated: updateTime,
          errorMessage: ''
        });

        // Throttle backend transmissions to max once every 3 seconds
        if (now - lastSentTimeRef.current >= 3000) {
          lastSentTimeRef.current = now;
          api.post('/tracking/location', {
            shipmentId: shipment._id,
            latitude,
            longitude,
            speed: realSpeed,
            heading: heading || null,
            accuracy: realAccuracy,
            timestamp: position.timestamp || now
          }).catch(err => {
            console.error('Failed to update live GPS telemetry:', err);
          });
        }
      },
      (error) => {
        console.error('Driver Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsState(prev => ({
            ...prev,
            status: 'DENIED',
            errorMessage: 'Location permission denied. Please allow location access to enable live tracking.'
          }));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsState(prev => ({
            ...prev,
            status: 'UNAVAILABLE',
            errorMessage: 'Unable to determine current GPS location.'
          }));
        } else if (error.code === error.TIMEOUT) {
          setGpsState(prev => ({
            ...prev,
            status: 'UNAVAILABLE',
            errorMessage: 'GPS location request timed out. Trying again...'
          }));
        } else {
          setGpsState(prev => ({
            ...prev,
            status: 'UNAVAILABLE',
            errorMessage: 'Unable to determine current GPS location.'
          }));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  };

  // Stop Location Sharing Handler
  const handleStopLiveLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsState({
      status: 'OFF',
      latitude: null,
      longitude: null,
      accuracy: null,
      speed: null,
      heading: null,
      lastUpdated: null,
      errorMessage: ''
    });
  };

  // Coordinates & Route Data Setup
  const pickupCoords = shipment.pickup?.latitude && shipment.pickup?.longitude
    ? [shipment.pickup.latitude, shipment.pickup.longitude]
    : [26.8467, 80.9462];

  const destCoords = shipment.destination?.latitude && shipment.destination?.longitude
    ? [shipment.destination.latitude, shipment.destination.longitude]
    : [28.6692, 77.4538];

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
      // GeoJSON LineString [lng, lat] -> Leaflet [lat, lng]
      return shipment.selectedRoute.geometry.coordinates.map(c => [c[1], c[0]]);
    }
    return [];
  };

  const selectedRoutePolyline = getSelectedRouteGeometry();

  // Active Driver GPS Position - strictly ONLY set when gpsState is ACTIVE and real coordinates exist
  const driverCurrentCoords = (gpsState.status === 'ACTIVE' && gpsState.latitude !== null && gpsState.longitude !== null)
    ? [gpsState.latitude, gpsState.longitude]
    : null;

  // Compute map bounds
  const mapBounds = [pickupCoords, destCoords];
  if (driverCurrentCoords) mapBounds.push(driverCurrentCoords);
  if (selectedRoutePolyline.length > 0) {
    selectedRoutePolyline.forEach(pt => mapBounds.push(pt));
  }

  // Calculate Remaining Distance, ETA Prediction & Shortest Point-to-LineString Route Deviation
  let remainingDistanceKm = null;
  let remainingEtaMinutes = null;
  let routeDeviationKm = null;
  let isOffRoute = false;
  const routeGeometryValid = selectedRoutePolyline.length >= 2;

  if (gpsState.status === 'ACTIVE' && driverCurrentCoords && shipment.destination?.latitude && shipment.destination?.longitude) {
    const distToDest = calculateHaversineDistance(
      driverCurrentCoords[0],
      driverCurrentCoords[1],
      shipment.destination.latitude,
      shipment.destination.longitude
    );
    remainingDistanceKm = parseFloat(distToDest.toFixed(1));

    if (gpsState.speed !== null && gpsState.speed > 0) {
      remainingEtaMinutes = Math.round((remainingDistanceKm / gpsState.speed) * 60);
    }

    // Shortest Distance from Driver GPS to Admin-Selected Route LineString Corridor
    if (routeGeometryValid) {
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
  }

  // Priority Badge Helper
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'LOW': return <Badge variant="neutral">{t('lowPriority', 'Low Priority')}</Badge>;
      case 'MEDIUM': return <Badge variant="info">{t('mediumPriority', 'Medium Priority')}</Badge>;
      case 'HIGH': return <Badge variant="warning">{t('highPriority', 'High Priority')}</Badge>;
      case 'CRITICAL': return <Badge variant="danger">{t('criticalPriority', 'Critical Priority')}</Badge>;
      default: return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  // Status Badge Helper
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
      {/* Driver Header */}
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
                {t('driverOperationalView', 'Driver Operational View')}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-customText">
                {t('shipment', 'Shipment')} {shipment.shipmentId}
              </h1>
            </div>
            <p className="text-xs text-customMuted mt-0.5">
              {t('driverOperationalSub', 'Operational details, route navigation, and real-time GPS telemetry')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getPriorityBadge(shipment.priority)}
          {getStatusBadge(shipment.status)}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="font-bold uppercase tracking-wider text-xs"
          >
            {t('updateStatus', 'Update Status')}
          </Button>
        </div>
      </div>

      {/* Grid Layout for Driver View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shipment Info & Live GPS Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shipment Information */}
          <Card className="p-4 sm:p-5">
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {t('shipmentInformation', 'Shipment Information')}
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
                    {shipment.assignedVehicle?.registrationNumber || shipment.vehicleNumber || t('vehicleAssigned', 'Vehicle Assigned')}
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

          {/* Real-time GPS Location Permission & Telemetry Control */}
          <Card className={`border ${
            gpsState.status === 'ACTIVE'
              ? 'border-customSuccess/40 bg-customSuccess/5'
              : gpsState.status === 'DENIED'
              ? 'border-customDanger/40 bg-customDanger/5'
              : 'border-darkBorder'
          }`}>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${gpsState.status === 'ACTIVE' ? 'text-customSuccess animate-pulse' : ''}`} />
                  {t('liveGpsLocation', 'Live GPS Location')}
                </CardTitle>
                {gpsState.status === 'ACTIVE' && (
                  <Badge variant="success" className="text-[9px] uppercase font-extrabold animate-pulse">
                    ● {t('gpsConnected', 'GPS Connected')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Permission & Status Banners */}
              {gpsState.status === 'OFF' && (
                <div className="p-3 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl space-y-2 text-center">
                  <Navigation className="w-6 h-6 text-customMuted mx-auto" />
                  <p className="font-semibold text-customText text-xs">{t('locationSharingInactive', 'Location Sharing Inactive')}</p>
                  <p className="text-[10px] text-customMuted leading-relaxed">
                    {t('locationSharingNotice', 'Click below to allow browser GPS location access and stream your position live to Admin dispatch.')}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2 font-bold uppercase tracking-wider text-xs justify-center"
                    onClick={handleEnableLiveLocation}
                  >
                    <Navigation className="w-3.5 h-3.5 mr-2" />
                    {t('enableLiveLocation', 'ENABLE LIVE LOCATION')}
                  </Button>
                </div>
              )}

              {gpsState.status === 'REQUESTING' && (
                <div className="p-4 bg-darkBgSecondary/60 border border-cyan-500/30 rounded-xl text-center space-y-2">
                  <LoadingSpinner size="md" text={t('requestingGpsPermission', 'Requesting browser GPS permission...')} />
                  <p className="text-[10px] text-customMuted">
                    {t('clickAllowPrompt', 'Please click "Allow" when your browser asks for location access.')}
                  </p>
                </div>
              )}

              {gpsState.status === 'ACTIVE' && (
                <div className="space-y-3">
                  <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-customSuccess flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-customSuccess animate-ping" />
                        {t('liveLocationActive', 'LIVE LOCATION ACTIVE')}
                      </span>
                      <span className="text-[10px] text-customMuted font-mono">
                        {gpsState.lastUpdated}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-customSuccess/20 text-[11px]">
                      <div>
                        <span className="text-customMuted block text-[9px]">{t('latitude', 'Latitude')}</span>
                        <span className="font-mono font-bold text-customText">{gpsState.latitude?.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-customMuted block text-[9px]">{t('longitude', 'Longitude')}</span>
                        <span className="font-mono font-bold text-customText">{gpsState.longitude?.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-customMuted block text-[9px]">{t('speed', 'Speed')}</span>
                        <span className="font-bold text-cyan-400">
                          {gpsState.speed !== null ? `${gpsState.speed} km/h` : t('na', 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="text-customMuted block text-[9px]">{t('gpsAccuracy', 'GPS Accuracy')}</span>
                        <span className="font-bold text-customText">
                          {gpsState.accuracy !== null ? `±${gpsState.accuracy} m` : t('na', 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-bold uppercase tracking-wider text-xs justify-center hover:bg-customDanger/10 hover:border-customDanger/30 hover:text-customDanger border-darkBorder"
                    onClick={handleStopLiveLocation}
                  >
                    {t('stopLocationSharing', 'STOP LOCATION SHARING')}
                  </Button>
                </div>
              )}

              {gpsState.status === 'DENIED' && (
                <div className="p-3.5 bg-customDanger/10 border border-customDanger/30 rounded-xl space-y-2 text-customDanger">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t('permissionDenied', 'Permission Denied')}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {gpsState.errorMessage}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-[10px] font-bold uppercase border-customDanger/40 text-customDanger hover:bg-customDanger/20 justify-center"
                    onClick={handleEnableLiveLocation}
                  >
                    {t('retryPermissionRequest', 'Retry Permission Request')}
                  </Button>
                </div>
              )}

              {gpsState.status === 'UNAVAILABLE' && (
                <div className="p-3.5 bg-customWarning/10 border border-customWarning/30 rounded-xl space-y-2 text-customWarning">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    {t('gpsUnavailable', 'GPS Unavailable')}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {gpsState.errorMessage}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-[10px] font-bold uppercase border-customWarning/40 text-customWarning hover:bg-customWarning/20 justify-center"
                    onClick={handleEnableLiveLocation}
                  >
                    {t('retryGpsConnection', 'Retry GPS Connection')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety & Route Alerts for Driver */}
          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {t('activeRouteSafetyAlerts', 'Active Route Safety Alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {alertsLoading ? (
                <LoadingSpinner size="sm" text={t('checkingHazards', 'Checking route hazards...')} />
              ) : alertsData && alertsData.alerts && alertsData.alerts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-darkBgSecondary border border-darkBorder rounded-lg text-[10px]">
                    <span className="text-customMuted uppercase font-bold">{t('routeSafetyStatus', 'Route Safety Status')}</span>
                    <span className={`font-black uppercase ${
                      alertsData.alertSummary?.critical > 0 ? 'text-customDanger' :
                      alertsData.alertSummary?.high > 0 ? 'text-orange-400' : 'text-customWarning'
                    }`}>
                      {alertsData.alertSummary?.critical > 0 ? t('criticalRiskBanner', '⚠️ CRITICAL RISK') :
                       alertsData.alertSummary?.high > 0 ? t('highRiskBanner', '⚠️ HIGH RISK') : t('moderateRiskBanner', 'MODERATE RISK')}
                    </span>
                  </div>

                  {alertsData.alerts.slice(0, 3).map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-darkBgSecondary/70 border border-darkBorder/60 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-customText text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {alt.title || alt.alertType?.replace('_', ' ')}
                        </span>
                        <Badge
                          variant={alt.severity === 'CRITICAL' ? 'danger' : 'warning'}
                          className="text-[8px] uppercase font-extrabold"
                        >
                          {t(`sev${alt.severity?.charAt(0) + alt.severity?.slice(1).toLowerCase()}`, alt.severity)}
                        </Badge>
                      </div>
                      {alt.description && (
                        <p className="text-[10px] text-customMuted leading-snug">
                          {alt.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-customSuccess/10 border border-customSuccess/25 rounded-xl text-center text-xs text-customSuccess flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('noHazardsReported', 'No critical safety hazard alerts reported for this route.')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Route Map & Route Prediction Navigation Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-3 flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                <Compass className="w-4 h-4" />
                {t('selectedRouteNavigation', 'Selected Route & Live Map Navigation')}
              </CardTitle>
              {gpsState.status === 'ACTIVE' && routeDeviationKm !== null ? (
                isOffRoute ? (
                  <Badge variant="danger" className="text-[10px] uppercase font-black animate-pulse">
                    ⚠️ {t('routeDeviationDetected', 'ROUTE DEVIATION DETECTED')} ({routeDeviationKm} km)
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] uppercase font-bold">
                    ✓ {t('withinRouteCorridor', 'WITHIN ROUTE CORRIDOR')} ({routeDeviationKm} km)
                  </Badge>
                )
              ) : !routeGeometryValid && gpsState.status === 'ACTIVE' ? (
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
              {gpsState.status === 'ACTIVE' && isOffRoute && routeDeviationKm !== null && (
                <div className="p-3.5 bg-customDanger/15 border-2 border-customDanger rounded-xl text-xs flex items-center justify-between gap-3 text-customDanger animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase block text-xs">⚠️ {t('offRouteDeviationBanner', 'OFF ROUTE DEVIATION')}</span>
                      <span className="text-[10px] text-customMuted block">
                        {t('offRouteNotice', 'Your vehicle position is away from the Admin-selected transit route corridor.')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-customMuted block">{t('distanceFromRoute', 'Distance from Route')}</span>
                    <strong className="text-sm font-extrabold text-customDanger font-mono">{routeDeviationKm} km</strong>
                  </div>
                </div>
              )}

              {/* Within-Route Safe Banner */}
              {gpsState.status === 'ACTIVE' && !isOffRoute && routeDeviationKm !== null && (
                <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 rounded-xl text-xs flex items-center justify-between gap-3 text-customSuccess">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-customSuccess" />
                    <div>
                      <span className="font-bold uppercase text-[11px] block">{t('withinRouteCorridor', 'WITHIN ROUTE CORRIDOR')}</span>
                      <span className="text-[10px] text-customMuted block">
                        {t('followingCorridorNotice', 'Your vehicle is following the Admin-selected transit route corridor.')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-customMuted block">{t('distanceFromRoute', 'Distance from Route')}</span>
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

                  {/* Active Driver Live Position Marker - ONLY rendered when real GPS is ACTIVE */}
                  {gpsState.status === 'ACTIVE' && driverCurrentCoords && (
                    <Marker position={driverCurrentCoords} icon={driverGpsIcon}>
                      <Popup>
                        <div className="text-xs font-bold text-slate-900 space-y-1">
                          <p>🚚 Your Live Location</p>
                          <p>Speed: {gpsState.speed !== null ? `${gpsState.speed} km/h` : 'N/A'}</p>
                          <p>Accuracy: {gpsState.accuracy !== null ? `±${gpsState.accuracy} m` : 'N/A'}</p>
                          <p>Updated: {gpsState.lastUpdated || 'Just now'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Route Hazard & Incident Alert Markers */}
                  {alertsData && alertsData.alerts && alertsData.alerts.map((alt, idx) => {
                    if (alt.location && alt.location.latitude && alt.location.longitude) {
                      const isCritical = alt.severity === 'CRITICAL';
                      const alertMarkerIcon = L.divIcon({
                        html: `<div style="background:${isCritical ? '#ef4444' : '#f59e0b'};width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px ${isCritical ? 'rgba(239,68,68,0.9)' : 'rgba(245,158,11,0.9)'};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;" class="animate-bounce">⚠️</div>`,
                        className: 'custom-alert-icon',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                      });
                      return (
                        <Marker key={idx} position={[alt.location.latitude, alt.location.longitude]} icon={alertMarkerIcon}>
                          <Popup>
                            <div className="text-xs font-bold text-slate-900 space-y-1">
                              <p className="font-extrabold uppercase text-rose-600">🚨 {alt.title || alt.alertType}</p>
                              <p className="text-[11px] font-medium text-slate-700">{alt.description}</p>
                              <p className="text-[10px] text-slate-500">Severity: {alt.severity}</p>
                              {alt.location.address && <p className="text-[10px] text-slate-500">Location: {alt.location.address}</p>}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    }
                    return null;
                  })}

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
                  <span className={`w-2.5 h-2.5 rounded-full ${gpsState.status === 'ACTIVE' ? 'bg-customSuccess animate-ping' : 'bg-amber-400'}`} />
                  <span className="font-bold text-customText text-[11px]">
                    {gpsState.status === 'ACTIVE'
                      ? `Live GPS Active${gpsState.speed !== null ? ` • ${gpsState.speed} km/h` : ''}`
                      : gpsState.status === 'REQUESTING'
                      ? 'Acquiring GPS Location...'
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

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={shipment.status}
        onUpdate={async (newStatus) => {
          setStatusUpdating(true);
          try {
            await onStatusUpdate(newStatus);
            setIsStatusModalOpen(false);
          } catch (err) {
            console.error('Driver status update error:', err);
          } finally {
            setStatusUpdating(false);
          }
        }}
        loading={statusUpdating}
      />
    </div>
  );
};

export default DriverShipmentView;
