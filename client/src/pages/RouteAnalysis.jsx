import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Compass, RefreshCw, AlertCircle, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getShipments, getShipmentById } from '../services/shipmentService';
import { generateRoutes, getRoutes, selectRoute } from '../services/routeService';
import { getShipmentRouteRisks } from '../services/environmentService';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LogisticsMap from '../components/map/LogisticsMap';
import RouteComparisonCard from '../components/layout/RouteComparisonCard';
import { getShipmentRecommendation } from '../services/recommendationService';
import SmartRecommendationCard from '../components/layout/SmartRecommendationCard';

const RouteAnalysis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected shipment reference
  const paramShipmentId = searchParams.get('shipment') || '';

  // Data lists
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [routes, setRoutes] = useState([]);

  // Loading / Error states
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Map highlighting states
  const [highlightedRouteId, setHighlightedRouteId] = useState('');

  // Environmental risks states
  const [envRisks, setEnvRisks] = useState({});
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [envError, setEnvError] = useState(false);
  const [showEnvOverlay, setShowEnvOverlay] = useState(false);

  // Recommendation Engine states
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState(false);

  // Check roles permission
  const isOperatorOrAdmin = user && ['ADMIN', 'LOGISTICS_OPERATOR'].includes(user.role);

  // Fetch all accessible shipments
  useEffect(() => {
    const fetchShipmentsList = async () => {
      setLoadingShipments(true);
      try {
        const res = await getShipments({ limit: 100 });
        if (res.data && res.data.success) {
          setShipments(res.data.data.shipments || []);
        }
      } catch (err) {
        console.error('Failed to load shipments directory:', err);
        setError('Failed to fetch shipments catalog.');
      } finally {
        setLoadingShipments(false);
      }
    };
    fetchShipmentsList();
  }, []);

  // Sync selected shipment and fetch its routes on change
  useEffect(() => {
    if (!paramShipmentId) {
      setSelectedShipment(null);
      setRoutes([]);
      return;
    }

    const loadShipmentAndRoutes = async () => {
      setLoadingRoutes(true);
      setError('');
      setSuccessMsg('');
      try {
        // Load full details of selected shipment
        const shpRes = await getShipmentById(paramShipmentId);
        if (shpRes.data && shpRes.data.success) {
          setSelectedShipment(shpRes.data.data);
        }

        // Load route alternatives
        const routeRes = await getRoutes(paramShipmentId);
        if (routeRes.data && routeRes.data.success) {
          setRoutes(routeRes.data.data.routes || []);
        }
      } catch (err) {
        // 400 or 404 indicates routes do not exist yet (or location coordinates mismatch)
        if (err.response?.status === 400 || err.response?.status === 404) {
          setRoutes([]);
        } else {
          console.error('Failed to load routes:', err);
          setError(err.response?.data?.message || 'Failed to query route alternatives.');
        }
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadShipmentAndRoutes();
  }, [paramShipmentId]);

  // Load environmental risks after routes load
  useEffect(() => {
    if (!paramShipmentId || routes.length === 0) {
      setEnvRisks({});
      return;
    }

    const fetchEnvironmentalRisks = async () => {
      setLoadingEnv(true);
      setEnvError(false);
      try {
        const res = await getShipmentRouteRisks(paramShipmentId);
        if (res.data && res.data.success) {
          const mappings = {};
          res.data.data.forEach((risk) => {
            mappings[risk.routeId] = risk;
          });
          setEnvRisks(mappings);
        }
      } catch (err) {
        console.error('Failed to load environmental analysis:', err);
        setEnvError(true);
      } finally {
        setLoadingEnv(false);
      }
    };

    fetchEnvironmentalRisks();
  }, [paramShipmentId, routes]);

  // Check URL params to auto-enable environmental overlays
  useEffect(() => {
    const isEnvRequested = searchParams.get('environment') === 'true';
    if (isEnvRequested) {
      setShowEnvOverlay(true);
    }
  }, [searchParams]);

  // Load route recommendation after routes load
  useEffect(() => {
    if (!paramShipmentId || routes.length === 0) {
      setRecommendation(null);
      return;
    }

    const fetchRecommendation = async () => {
      setLoadingRecommendation(true);
      setRecommendationError(false);
      try {
        const res = await getShipmentRecommendation(paramShipmentId);
        if (res.data && res.data.success) {
          setRecommendation(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load route recommendations:', err);
        setRecommendationError(true);
      } finally {
        setLoadingRecommendation(false);
      }
    };

    fetchRecommendation();
  }, [paramShipmentId, routes]);

  // Check URL params to auto-highlight recommended route
  useEffect(() => {
    if (searchParams.get('recommendation') === 'true' && recommendation && recommendation.recommendedRouteId) {
      setHighlightedRouteId(recommendation.recommendedRouteId);
    }
  }, [searchParams, recommendation]);

  // Handle dropdown selection change
  const handleShipmentChange = (e) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('shipment', val);
    } else {
      newParams.delete('shipment');
    }
    setSearchParams(newParams);
  };

  // Generate route alternatives
  const handleGenerateRoutes = async () => {
    if (!selectedShipment) return;
    setGenerating(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await generateRoutes(selectedShipment._id);
      if (res.data && res.data.success) {
        setRoutes(res.data.data.routes || []);
        setSuccessMsg('Route alternatives calculated successfully using demo terrain analysis.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to generate routes:', err);
      setError(err.response?.data?.message || 'Route generation failed. Check coordinates resolver.');
    } finally {
      setGenerating(false);
    }
  };

  // Select a specific route
  const handleSelectRoute = async (routeObjOrId) => {
    if (!selectedShipment) return;

    const routeId = typeof routeObjOrId === 'string' ? routeObjOrId : routeObjOrId.routeId;
    const routeObj = typeof routeObjOrId === 'object' ? routeObjOrId : routes.find(r => r.routeId === routeId);
    
    const confirmChoice = window.confirm(
      `Select this route alternative for shipment ${selectedShipment.shipmentId}?`
    );
    if (!confirmChoice) return;

    setSelecting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await selectRoute(selectedShipment._id, routeId, routeObj);
      if (res.data && res.data.success) {
        // Update shipment details in view
        setSelectedShipment(res.data.data.shipment);
        setSuccessMsg(`Route ${routeId} selected. Shipment status shifted to ROUTE_SELECTED.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to select route:', err);
      setError(err.response?.data?.message || 'Failed to record route selection.');
    } finally {
      setSelecting(false);
    }
  };

  // Map route options for dropdown selector
  const shipmentOptions = [
    { label: 'Select a shipment to analyze...', value: '' },
    ...shipments.map(s => ({
      label: `${s.shipmentId} (${s.pickup.locationName} → ${s.destination.locationName}) - Priority: ${s.priority}`,
      value: s._id
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Route Intelligence"
        description="Generate, evaluate, and compare logistics route alternatives across the North Eastern Region."
      />

      {/* Shipment selector card */}
      <Card className="bg-darkCard/80 border border-darkBorder">
        <CardContent className="pt-4">
          {loadingShipments ? (
            <LoadingSpinner size="sm" text="Querying shipments registry..." />
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Select
                  label="Select Active Shipment"
                  options={shipmentOptions}
                  value={paramShipmentId}
                  onChange={handleShipmentChange}
                  placeholder=""
                />
              </div>
              {selectedShipment && routes.length === 0 && !loadingRoutes && (
                <div className="flex-shrink-0">
                  {isOperatorOrAdmin ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGenerateRoutes}
                      disabled={generating}
                      className="w-full sm:w-auto font-bold uppercase tracking-wider text-xs py-2.5 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                      <span>Generate Route Alternatives</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-customWarning font-semibold pl-2 italic">
                      No route alternatives generated for this shipment.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Action Alerts */}
      {error && (
        <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading routes spinner */}
      {(loadingRoutes || generating) && (
        <Card className="min-h-[300px] flex flex-col items-center justify-center text-center space-y-4">
          <LoadingSpinner size="lg" text={generating ? "Generating route alternatives..." : "Querying routes repository..."} />
          {generating && (
            <p className="text-xs text-customMuted max-w-sm">
              Analyzing distance, terrain conditions and demo risk zones.
            </p>
          )}
        </Card>
      )}

      {/* Main Map + Comparison Dashboard columns */}
      {!loadingRoutes && !generating && selectedShipment && (
        <>
          {/* Smart Recommendation Engine section */}
          {selectedShipment && routes.length > 0 && (
            <div className="mb-6 space-y-4">
              {loadingRecommendation ? (
                <Card className="p-4 bg-darkCard/80 border border-darkBorder flex items-center justify-center">
                  <LoadingSpinner size="sm" text="Analyzing route alternatives and weather indices..." />
                </Card>
              ) : recommendationError ? (
                <div className="p-3 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-lg text-xs font-semibold">
                  Smart recommendation is currently unavailable.
                </div>
              ) : recommendation ? (
                <SmartRecommendationCard recommendationData={recommendation} />
              ) : null}
            </div>
          )}

          {routes.length === 0 ? (
            <EmptyState
              title="No route alternatives"
              description={
                isOperatorOrAdmin
                  ? 'No routes have been generated for this shipment yet. Click "Generate Route Alternatives" above.'
                  : 'No routes have been analyzed for this cargo delivery yet.'
              }
            />
          ) : (
            (() => {
              const activeRouteId = highlightedRouteId || (selectedShipment && selectedShipment.selectedRouteId) || (routes[0] && routes[0].routeId) || '';
              const activeEnvRisk = envRisks[activeRouteId];
              const envSamples = activeEnvRisk ? activeEnvRisk.samples : [];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                  {/* Left Side: Leaflet Visual Route (65% / 7 columns) */}
                  <div className="lg:col-span-7 flex flex-col space-y-3">
                    <LogisticsMap
                      mode="details"
                      singleShipment={selectedShipment}
                      routes={routes}
                      selectedRouteId={selectedShipment.selectedRouteId}
                      highlightedRouteId={highlightedRouteId}
                      onRouteClick={(routeId) => setHighlightedRouteId(routeId)}
                      height="500px"
                      envSamples={envSamples}
                      showEnvOverlay={showEnvOverlay}
                      onToggleEnvOverlay={(val) => setShowEnvOverlay(val)}
                      recommendedRouteId={recommendation?.recommendedRouteId}
                      rankedRoutes={recommendation?.rankedRoutes}
                    />
                    
                    {/* Visual disclaimer overlay */}
                    <div className="bg-darkBgSecondary border border-darkBorder rounded-lg p-3 text-[10px] text-customMuted leading-relaxed flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-customPrimary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-customText">Disclaimer: </span>
                        Estimated travel times and distance calculations are modeled using demo average route conditions (e.g. GOOD: 45 km/h, MOUNTAIN: 20 km/h) and do not represent live traffic or real geocoding.
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Alternatives Comparison list (35% / 3 columns) */}
                  <div className="lg:col-span-3 space-y-4 overflow-y-auto max-h-[570px] pr-1">
                    <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block">
                      Route Alternatives Comparison
                    </span>
                    <div className="space-y-4">
                      {routes.map((route) => {
                        const ranked = recommendation?.rankedRoutes?.find(r => r.routeId === route.routeId);
                        const recLevel = ranked ? ranked.recommendationLevel : null;
                        return (
                          <RouteComparisonCard
                            key={route.routeId}
                            route={route}
                            isSelected={selectedShipment.selectedRouteId === route.routeId}
                            isHighlighted={highlightedRouteId === route.routeId}
                            onHover={(isHovered) => setHighlightedRouteId(isHovered ? route.routeId : '')}
                            onSelect={isOperatorOrAdmin ? () => handleSelectRoute(route.routeId) : null}
                            selecting={selecting}
                            envRiskData={envRisks[route.routeId]}
                            loadingEnv={loadingEnv}
                            envError={envError}
                            recommendationLevel={recLevel}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}

      {/* Empty select page placeholder */}
      {!selectedShipment && !loadingShipments && (
        <Card className="min-h-[250px] flex items-center justify-center text-center p-6 bg-darkBgSecondary/10 border border-darkBorder border-dashed">
          <div className="space-y-2">
            <Compass className="w-10 h-10 text-customMuted mx-auto mb-2 animate-spin" style={{ animationDuration: '8s' }} />
            <h4 className="font-semibold text-customText">Select Shipment to Plan Route</h4>
            <p className="text-xs text-customMuted max-w-sm">
              Use the dropdown menu selector above to inspect shipments, generate alternatives, and select optimal transit paths.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

// Simple local EmptyState helper in case ui/EmptyState is unavailable
const EmptyState = ({ title, description }) => (
  <Card className="p-8 border border-darkBorder border-dashed text-center bg-darkBgSecondary/20 min-h-[200px] flex flex-col justify-center items-center">
    <FileText className="w-8 h-8 text-customMuted mb-2" />
    <h4 className="font-semibold text-customText text-sm">{title}</h4>
    <p className="text-xs text-customMuted max-w-xs mt-1 leading-normal">{description}</p>
  </Card>
);

export default RouteAnalysis;
