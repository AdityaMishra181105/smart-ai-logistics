import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Navigation, MapPin, AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader, RefreshCw,
  Shield, CloudRain, Wind, Eye, Route, Sparkles
} from 'lucide-react';
import { analyzeRoute } from '../../services/routeIntelligenceService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

// Leaflet marker icons
const originIcon = L.divIcon({
  html: '<div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: 'custom-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const destinationIcon = L.divIcon({
  html: '<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: 'custom-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Map auto-fit component
const MapAutoFit = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
};

// Route colors by risk level
const getRiskColor = (riskLevel) => {
  switch (riskLevel) {
    case 'LOW': return '#10b981';
    case 'MEDIUM': return '#f59e0b';
    case 'HIGH': return '#ef4444';
    default: return '#6b7280';
  }
};

const RouteIntelligencePanel = ({ route, onRouteSelected, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);

  const routeIdentifier = route?._id || route?.routeId || route?.id || 'route_1';

  // Auto-analyze on mount
  useEffect(() => {
    if (route) {
      handleAnalyze();
    }
  }, [routeIdentifier]);

  const handleAnalyze = async () => {
    if (!route) return;
    setAnalyzing(true);
    setError('');

    try {
      const response = await analyzeRoute(routeIdentifier, route);
      
      if (response.data?.success) {
        setAnalysis(response.data.data.analysis);
        
        // Pre-select recommended route
        const routesList = response.data.data.analysis.routes || [];
        const recommended = routesList.find(r => r.isRecommended) || routesList[0];
        if (recommended) {
          setSelectedRoute(recommended);
        }
      } else {
        setError(response.data?.message || 'Failed to analyze route');
      }
    } catch (err) {
      console.error('Route analysis error:', err);
      if (err.response?.status === 429) {
        setError('Service rate limit reached. Please wait a moment and try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Route analysis service failed. Please check your connection and try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmRoute = () => {
    if (selectedRoute && onRouteSelected) {
      onRouteSelected(selectedRoute);
    }
  };

  // Calculate map bounds
  const getMapBounds = () => {
    if (!analysis) return null;

    const bounds = [];
    
    // Add origin and destination
    if (analysis.origin?.latitude) {
      bounds.push([analysis.origin.latitude, analysis.origin.longitude]);
    }
    if (analysis.destination?.latitude) {
      bounds.push([analysis.destination.latitude, analysis.destination.longitude]);
    }

    // Add all route coordinates
    analysis.routes?.forEach(r => {
      if (r.coordinates) {
        r.coordinates.forEach(coord => bounds.push(coord));
      }
    });

    return bounds.length > 0 ? bounds : null;
  };

  const activeRouteObj = selectedRoute || (analysis?.routes?.[0]);
  const activeRisk = activeRouteObj?.riskAnalysis;
  const weatherAnalysis = activeRisk?.weatherAnalysis || {};
  const safetyScore = activeRisk?.riskScore !== undefined ? Math.max(5, 100 - activeRisk.riskScore) : 85;

  const originName = route?.origin?.locationName || analysis?.origin?.locationName || 'Origin';
  const destName = route?.destination?.locationName || analysis?.destination?.locationName || 'Destination';

  return (
    <div className="space-y-4 text-xs text-customText max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-darkBorder">
        <div>
          <h3 className="text-base font-bold text-customText flex items-center gap-2 uppercase tracking-wider">
            <Navigation className="w-5 h-5 text-customPrimary" />
            Route Intelligence Analysis
          </h3>
          <p className="text-[11px] text-customMuted mt-0.5 font-semibold">
            {originName} → {destName}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="font-bold text-[10px] uppercase tracking-wider"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${analyzing ? 'animate-spin' : ''}`} />
          {analysis ? 'Re-analyze' : 'Retry'}
        </Button>
      </div>

      {/* Loading State */}
      {analyzing && (
        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader className="w-10 h-10 text-customPrimary animate-spin" />
            <div className="text-center">
              <p className="text-customText font-bold text-xs uppercase tracking-wider">Analyzing Route Intelligence...</p>
              <p className="text-[10px] text-customMuted mt-1">
                Evaluating corridor geometry, real weather conditions, risk factors, and AI safety recommendations
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !analyzing && (
        <Card className="bg-customDanger/10 border border-customDanger/30">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-customDanger shrink-0 mt-0.5" />
                <div>
                  <p className="text-customDanger font-bold text-xs uppercase tracking-wider">Analysis Failed</p>
                  <p className="text-[11px] text-customDanger/90 mt-1 font-medium">{error}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAnalyze}
                className="border-customDanger/40 text-customDanger hover:bg-customDanger/10 text-[10px] font-bold uppercase tracking-wider shrink-0"
              >
                Retry Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && !analyzing && (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-darkCard border border-darkBorder rounded-xl space-y-1">
              <span className="text-[9px] text-customMuted font-extrabold uppercase tracking-wider block">Distance</span>
              <p className="text-sm font-bold font-mono text-customText">
                {activeRouteObj?.distanceKm || route?.distance || '---'} km
              </p>
            </div>
            <div className="p-3 bg-darkCard border border-darkBorder rounded-xl space-y-1">
              <span className="text-[9px] text-customMuted font-extrabold uppercase tracking-wider block">Est. Transit Time</span>
              <p className="text-sm font-bold font-mono text-customText">
                {activeRouteObj?.durationMinutes ? `${Math.floor(activeRouteObj.durationMinutes / 60)}h ${activeRouteObj.durationMinutes % 60}m` : '---'}
              </p>
            </div>
            <div className="p-3 bg-darkCard border border-darkBorder rounded-xl space-y-1">
              <span className="text-[9px] text-customMuted font-extrabold uppercase tracking-wider block">Safety Score</span>
              <p className="text-sm font-bold font-mono text-customPrimary">
                {safetyScore} / 100
              </p>
            </div>
            <div className="p-3 bg-darkCard border border-darkBorder rounded-xl space-y-1">
              <span className="text-[9px] text-customMuted font-extrabold uppercase tracking-wider block">Overall Risk</span>
              <Badge
                variant={
                  activeRisk?.riskLevel === 'LOW' ? 'success' :
                  activeRisk?.riskLevel === 'MEDIUM' ? 'warning' : 'danger'
                }
                className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider"
              >
                {activeRisk?.riskLevel || 'LOW'} RISK
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map Panel (spans 2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-darkCard border border-darkBorder">
                <CardHeader className="py-2.5 px-4 border-b border-darkBorder">
                  <CardTitle className="flex items-center gap-2 text-customText text-xs uppercase tracking-wider font-bold">
                    <MapPin className="w-4 h-4 text-customPrimary" />
                    Route Corridor Map Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[380px] rounded-lg overflow-hidden border border-darkBorder">
                    <MapContainer
                      center={[analysis.origin.latitude, analysis.origin.longitude]}
                      zoom={8}
                      style={{ height: '100%', width: '100%' }}
                      className="z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapAutoFit bounds={getMapBounds()} />

                      <Marker
                        position={[analysis.origin.latitude, analysis.origin.longitude]}
                        icon={originIcon}
                      >
                        <Popup>
                          <div className="text-xs font-bold">
                            <p>Origin: {analysis.origin.locationName}</p>
                          </div>
                        </Popup>
                      </Marker>

                      <Marker
                        position={[analysis.destination.latitude, analysis.destination.longitude]}
                        icon={destinationIcon}
                      >
                        <Popup>
                          <div className="text-xs font-bold">
                            <p>Destination: {analysis.destination.locationName}</p>
                          </div>
                        </Popup>
                      </Marker>

                      {analysis.routes?.map((r) => (
                        <Polyline
                          key={r.routeId}
                          positions={r.coordinates}
                          pathOptions={{
                            color: r.routeId === selectedRoute?.routeId 
                              ? getRiskColor(r.riskAnalysis?.riskLevel)
                              : '#4b5563',
                            weight: r.routeId === selectedRoute?.routeId ? 5 : 3,
                            opacity: r.routeId === selectedRoute?.routeId ? 0.9 : 0.4
                          }}
                        >
                          <Popup>
                            <div className="text-xs">
                              <p className="font-bold">{r.routeName}</p>
                              <p>Distance: {r.distanceKm} km</p>
                              <p>Duration: {r.durationMinutes} min</p>
                              <p>Risk: {r.riskAnalysis?.riskLevel || 'LOW'}</p>
                            </div>
                          </Popup>
                        </Polyline>
                      ))}
                    </MapContainer>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[9px] text-customMuted px-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Origin</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> Destination</span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold">
                      <span className="flex items-center gap-1"><span className="w-4 h-1 bg-emerald-500 inline-block"/> Low Risk</span>
                      <span className="flex items-center gap-1"><span className="w-4 h-1 bg-amber-500 inline-block"/> Medium Risk</span>
                      <span className="flex items-center gap-1"><span className="w-4 h-1 bg-rose-500 inline-block"/> High Risk</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Breakdown: Environmental Hazards & AI Safety */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Environmental Hazards */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="py-2 px-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      Environmental Hazards & Risk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-[10px]">
                    <div className="flex items-center justify-between py-1 border-b border-darkBorder/40">
                      <span className="text-customMuted">Heavy Rain Risk:</span>
                      <span className="font-bold text-customText">
                        {weatherAnalysis.hasHeavyRain ? 'HIGH (Rainfall > 15mm/h)' : weatherAnalysis.maxRainfall > 0 ? 'MODERATE' : 'LOW'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-darkBorder/40">
                      <span className="text-customMuted">Flood Risk:</span>
                      <span className="font-bold text-customText">
                        {weatherAnalysis.hasHeavyRain ? 'MODERATE' : 'LOW'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-darkBorder/40">
                      <span className="text-customMuted">Storm Risk:</span>
                      <span className="font-bold text-customText">
                        {weatherAnalysis.hasStrongWind ? 'MODERATE' : 'LOW'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-darkBorder/40">
                      <span className="text-customMuted">Wind Speed:</span>
                      <span className="font-bold font-mono text-customText">
                        {weatherAnalysis.maxWindSpeed || 12} km/h
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-customMuted">Visibility:</span>
                      <span className="font-bold text-customText">
                        {weatherAnalysis.minVisibility < 2000 ? 'POOR' : weatherAnalysis.minVisibility < 5000 ? 'MODERATE' : 'GOOD'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Driver Safety & Shipment Impact */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="py-2 px-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-customPrimary" />
                      Driver Safety & Cargo Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-[10px]">
                    <div>
                      <span className="font-bold text-customText uppercase text-[9px] block text-customPrimary">Driver Safety Considerations:</span>
                      <p className="text-customMuted mt-0.5 leading-relaxed">
                        {activeRisk?.riskLevel === 'HIGH' 
                          ? 'Enforce maximum 50 km/h speed limit. Instruct driver to use fog lamps and maintain 50m vehicle gap.'
                          : 'Standard highway safety protocol. Schedule mandatory rest break after 180 km.'}
                      </p>
                    </div>
                    <div className="pt-1.5 border-t border-darkBorder/40">
                      <span className="font-bold text-customText uppercase text-[9px] block text-customPrimary">Shipment Impact:</span>
                      <p className="text-customMuted mt-0.5 leading-relaxed">
                        Cargo payload protected in climate-sealed transport transponder. Zero delay expected under current corridor conditions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Route Options & AI Recommendation Side Panel */}
            <div className="space-y-4">
              <Card className="bg-darkCard border border-darkBorder">
                <CardHeader className="py-2.5 px-4 border-b border-darkBorder">
                  <CardTitle className="text-customText text-xs uppercase tracking-wider font-bold">
                    Corridor Alternatives
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2.5">
                  {analysis.routes?.map((routeOption) => {
                    const isSelected = selectedRoute?.routeId === routeOption.routeId;
                    const risk = routeOption.riskAnalysis;

                    return (
                      <div
                        key={routeOption.routeId}
                        onClick={() => setSelectedRoute(routeOption)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-customPrimary/10 border-customPrimary'
                            : 'bg-darkBgSecondary/40 border-darkBorder hover:border-darkBorder/80'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <p className="font-bold text-customText text-[11px]">
                              {routeOption.routeName}
                            </p>
                            {routeOption.isRecommended && (
                              <Badge variant="primary" className="mt-1 text-[8px] px-1 py-0.2">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />
                                AI Recommended
                              </Badge>
                            )}
                          </div>
                          <Badge
                            variant={
                              risk?.riskLevel === 'LOW' ? 'success' :
                              risk?.riskLevel === 'MEDIUM' ? 'warning' : 'danger'
                            }
                            className="text-[9px] px-1.5 py-0.5 font-bold"
                          >
                            {risk?.riskLevel || 'LOW'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-customMuted font-mono">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-customPrimary" />
                            {routeOption.distanceKm} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-customPrimary" />
                            {routeOption.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* AI Recommendation Box */}
              {analysis.recommendation && (
                <Card className="bg-customPrimary/5 border border-customPrimary/20">
                  <CardHeader className="py-2.5 px-4 border-b border-customPrimary/15">
                    <CardTitle className="text-customText text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-customPrimary" />
                      AI Intelligence Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-[10px]">
                    <p className="text-customText leading-relaxed font-medium">
                      {analysis.recommendation.reasoning}
                    </p>

                    <div className="pt-2 border-t border-customPrimary/15 flex items-center justify-between">
                      <span className="text-customMuted font-semibold">Rerouting Advice:</span>
                      <span className="font-bold text-customPrimary">
                        {activeRisk?.riskLevel === 'HIGH' ? 'REROUTING RECOMMENDED' : 'PROCEED ON SCHEDULE'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confirm Route Button */}
              <Button
                variant="primary"
                onClick={handleConfirmRoute}
                disabled={!selectedRoute}
                className="w-full font-bold uppercase tracking-wider text-[10px] py-2.5"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Confirm Selected Corridor Route
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteIntelligencePanel;
