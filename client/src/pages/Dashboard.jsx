import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Plus, 
  Database,
  EyeOff,
  ShieldAlert,
  Clock,
  Layout,
  RefreshCw,
  Bell,
  BarChart2,
  FileText,
  Shield,
  Zap,
  Globe,
  Award,
  ChevronRight,
  TrendingUp,
  MapPin,
  Route as RouteIcon
} from 'lucide-react';
import { getShipments } from '../services/shipmentService';
import { getOrders } from '../services/orderService';
import { getAlerts } from '../services/alertService';
import { getOverview, getShipmentAnalytics, getDeliveryPerformance } from '../services/analyticsService';
import { geocodeShipments } from '../services/geocodingService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import Badge from '../components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DashboardMetricCard from '../components/layout/DashboardMetricCard';
import OperationalMapPanel from '../components/layout/OperationalMapPanel';
import RiskDistribution from '../components/layout/RiskDistribution';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isHindi, translateStatus, translateSeverity, translateAlertTitle, translateAlertDescription } = useLanguage();
  
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);
  const [overviewData, setOverviewData] = useState(null);
  const [shipmentAnalytics, setShipmentAnalytics] = useState(null);
  const [deliveryPerformance, setDeliveryPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  const [geocodingAttempted, setGeocodingAttempted] = useState(false);

  // Clock updates for operational feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [shipmentsRes, ordersRes, alertsRes, overviewRes, shipmentAnalyticsRes, deliveryPerformanceRes] = await Promise.all([
        getShipments({ limit: 100 }), // Get all shipments for map
        getOrders({ limit: 10 }),
        getAlerts({ limit: 100 }),
        getOverview(),
        getShipmentAnalytics(),
        getDeliveryPerformance()
      ]);
      
      if (
        shipmentsRes.data?.success && 
        ordersRes.data?.success && 
        alertsRes.data?.success &&
        overviewRes.data?.success &&
        shipmentAnalyticsRes.data?.success &&
        deliveryPerformanceRes.data?.success
      ) {
        const fetchedShipments = shipmentsRes.data.data.shipments || [];
        console.log('[Dashboard] Fetched shipments:', fetchedShipments.length);
        console.log('[Dashboard] Shipments with coordinates:', 
          fetchedShipments.filter(s => s.pickup?.latitude && s.destination?.latitude).length
        );
        
        setShipments(fetchedShipments);
        setOrders(ordersRes.data.data || []);
        setOverviewData(overviewRes.data.data);
        setShipmentAnalytics(shipmentAnalyticsRes.data.data);
        setDeliveryPerformance(deliveryPerformanceRes.data.data);
        
        const list = alertsRes.data.data.alerts || [];
        const activeList = list.filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');
        setActiveAlerts(activeList.slice(0, 5));
        setActiveAlertsCount(list.filter(a => a.status === 'ACTIVE').length);
        setCriticalAlertsCount(list.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length);

        // Check if shipments need geocoding
        const needsGeocoding = fetchedShipments.some(s => 
          !s.pickup?.latitude || !s.destination?.latitude
        );

        if (needsGeocoding && !geocodingAttempted && (user?.role === 'ADMIN' || user?.role === 'LOGISTICS_OPERATOR')) {
          console.log('[Dashboard] Shipments need geocoding, triggering automatic geocoding...');
          triggerGeocoding();
        }
      } else {
        setApiError(true);
      }
    } catch (err) {
      console.error('Failed to load live dashboard data:', err);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  // Trigger automatic geocoding for shipments without coordinates
  const triggerGeocoding = async () => {
    if (geocodingInProgress || geocodingAttempted) return;
    
    setGeocodingInProgress(true);
    setGeocodingAttempted(true);
    
    try {
      console.log('[Dashboard] Starting automatic geocoding...');
      const response = await geocodeShipments();
      
      if (response.data?.success) {
        console.log('[Dashboard] Geocoding completed:', response.data.data);
        
        // Refresh shipments to get updated coordinates
        const shipmentsRes = await getShipments({ limit: 100 });
        if (shipmentsRes.data?.success) {
          setShipments(shipmentsRes.data.data.shipments || []);
        }
      }
    } catch (error) {
      console.error('[Dashboard] Geocoding failed:', error);
      // Don't show error to user - map will handle empty state
    } finally {
      setGeocodingInProgress(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute status metrics
  const totalShipments = overviewData?.shipments?.total ?? 0;
  const activeDeliveries = overviewData?.shipments?.active ?? 0;
  const completedDeliveries = overviewData?.shipments?.delivered ?? 0;

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1 font-sans selection:bg-customPrimary selection:text-white">
      
      {/* 1. TOP DOCK telemetry status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-darkCard/30 border border-darkBorder/40 rounded-xl px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${apiError ? 'bg-customDanger shadow-[0_0_10px_#ef4444]' : 'bg-customPrimary animate-pulse shadow-[0_0_10px_#a855f7]'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-customMuted">
            {t('telemetryCore', 'Telemetry Core')}: <span className={apiError ? 'text-customDanger' : 'text-customPrimary font-black text-xs font-mono neon-text-purple'}>
              {apiError ? t('databaseOffline', 'DATABASE OFFLINE') : t('activeStatus', 'ACTIVE')}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-customMuted font-mono text-[9px] font-semibold">
          <span className="border-r border-darkBorder/50 pr-4">{t('latency', 'LATENCY')}: 42ms</span>
          <span className="border-r border-darkBorder/50 pr-4">{t('mdbAtlasConnected', 'MDB ATLAS: CONNECTED')}</span>
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 2. FUTURE HERO BANNER (Left title, Right metrics capsules) */}
      <div className="relative overflow-hidden bg-darkCard/40 border border-darkBorder/40 rounded-2xl p-6 md:p-8 neon-glow-purple">
        <div className="absolute top-0 right-0 w-80 h-80 bg-customPrimary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-customSecondary/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none uppercase">
              {t('intelligentLogistics', 'INTELLIGENT LOGISTICS.')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-customPrimary to-customSecondary neon-text-purple">
                {t('smarterDeliveries', 'SMARTER DELIVERIES.')}
              </span>
            </h1>
            <p className="text-[11px] md:text-xs text-customMuted leading-relaxed max-w-lg">
              {t('heroSubtitle', 'AI-powered route intelligence and real-time insights to ensure reliable delivery of essential goods across challenging regional corridors.')}
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(user?.role === 'NGO' ? '/orders' : '/shipments')}
                className="font-bold uppercase tracking-wider text-[9px] px-6 py-2.5 flex items-center gap-1 hover:scale-[1.02] transform transition-transform"
              >
                <span>{user?.role === 'NGO' ? t('requestReliefOrder', 'Request Relief Order') : t('explorePlatform', 'Explore Platform')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Glowing Badges Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-auto shrink-0 select-none">
            <div className="p-3 sm:p-4 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl flex items-center gap-3 w-full sm:w-44 hover:border-customPrimary/30 transition-colors">
              <div className="p-2 bg-customPrimary/10 border border-customPrimary/20 rounded-lg text-customPrimary shrink-0">
                <RouteIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-customText font-mono leading-none">250+</div>
                <div className="text-[8px] text-customMuted font-bold uppercase tracking-wider mt-1 truncate">{t('optimizedRoutes', 'Optimized Routes')}</div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl flex items-center gap-3 w-full sm:w-44 hover:border-customSecondary/30 transition-colors">
              <div className="p-2 bg-customSecondary/10 border border-customSecondary/20 rounded-lg text-customSecondary shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-customText font-mono leading-none">10K+</div>
                <div className="text-[8px] text-customMuted font-bold uppercase tracking-wider mt-1 truncate">{t('deliveriesManaged', 'Deliveries Managed')}</div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl flex items-center gap-3 w-full sm:w-44 hover:border-customPrimary/30 transition-colors">
              <div className="p-2 bg-customPrimary/15 border border-customPrimary/20 rounded-lg text-customPrimary shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-customText font-mono leading-none">98.6%</div>
                <div className="text-[8px] text-customMuted font-bold uppercase tracking-wider mt-1 truncate">{t('deliveryAccuracy', 'Delivery Accuracy')}</div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl flex items-center gap-3 w-full sm:w-44 hover:border-customSecondary/30 transition-colors">
              <div className="p-2 bg-customSecondary/15 border border-customSecondary/20 rounded-lg text-customSecondary shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-customText font-mono leading-none">24/7</div>
                <div className="text-[8px] text-customMuted font-bold uppercase tracking-wider mt-1 truncate">{t('realtimeMonitoring', 'Real-time Monitoring')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW 1: Geographic Map Visualization (2/3) + Weather Hazard Alerts (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Route Map View */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="bg-darkCard/40 border border-darkBorder/40 flex flex-col h-full overflow-hidden">
            <CardHeader className="pb-3 border-b border-darkBorder/40 flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-customSecondary animate-spin-slow" />
                <span>{t('geographicNetworkFleetTracker', 'Geographic Network Fleet Tracker')}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {geocodingInProgress && (
                  <span className="text-[9px] text-customPrimary flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {t('geocoding', 'Geocoding...')}
                  </span>
                )}
                <Badge variant="primary" className="text-[8px] px-2 font-mono">{t('liveGpsFeed', 'LIVE GPS FEED')}</Badge>
              </div>
            </CardHeader>
            <div className="relative flex-1 min-h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-darkCard/20">
                  <LoadingSpinner size="md" text={t('syncingFleetTracker', 'Syncing fleet maps tracker...')} />
                </div>
              ) : apiError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <EyeOff className="w-8 h-8 text-customDanger" />
                  <span className="text-xs font-bold text-customText">{t('mapRegistryOffline', 'Map Registry Offline')}</span>
                  <Button variant="outline" size="sm" onClick={fetchDashboardData}>{t('retryMap', 'Retry Map')}</Button>
                </div>
              ) : (
                <OperationalMapPanel shipments={shipments} alerts={activeAlerts} />
              )}
            </div>
          </Card>
        </div>

        {/* Hazard & Alerts Monitoring */}
        <Card className="bg-darkCard/40 border border-darkBorder/40 flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3 border-b border-darkBorder/40 flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-customPrimary animate-bounce" />
              <span>{t('weatherRouteHazardsFeed', 'Weather & Route Hazards Feed')}</span>
            </CardTitle>
            {activeAlertsCount > 0 && (
              <Badge variant="danger" className="animate-pulse text-[8px]">
                {activeAlertsCount} {t('activeCaps', 'ACTIVE')}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px] lg:max-h-[460px]">
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : apiError ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-12 text-customMuted">
                <ShieldAlert className="w-6 h-6 text-customDanger" />
                <span className="text-[9px] uppercase font-bold text-customDanger">{t('alertStreamOffline', 'Alert Stream Offline')}</span>
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-customMuted italic select-none">
                {t('noActiveRouteHazards', 'No active route delays or weather hazards reported.')}
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert._id}
                  onClick={() => navigate(`/alerts?alert=${alert._id}`)}
                  className="p-3 bg-darkBgSecondary/60 border border-darkBorder/60 rounded-xl hover:border-customPrimary/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)] transition-all cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-customText text-[10px] uppercase tracking-wide truncate max-w-[150px]">
                      {translateAlertTitle(alert.title)}
                    </span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                      alert.severity === 'CRITICAL' ? 'bg-customDanger/10 text-customDanger border-customDanger/30 animate-pulse' :
                      alert.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                      'bg-customWarning/10 text-customWarning border-customWarning/30'
                    }`}>
                      {translateSeverity(alert.severity)}
                    </span>
                  </div>
                  <p className="text-[10px] text-customMuted leading-relaxed line-clamp-2">
                    {translateAlertDescription(alert.description)}
                  </p>
                  <div className="flex justify-between items-center text-[8px] text-customMuted font-mono mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-customPrimary" />
                      {alert.location?.region || t('coordinateTrack', 'Coordinate Track')}
                    </span>
                    <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. ROW 2: Deliveries Status Chart (1/3) + Recent Deliveries Table (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Donut Distribution */}
        <Card className="bg-darkCard/40 border border-darkBorder/40 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-darkBorder/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-customPrimary" />
              {t('deliveriesStatusDistribution', 'Deliveries Status Distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col items-center justify-center min-h-[250px]">
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : shipmentAnalytics?.statusCounts?.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shipmentAnalytics.statusCounts}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={50}
                      paddingAngle={4}
                      label={({ name, percent }) => `${translateStatus(name)} (${(percent * 100).toFixed(0)}%)`}
                      style={{ fontSize: '8px', fill: '#94A3B8', fontWeight: 'bold' }}
                    >
                      {shipmentAnalytics.statusCounts.map((entry, idx) => (
                        <Cell 
                          key={`cell-${idx}`} 
                          fill={['#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][idx % 5]} 
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text overlay */}
                <div className="absolute flex flex-col items-center justify-center font-sans">
                  <span className="text-xl font-black text-customText font-mono leading-none">{totalShipments}</span>
                  <span className="text-[7px] text-customMuted uppercase font-bold tracking-widest mt-1">{t('totalLogs', 'Total Logs')}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-2 text-customMuted">
                <Layout className="w-8 h-8 text-darkBorder" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('noDistributionLogs', 'No Distribution Logs')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deliveries / NGO Orders registry */}
        <div className="lg:col-span-2">
          <Card className="bg-darkCard/40 border border-darkBorder/40 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b border-darkBorder/40 flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-customSecondary" />
                <span>{user?.role === 'NGO' ? t('recentNgoOrderRequests', 'Recent NGO Order Requests') : t('recentOperationalShipments', 'Recent Operational Shipments')}</span>
              </CardTitle>
              <span className="text-[9px] text-customMuted font-mono">{t('showingLatest5Entries', 'Showing latest 5 entries')}</span>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="py-16 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : user?.role === 'NGO' ? (
                orders.length === 0 ? (
                  <div className="py-16 text-center text-customMuted italic">
                    {t('noOrderRequestsCreated', 'No order requests created yet.')}
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-darkBorder/30 text-customMuted font-bold bg-darkBgSecondary/20 select-none">
                        <th className="px-6 py-2.5">{t('orderId', 'Order ID')}</th>
                        <th className="px-4 py-2.5">{t('cargo', 'Cargo')}</th>
                        <th className="px-4 py-2.5">{t('routeHubs', 'Route Hubs')}</th>
                        <th className="px-4 py-2.5">{t('priority', 'Priority')}</th>
                        <th className="px-4 py-2.5">{t('status', 'Status')}</th>
                        <th className="px-6 py-2.5 text-right">{t('actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/20">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-6 py-3 font-bold text-customPrimary font-mono">
                            {o.orderId || 'PENDING'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-customText">
                            {o.cargoDescription} ({o.quantity} units)
                          </td>
                          <td className="px-4 py-3 text-customMuted">
                            <span className="font-semibold text-customText">{o.pickupLocation?.locationName}</span>
                            <span className="mx-1.5">→</span>
                            <span>{o.deliveryLocation?.locationName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge type="priority" value={o.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge type="status" value={o.status} />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => navigate('/orders')}
                              className="px-2.5 py-1 text-[9px] bg-darkBgSecondary hover:bg-customPrimary/10 border border-darkBorder hover:border-customPrimary/30 rounded-lg text-customMuted hover:text-customPrimary font-bold uppercase tracking-wider transition-all"
                            >
                              {t('inspect', 'Inspect')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : shipments.length === 0 ? (
                <div className="py-16 text-center text-customMuted italic">
                  {t('noShipmentsRegistered', 'No shipments registered.')}
                </div>
              ) : (
                <table className="w-full text-left text-[11px] border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-darkBorder/30 text-customMuted font-bold bg-darkBgSecondary/20 select-none">
                      <th className="px-6 py-2.5">{t('shipmentId', 'Shipment ID')}</th>
                      <th className="px-4 py-2.5">{t('cargoDetails', 'Cargo Details')}</th>
                      <th className="px-4 py-2.5">{t('routeHubs', 'Route Hubs')}</th>
                      <th className="px-4 py-2.5">{t('priority', 'Priority')}</th>
                      <th className="px-4 py-2.5">{t('status', 'Status')}</th>
                      <th className="px-6 py-2.5 text-right">{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/20">
                    {shipments.slice(0, 5).map((s) => (
                      <tr key={s._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                        <td className="px-6 py-3 font-bold text-customPrimary font-mono">
                          {s.shipmentId || 'PENDING'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-customText">
                          {s.goodsType} ({s.quantity} {s.unit})
                        </td>
                        <td className="px-4 py-3 text-customMuted">
                          <span className="font-semibold text-customText">{s.pickup?.locationName}</span>
                          <span className="mx-1.5">→</span>
                          <span>{s.destination?.locationName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge type="priority" value={s.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge type="status" value={s.status} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => navigate(`/shipments/${s._id}`)}
                            className="px-2.5 py-1 text-[9px] bg-darkBgSecondary hover:bg-customPrimary/10 border border-darkBorder hover:border-customPrimary/30 rounded-lg text-customMuted hover:text-customPrimary font-bold uppercase tracking-wider transition-all"
                          >
                            {t('inspect', 'Inspect')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. QUICK ACTION BUTTONS (Neon Cards) */}
      <div className="space-y-3 w-full">
        <span className="text-[9px] text-customMuted uppercase font-black tracking-widest block select-none">
          {t('operationalShortcuts', 'Operational Shortcuts')}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate('/routes')}
            className="flex items-center justify-between p-4 sm:p-5 bg-darkCard/40 border border-darkBorder/40 rounded-xl text-left hover:border-customPrimary/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)] group transition-all w-full h-full min-h-[72px]"
          >
            <div className="space-y-1">
              <span className="text-[8px] text-customMuted uppercase font-bold tracking-widest block">{t('navigationPlanner', 'Navigation Planner')}</span>
              <h4 className="text-xs font-bold text-customText group-hover:text-customPrimary transition-colors uppercase">{t('planNewRoute', 'Plan New Route')}</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-customMuted group-hover:text-customPrimary transition-colors shrink-0 ml-2" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/shipments/create')}
            className="flex items-center justify-between p-4 sm:p-5 bg-darkCard/40 border border-darkBorder/40 rounded-xl text-left hover:border-customPrimary/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)] group transition-all w-full h-full min-h-[72px]"
          >
            <div className="space-y-1">
              <span className="text-[8px] text-customMuted uppercase font-bold tracking-widest block">{t('dispatchSystem', 'Dispatch System')}</span>
              <h4 className="text-xs font-bold text-customText group-hover:text-customPrimary transition-colors uppercase">{t('addDelivery', 'Add Delivery')}</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-customMuted group-hover:text-customPrimary transition-colors shrink-0 ml-2" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center justify-between p-4 sm:p-5 bg-darkCard/40 border border-darkBorder/40 rounded-xl text-left hover:border-customPrimary/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)] group transition-all w-full h-full min-h-[72px]"
          >
            <div className="space-y-1">
              <span className="text-[8px] text-customMuted uppercase font-bold tracking-widest block">{t('auditLogs', 'Audit Logs')}</span>
              <h4 className="text-xs font-bold text-customText group-hover:text-customPrimary transition-colors uppercase">{t('generateReport', 'Generate Report')}</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-customMuted group-hover:text-customPrimary transition-colors shrink-0 ml-2" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="flex items-center justify-between p-4 sm:p-5 bg-darkCard/40 border border-darkBorder/40 rounded-xl text-left hover:border-customPrimary/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)] group transition-all w-full h-full min-h-[72px]"
          >
            <div className="space-y-1">
              <span className="text-[8px] text-customMuted uppercase font-bold tracking-widest block">{t('riskFeed', 'Risk Feed')}</span>
              <h4 className="text-xs font-bold text-customText group-hover:text-customPrimary transition-colors uppercase">{t('manageAlerts', 'Manage Alerts')}</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-customMuted group-hover:text-customPrimary transition-colors shrink-0 ml-2" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
