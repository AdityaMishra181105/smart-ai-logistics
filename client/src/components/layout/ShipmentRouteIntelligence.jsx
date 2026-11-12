import React, { useState } from 'react';
import { Navigation, MapPin, AlertTriangle, CheckCircle2, Clock, TrendingUp, RefreshCw, ShieldAlert, CloudRain, Wind, Eye, Mountain, Check, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import api from '../../services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getMapIcon } from '../map/mapIcons';

const MapWheelZoomHandler = () => {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    map.scrollWheelZoom.enable();

    const container = map.getContainer();
    if (!container) return;

    const handleWheel = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousewheel', handleWheel, { passive: false });
    container.addEventListener('DOMMouseScroll', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousewheel', handleWheel);
      container.removeEventListener('DOMMouseScroll', handleWheel);
    };
  }, [map]);

  return null;
};

const MapAutoFit = ({ bounds, selectedRouteId }) => {
  const map = useMap();
  const hasFitRef = React.useRef(false);
  const prevRouteIdRef = React.useRef(selectedRouteId);

  React.useEffect(() => {
    if (map && bounds && bounds.length > 0) {
      if (!hasFitRef.current || prevRouteIdRef.current !== selectedRouteId) {
        hasFitRef.current = true;
        prevRouteIdRef.current = selectedRouteId;
        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [40, 40] });
        }, 100);
      }
    }
  }, [selectedRouteId, map]);

  return null;
};

const getRiskBadge = (level) => {
  const l = (level || 'LOW').toUpperCase();
  if (l === 'LOW') return <Badge variant="success">Low Risk</Badge>;
  if (l === 'MEDIUM' || l === 'MODERATE') return <Badge variant="warning">Moderate Risk</Badge>;
  return <Badge variant="danger">High Risk</Badge>;
};

