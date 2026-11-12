import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, AlertTriangle, RefreshCw, X, Radio, Compass, Gauge, ShieldAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getMapIcon } from '../map/mapIcons';
import useSocket from '../../hooks/useSocket';

// Custom Vehicle Truck Icon for Map
const vehicleIcon = L.divIcon({
  html: `
    <div style="
      background: #a855f7;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 12px rgba(168,85,247,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    ">
      🚚
    </div>
  `,
  className: 'custom-vehicle-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const MapAutoFit = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
};

const ShipmentLiveTrackingModal = ({ shipment, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const fetchTrackingTelemetry = async () => {
    if (!shipment || !shipment._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/tracking/${shipment._id}`);
      if (res.data && res.data.success) {
        setTrackingData(res.data.tracking);
      } else {
        setError('Failed to load tracking data.');
      }
    } catch (err) {
      console.error('Tracking fetch error:', err);
      setError(err.response?.data?.message || 'Live GPS location unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrackingTelemetry();
      const interval = setInterval(fetchTrackingTelemetry, 10000); // refresh telemetry every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen, shipment?._id]);

  // Real-time Socket.IO Location Updates
  useSocket('vehicle:location:update', (data) => {
    if (isOpen && data && (String(data.shipmentId) === String(shipment?._id))) {
      setTrackingData(prev => ({
        ...(prev || {}),
        liveLocation: data.liveLocation
      }));
    }
  });

  useSocket('location:update', (data) => {
    if (isOpen && data && (String(data.shipmentId) === String(shipment?._id))) {
      setTrackingData(prev => ({
        ...(prev || {}),
        liveLocation: data.liveLocation
      }));
    }
  });

  if (!isOpen) return null;

  const liveLoc = trackingData?.liveLocation || shipment?.liveLocation;
  const hasLiveGps = liveLoc && liveLoc.latitude && liveLoc.longitude;

  const pickupCoords = shipment.pickup?.latitude && shipment.pickup?.longitude
    ? [shipment.pickup.latitude, shipment.pickup.longitude]
    : [26.8467, 80.9462];

  const destCoords = shipment.destination?.latitude && shipment.destination?.longitude
    ? [shipment.destination.latitude, shipment.destination.longitude]
    : [28.6692, 77.4538];

  const vehicleCoords = hasLiveGps ? [liveLoc.latitude, liveLoc.longitude] : null;

  const routePolyline = shipment.selectedRoute?.coordinates || trackingData?.selectedRoute?.coordinates || [];

  const getMapBounds = () => {
    const bounds = [pickupCoords, destCoords];
    if (vehicleCoords) bounds.push(vehicleCoords);
    if (routePolyline.length > 0) {
      routePolyline.forEach(c => bounds.push(c));
    }
    return bounds;
  };

  const handleRecalculateRoute = async () => {
    setRecalculating(true);
    try {
      await api.post(`/shipments/${shipment._id}/routes/generate`);
      await fetchTrackingTelemetry();
      alert('Route recalculated successfully based on current vehicle location!');
    } catch (e) {
      alert('Failed to recalculate route.');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-darkCard border border-darkBorder rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-darkBorder bg-darkBgSecondary/50">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-customSuccess animate-pulse" />
            <div>
              <h2 className="font-bold text-base text-customText flex items-center gap-2">
                Live Location & Telemetry Tracking
                <Badge variant="primary" className="text-[10px]">{shipment.shipmentId}</Badge>
              </h2>
              <p className="text-[10px] text-customMuted mt-0.5">
                Real-time GPS coordinates, vehicle velocity, remaining distance & deviation monitoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-darkBorder/60 hover:bg-darkBgSecondary text-customMuted hover:text-customText"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading && !trackingData && (
            <div className="py-12 text-center">
              <LoadingSpinner size="lg" text="Connecting to GPS telemetry stream..." />
            </div>
          )}

          {error && !trackingData && (
            <div className="p-4 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {/* GPS Unavailable Warning Banner */}
          {!hasLiveGps && !loading && (
            <div className="p-3 bg-customWarning/10 border border-customWarning/30 rounded-xl text-xs flex items-center justify-between gap-3 text-customWarning">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span><strong>Live GPS location unavailable:</strong> The vehicle GPS transponder has not sent updates yet. Showing planned route.</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchTrackingTelemetry} className="text-[10px] font-bold uppercase">
                Retry GPS Sync
              </Button>
            </div>
          )}

          {/* Route Deviation Alert */}
          {trackingData?.isOffRoute && (
            <div className="p-3.5 bg-customDanger/15 border-2 border-customDanger rounded-xl text-xs flex items-center justify-between gap-3 text-customDanger animate-pulse">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-extrabold uppercase tracking-wider block text-xs">⚠ ROUTE DEVIATION DETECTED</span>
                  <span className="text-[10px] text-customMuted block">Vehicle has drifted more than 5 km from the confirmed transit route corridor.</span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRecalculateRoute}
                disabled={recalculating}
                className="bg-customDanger text-white font-bold uppercase text-[10px] tracking-wider shrink-0"
              >
                {recalculating ? 'Recalculating...' : 'Recalculate Route'}
              </Button>
            </div>
          )}

          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-darkBgSecondary/60 p-3 rounded-xl border border-darkBorder/60 space-y-1">
              <span className="text-[10px] text-customMuted flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-customPrimary" />
                Current Coordinates
              </span>
              <strong className="text-customText block font-mono text-xs">
                {hasLiveGps ? `${liveLoc.latitude.toFixed(4)}, ${liveLoc.longitude.toFixed(4)}` : 'GPS Inactive'}
              </strong>
            </div>

            <div className="bg-darkBgSecondary/60 p-3 rounded-xl border border-darkBorder/60 space-y-1">
              <span className="text-[10px] text-customMuted flex items-center gap-1 font-semibold">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Telemetry Speed
              </span>
              <strong className="text-customText block font-bold text-xs">
                {hasLiveGps && liveLoc.speed !== undefined ? `${liveLoc.speed} km/h` : 'N/A'}
              </strong>
            </div>

            <div className="bg-darkBgSecondary/60 p-3 rounded-xl border border-darkBorder/60 space-y-1">
              <span className="text-[10px] text-customMuted flex items-center gap-1 font-semibold">
                <Navigation className="w-3.5 h-3.5 text-customSecondary" />
                Distance Remaining
              </span>
              <strong className="text-customText block font-bold text-xs">
                {trackingData?.distanceRemainingKm ? `${trackingData.distanceRemainingKm} km` : shipment.selectedRoute?.distanceKm ? `${shipment.selectedRoute.distanceKm} km` : 'Calculating...'}
              </strong>
            </div>

            <div className="bg-darkBgSecondary/60 p-3 rounded-xl border border-darkBorder/60 space-y-1">
              <span className="text-[10px] text-customMuted flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-customSuccess" />
                Estimated Arrival (ETA)
              </span>
              <strong className="text-customSuccess block font-bold text-xs">
                {trackingData?.etaMinutes ? `${Math.floor(trackingData.etaMinutes / 60)}h ${trackingData.etaMinutes % 60}m` : 'Calculating...'}
              </strong>
            </div>
          </div>

          {/* Interactive Live Map */}
          <div className="h-[400px] w-full rounded-xl overflow-hidden border border-darkBorder bg-darkBgSecondary/40 relative">
            <MapContainer
              center={vehicleCoords || pickupCoords}
              zoom={8}
              scrollWheelZoom={true}
              className="h-full w-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoFit bounds={getMapBounds()} />

              {/* Pickup Marker */}
              <Marker position={pickupCoords} icon={getMapIcon('PICKUP')}>
                <Popup>
                  <span className="text-xs font-bold text-slate-800">📍 Pickup: {shipment.pickup?.locationName}</span>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destCoords} icon={getMapIcon('DESTINATION')}>
                <Popup>
                  <span className="text-xs font-bold text-slate-800">🏁 Destination: {shipment.destination?.locationName}</span>
                </Popup>
              </Marker>

              {/* Vehicle Live Marker */}
              {hasLiveGps && vehicleCoords && (
                <Marker position={vehicleCoords} icon={vehicleIcon}>
                  <Popup>
                    <div className="text-xs font-bold text-slate-800 space-y-1">
                      <p>🚚 Live Vehicle Location</p>
                      <p>Speed: {liveLoc.speed !== null && liveLoc.speed !== undefined ? `${liveLoc.speed} km/h` : 'N/A'}</p>
                      <p>Updated: {new Date(liveLoc.updatedAt || Date.now()).toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Selected Route Polyline */}
              {routePolyline.length > 0 && (
                <Polyline
                  positions={routePolyline}
                  pathOptions={{
                    color: trackingData?.isOffRoute ? '#ef4444' : '#a855f7',
                    weight: 6,
                    opacity: 0.95
                  }}
                />
              )}
            </MapContainer>

            {/* Live Indicator overlay */}
            <div className="absolute top-3 right-3 z-[1000] bg-darkCard/90 border border-darkBorder px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-customSuccess animate-ping" />
              <span className="font-bold text-customText text-[11px]">
                {hasLiveGps
                  ? `GPS Active${liveLoc.speed !== null && liveLoc.speed !== undefined ? ` • ${liveLoc.speed} km/h` : ''}`
                  : 'Planned Route Mode'}
              </span>
            </div>
          </div>

          {/* Telemetry Timestamp audit */}
          <div className="flex justify-between items-center text-[10px] text-customMuted border-t border-darkBorder/40 pt-2">
            <span>Last Telemetry Packet: {hasLiveGps ? new Date(liveLoc.updatedAt).toLocaleString() : 'No GPS packet received'}</span>
            <span>Ref: {shipment.assignedVehicle?.registrationNumber || shipment.vehicleNumber || 'Vehicle Not Specified'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentLiveTrackingModal;