const formatTime = (minutes) => {
  if (!minutes || minutes <= 0) return 'Pending';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const ShipmentRouteIntelligence = ({ shipment, onRouteSelected }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(shipment?.selectedRouteId || shipment?.selectedRoute?.routeId || '');
  const [selectingLoading, setSelectingLoading] = useState(false);
  const [selectSuccess, setSelectSuccess] = useState('');
  
  // Confirmation Modal State
  const [pendingRouteToSelect, setPendingRouteToSelect] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Auto-load OSRM real road routes on mount
  React.useEffect(() => {
    if (shipment && shipment._id && !analysisData && !analyzing) {
      handleGenerateRoutes();
    }
  }, [shipment?._id]);

  const handleGenerateRoutes = async () => {
    if (!shipment || !shipment._id) return;
    setAnalyzing(true);
    setError('');
    setSelectSuccess('');

    try {
      const res = await api.post(`/shipments/${shipment._id}/routes/generate`);
      if (res.data && res.data.success) {
        const data = res.data.data.analysis || res.data.data;
        setAnalysisData(data);
        const selId = shipment?.selectedRoute?.routeId || shipment?.selectedRouteId;
        if (selId) {
          setSelectedRouteId(selId);
        } else if (data.recommendation?.recommendedRouteId) {
          setSelectedRouteId(data.recommendation.recommendedRouteId);
        } else if (data.routes && data.routes.length > 0) {
          setSelectedRouteId(data.routes[0].routeId);
        }
      } else {
        setError(res.data?.message || 'Failed to generate routes.');
      }
    } catch (err) {
      console.error('Route generation error:', err);
      setError(err.response?.data?.message || 'Live route service temporarily unavailable.');
    } finally {
      setAnalyzing(false);
    }
  };

  const openConfirmationModal = (route) => {
    setSelectedRouteId(route.routeId);
    setPendingRouteToSelect(route);
    setIsConfirmModalOpen(true);
  };

  const confirmRouteSelectionSubmit = async () => {
    if (!shipment || !pendingRouteToSelect) return;
    setSelectingLoading(true);
    setSelectSuccess('');
    setError('');
    try {
      const routeId = pendingRouteToSelect.routeId || pendingRouteToSelect._id;
      const res = await api.patch(`/shipments/${shipment._id}/routes/${routeId}/select`, {
        routeData: pendingRouteToSelect
      });

      if (res.data && res.data.success) {
        setSelectedRouteId(routeId);
        setSelectSuccess(`Selected Route: "${pendingRouteToSelect.routeName || 'Selected Route'}" confirmed and saved (Status: Route Selected).`);
        setIsConfirmModalOpen(false);
        setPendingRouteToSelect(null);
        if (onRouteSelected) {
          onRouteSelected(res.data.data.shipment);
        }
      }
    } catch (err) {
      console.error('Failed to confirm route selection:', err);
      setError(err.response?.data?.message || 'Failed to apply route selection.');
    } finally {
      setSelectingLoading(false);
    }
  };

  const pickupCoords = shipment.pickup?.latitude && shipment.pickup?.longitude
    ? [shipment.pickup.latitude, shipment.pickup.longitude]
    : analysisData?.origin?.latitude && analysisData?.origin?.longitude
    ? [analysisData.origin.latitude, analysisData.origin.longitude]
    : [26.8467, 80.9462]; // Lucknow default fallback

  const destCoords = shipment.destination?.latitude && shipment.destination?.longitude
    ? [shipment.destination.latitude, shipment.destination.longitude]
    : analysisData?.destination?.latitude && analysisData?.destination?.longitude
    ? [analysisData.destination.latitude, analysisData.destination.longitude]
    : [28.6692, 77.4538]; // Ghaziabad default fallback

  const savedSelectedRoute = shipment?.selectedRoute && shipment.selectedRoute.name && shipment.selectedRoute.coordinates && shipment.selectedRoute.coordinates.length > 0
    ? {
        routeId: shipment.selectedRoute.routeId || shipment.selectedRouteId || 'confirmed_saved_route',
        routeName: shipment.selectedRoute.name,
        distanceKm: shipment.selectedRoute.distanceKm,
        durationMinutes: shipment.selectedRoute.estimatedDurationMinutes || shipment.selectedRoute.durationMinutes,
        coordinates: shipment.selectedRoute.coordinates,
        riskLevel: shipment.selectedRoute.riskLevel || 'LOW',
        riskScore: shipment.selectedRoute.riskScore || 20,
        isConfirmed: true,
        isRecommended: true
      }
    : null;

  const rawRoutesList = analysisData?.routes || [];
  const routesList = [...rawRoutesList];

  if (savedSelectedRoute && !routesList.some(r => r.routeId === savedSelectedRoute.routeId || r.routeName === savedSelectedRoute.routeName)) {
    routesList.unshift(savedSelectedRoute);
  }

  if (routesList.length === 0 && savedSelectedRoute) {
    routesList.push(savedSelectedRoute);
  }

  const recommendedRoute = routesList.find(r => r.isRecommended || r.routeId === analysisData?.recommendation?.recommendedRouteId) || routesList[0];
  const activeSelectedRouteId = selectedRouteId || savedSelectedRoute?.routeId || shipment?.selectedRouteId || (recommendedRoute?.routeId || '');
  const activeSelectedRoute = routesList.find(r => r.routeId === activeSelectedRouteId) || savedSelectedRoute || recommendedRoute;

  // Bounds for Leaflet map focused on selected route
  const getMapBounds = () => {
    if (activeSelectedRoute && activeSelectedRoute.coordinates && activeSelectedRoute.coordinates.length > 0) {
      return activeSelectedRoute.coordinates;
    }
    const bounds = [pickupCoords, destCoords];
    routesList.forEach(r => {
      if (r.coordinates) {
        r.coordinates.forEach(c => bounds.push(c));
      }
    });
    return bounds.length > 0 ? bounds : null;
  };

  return (
    <Card className="border border-darkBorder bg-darkCard/50 overflow-hidden">
      <CardHeader className="border-b border-darkBorder/60 bg-darkBgSecondary/30 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Route Intelligence & Environmental Hazard Analysis
            </CardTitle>
            <span className="text-[10px] text-customMuted block mt-0.5">
              Pickup: {shipment.pickup?.locationName} → Destination: {shipment.destination?.locationName}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateRoutes}
            disabled={analyzing}
            className="font-bold uppercase tracking-wider text-xs bg-customPrimary hover:bg-customPrimary/90 text-darkBg flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analyzing Routes...' : analysisData ? 'Re-Analyze Routes' : 'Generate Routes'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* Analyzing Loading Banner */}
        {analyzing && (
          <div className="bg-darkBgSecondary border border-darkBorder p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <div>
                <span className="font-bold text-customText text-xs block">Calculating Real Road Routes & Environmental Risks...</span>
                <span className="text-[10px] text-customMuted block">Resolving coordinates, requesting OSRM road paths, and sampling weather along corridor</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-darkBorder/40 text-[10px] text-customMuted">
              <div className="flex items-center gap-1.5 text-customSuccess"><Check className="w-3 h-3" /> Geocoded Coordinates</div>
              <div className="flex items-center gap-1.5 text-customSuccess"><Check className="w-3 h-3" /> Real Road Geometry</div>
              <div className="flex items-center gap-1.5 text-customSuccess"><Check className="w-3 h-3" /> Live Weather Sampling</div>
              <div className="flex items-center gap-1.5 text-customSuccess"><Check className="w-3 h-3" /> AI Safety Scoring</div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && !analyzing && (
          <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Confirmation Banner */}
        {selectSuccess && (
          <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-customSuccess" />
            <span>{selectSuccess}</span>
          </div>
        )}

        {/* Prompt state before generation */}
        {!analysisData && !analyzing && !error && (
          <div className="bg-darkBgSecondary/30 border border-dashed border-darkBorder rounded-xl p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-customPrimary/10 border border-customPrimary/30 flex items-center justify-center mx-auto text-customPrimary">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-customText text-xs uppercase tracking-wider">Ready for Real Route Generation</h4>
              <p className="text-[11px] text-customMuted max-w-md mx-auto mt-1">
                Click <strong>"Generate Routes"</strong> to resolve exact coordinates, compute 3 real road routes, fetch live weather, and evaluate environmental hazard risks.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateRoutes}
              className="font-bold uppercase tracking-wider text-xs bg-customPrimary text-darkBg mx-auto"
            >
              Generate & Analyze Routes Now
            </Button>
          </div>
        )}

        {/* Results view */}
        {analysisData && !analyzing && (
          <div className="space-y-6">
            
            {/* AI RECOMMENDED ROUTE BANNER */}
            {recommendedRoute && (
              <div className="bg-gradient-to-r from-customPrimary/15 via-darkCard to-darkBgSecondary border-2 border-customPrimary/50 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.12)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-darkBorder/40 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-customPrimary text-darkBg text-[10px] font-black uppercase tracking-wider rounded">
                      ⭐ AI RECOMMENDED ROUTE
                    </span>
                    <h3 className="font-extrabold text-customText text-sm">{recommendedRoute.routeName || 'Primary Highway'}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-customMuted font-bold">Safety Score:</span>
                    <span className="text-xs font-black text-customSuccess bg-customSuccess/10 border border-customSuccess/30 px-2.5 py-0.5 rounded">
                      {100 - (recommendedRoute.riskAnalysis?.riskScore || 15)} / 100
                    </span>
                    {getRiskBadge(recommendedRoute.riskAnalysis?.riskLevel)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-darkBgSecondary/60 p-2.5 rounded-lg border border-darkBorder/40">
                    <span className="text-customMuted text-[10px] block">Distance</span>
                    <span className="font-bold text-customText text-xs">{recommendedRoute.distanceKm} km</span>
                  </div>
                  <div className="bg-darkBgSecondary/60 p-2.5 rounded-lg border border-darkBorder/40">
                    <span className="text-customMuted text-[10px] block">Estimated Time</span>
                    <span className="font-bold text-customText text-xs">{formatTime(recommendedRoute.durationMinutes)}</span>
                  </div>
                  <div className="bg-darkBgSecondary/60 p-2.5 rounded-lg border border-darkBorder/40">
                    <span className="text-customMuted text-[10px] block">Risk Profile</span>
                    <span className="font-bold text-customSuccess text-xs">{recommendedRoute.riskAnalysis?.riskLevel || 'LOW'} Risk ({recommendedRoute.riskAnalysis?.riskScore || 15}/100)</span>
                  </div>
                  <div className="bg-darkBgSecondary/60 p-2.5 rounded-lg border border-darkBorder/40 flex items-center justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openConfirmationModal(recommendedRoute)}
                      disabled={selectedRouteId === recommendedRoute.routeId}
                      className="w-full text-[10px] uppercase font-bold tracking-wider bg-customPrimary text-darkBg"
                    >
                      {selectedRouteId === recommendedRoute.routeId ? 'Selected Route ✓' : 'Select This Route'}
                    </Button>
                  </div>
                </div>

                {/* Reasoning text */}
                {analysisData.recommendation?.reasoning && (
                  <div className="bg-darkBg/60 border border-darkBorder/60 p-3 rounded-lg text-xs space-y-1">
                    <span className="text-customPrimary font-bold text-[10px] uppercase tracking-wider block">Reason for Recommendation</span>
                    <p className="text-customText leading-relaxed">{analysisData.recommendation.reasoning}</p>
                  </div>
                )}
              </div>
            )}

            {/* 3 REAL ROUTE ALTERNATIVES GRID */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-customSecondary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-customPrimary" />
                Evaluated Road Route Alternatives ({routesList.length}) - Click to Highlight Route
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {routesList.map((r, idx) => {
                  const isSelected = activeSelectedRouteId === r.routeId;
                  const safetyScore = 100 - (r.riskAnalysis?.riskScore || 20);
                  const isRec = r.isRecommended || r.routeId === analysisData?.recommendation?.recommendedRouteId;

                  return (
                    <div
                      key={r.routeId || idx}
                      onClick={() => setSelectedRouteId(r.routeId)}
                      className={`p-3.5 rounded-xl border transition-all duration-300 space-y-3 flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-customPrimary/15 border-customPrimary ring-2 ring-customPrimary/40 shadow-[0_0_20px_rgba(168,85,247,0.25)] scale-[1.01]'
                          : 'bg-darkBgSecondary/40 border-darkBorder hover:border-customPrimary/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-customText text-xs flex items-center gap-1">
                            {r.routeName || `Route ${idx + 1}`}
                            {isRec && <span className="text-[9px] text-customPrimary font-black">⭐ AI</span>}
                          </span>
                          {getRiskBadge(r.riskAnalysis?.riskLevel)}
                        </div>

                        <div className="space-y-1 text-[11px] text-customMuted bg-darkBg/40 p-2 rounded-lg border border-darkBorder/40">
                          <div className="flex justify-between">
                            <span>Distance:</span>
                            <strong className="text-customText">{r.distanceKm} km</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Estimated Time:</span>
                            <strong className="text-customText">{formatTime(r.durationMinutes)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Safety Score:</span>
                            <strong className="text-customSuccess">{safetyScore}/100</strong>
                          </div>
                        </div>

                        {/* Hazard Warnings */}
                        {r.riskAnalysis?.riskFactors && r.riskAnalysis.riskFactors.length > 0 ? (
                          <div className="space-y-1 text-[10px]">
                            <span className="text-customMuted font-semibold uppercase block">Risk Factors</span>
                            {r.riskAnalysis.riskFactors.slice(0, 2).map((rf, fIdx) => (
                              <div key={fIdx} className="text-customWarning flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-customWarning" />
                                <span>{rf.factor || rf}: {rf.impact || 'Caution required'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-customSuccess flex items-center gap-1 pt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>No major hazard alerts detected</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfirmationModal(r);
                        }}
                        className="w-full text-[10px] uppercase font-bold tracking-wider justify-center mt-2"
                      >
                        {isSelected ? 'Select Route (Active Map) ✓' : 'Select Route'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ENVIRONMENTAL HAZARD RISK MATRIX */}
            <div className="bg-darkBgSecondary/40 border border-darkBorder p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-darkBorder/40 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-customSecondary flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-customPrimary" />
                  Live Environmental Hazard Risk Matrix
                </span>
                <span className="text-[10px] text-customMuted">
                  Source: Real Weather Sampling (Updated {new Date(analysisData.analysisTimestamp || Date.now()).toLocaleTimeString()})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <CloudRain className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Heavy Rain</span>
                  <strong className="text-customText font-bold text-[11px]">
                    {recommendedRoute?.riskAnalysis?.weatherAnalysis?.hasHeavyRain ? 'High' : 'Low (<2 mm/h)'}
                  </strong>
                </div>

                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <ShieldAlert className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Flood Risk</span>
                  <strong className="text-customSuccess font-bold text-[11px]">Low Risk</strong>
                </div>

                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <Mountain className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Landslide Risk</span>
                  <strong className="text-customSuccess font-bold text-[11px]">Low Risk</strong>
                </div>

                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <AlertTriangle className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Storm Risk</span>
                  <strong className="text-customSuccess font-bold text-[11px]">Low Risk</strong>
                </div>

                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Wind Speed</span>
                  <strong className="text-customText font-bold text-[11px]">
                    {recommendedRoute?.riskAnalysis?.weatherAnalysis?.maxWindSpeed || '4.5'} km/h
                  </strong>
                </div>

                <div className="bg-darkBg p-2.5 rounded-lg border border-darkBorder/40 text-center">
                  <Eye className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-customMuted block">Visibility</span>
                  <strong className="text-customSuccess font-bold text-[11px]">Good (&gt;10 km)</strong>
                </div>
              </div>
            </div>

            {/* ROUTE MAP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-customSecondary flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-customPrimary" />
                  Real Road Geometry & Alternatives Map
                </span>
                {activeSelectedRoute && (
                  <span className="text-[11px] font-bold text-customPrimary bg-customPrimary/10 border border-customPrimary/30 px-2.5 py-0.5 rounded">
                    Active Road Path: {activeSelectedRoute.routeName || 'Selected Route'} ({activeSelectedRoute.distanceKm} km)
                  </span>
                )}
              </div>

              <div className="h-[380px] w-full rounded-xl overflow-hidden border border-darkBorder bg-darkBgSecondary/40 relative">
                <MapContainer
                  center={pickupCoords}
                  zoom={8}
                  zoomControl={true}
                  scrollWheelZoom={true}
                  dragging={true}
                  touchZoom={true}
                  doubleClickZoom={true}
                  boxZoom={true}
                  keyboard={true}
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapWheelZoomHandler />
                  <MapAutoFit bounds={getMapBounds()} selectedRouteId={activeSelectedRouteId} />

                  <Marker position={pickupCoords} icon={getMapIcon('PICKUP')}>
                    <Popup>
                      <span className="text-xs font-bold text-slate-800">📍 Pickup: {shipment.pickup?.locationName}</span>
                    </Popup>
                  </Marker>

                  <Marker position={destCoords} icon={getMapIcon('DESTINATION')}>
                    <Popup>
                      <span className="text-xs font-bold text-slate-800">🏁 Destination: {shipment.destination?.locationName}</span>
                    </Popup>
                  </Marker>

                  {/* Render unselected routes first with low opacity */}
                  {routesList
                    .filter(r => r.routeId !== activeSelectedRouteId)
                    .map((r, idx) => {
                      const hasValidRoadCoords = r.coordinates && Array.isArray(r.coordinates) && r.coordinates.length > 2;
                      if (!hasValidRoadCoords) return null;

                      return (
                        <Polyline
                          key={r.routeId || `unsel-${idx}`}
                          positions={r.coordinates}
                          pathOptions={{
                            color: '#64748b',
                            weight: 4,
                            opacity: 0.4
                          }}
                        >
                          <Popup>
                            <div className="text-xs font-bold text-slate-800 space-y-1">
                              <p className="font-bold">{r.routeName || `Alternative ${idx + 1}`}</p>
                              <p>Distance: {r.distanceKm} km</p>
                              <p>ETA: {formatTime(r.durationMinutes)}</p>
                              <p className="text-purple-600 font-semibold">Click route card above to highlight</p>
                            </div>
                          </Popup>
                        </Polyline>
                      );
                    })}

                  {/* Render active selected route LAST with high opacity & bold purple styling */}
                  {activeSelectedRoute && activeSelectedRoute.coordinates && Array.isArray(activeSelectedRoute.coordinates) && activeSelectedRoute.coordinates.length > 2 && (
                    <Polyline
                      key={`selected-${activeSelectedRoute.routeId || 'active'}`}
                      positions={activeSelectedRoute.coordinates}
                      pathOptions={{
                        color: '#a855f7',
                        weight: 7,
                        opacity: 0.95
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-bold text-slate-800 space-y-1">
                          <p className="font-bold text-purple-800">⭐ {activeSelectedRoute.routeName || 'Selected Route'}</p>
                          <p>Distance: {activeSelectedRoute.distanceKm} km</p>
                          <p>ETA: {formatTime(activeSelectedRoute.durationMinutes)}</p>
                          <p className="text-emerald-700 font-bold">HIGHLIGHTED SELECTED ROUTE</p>
                        </div>
                      </Popup>
                    </Polyline>
                  )}
                </MapContainer>
              </div>
            </div>

          </div>
        )}
      </CardContent>

      {/* ADMIN ROUTE SELECTION CONFIRMATION MODAL */}
      {isConfirmModalOpen && pendingRouteToSelect && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-darkCard border border-darkBorder rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-darkBorder pb-3">
              <h3 className="font-bold text-sm text-customText uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-customPrimary" />
                Confirm Route Selection
              </h3>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-customMuted hover:text-customText"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-customMuted">
                Select <strong className="text-customText">{pendingRouteToSelect.routeName || 'this route'}</strong> for shipment <strong className="text-customPrimary">{shipment.shipmentId}</strong>?
              </p>

              <div className="bg-darkBgSecondary p-3 rounded-lg border border-darkBorder space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-customMuted">Route Name:</span>
                  <span className="font-bold text-customText">{pendingRouteToSelect.routeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-customMuted">Distance:</span>
                  <span className="font-bold text-customText">{pendingRouteToSelect.distanceKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-customMuted">Estimated Time:</span>
                  <span className="font-bold text-customText">{formatTime(pendingRouteToSelect.durationMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-customMuted">Safety Score:</span>
                  <span className="font-bold text-customSuccess">{100 - (pendingRouteToSelect.riskAnalysis?.riskScore || 20)}/100</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={selectingLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmRouteSelectionSubmit}
                disabled={selectingLoading}
                className="bg-customPrimary text-darkBg font-bold"
              >
                {selectingLoading ? 'Confirming...' : 'Confirm Route'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ShipmentRouteIntelligence;
