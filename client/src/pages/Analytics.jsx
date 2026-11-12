import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import { 
  Calendar, RefreshCw, AlertTriangle, 
  Truck, TrendingUp, Database, Navigation, AlertCircle
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  getOverview, 
  getShipmentAnalytics, 
  getDeliveryPerformance, 
  getVehicleAnalytics, 
  getRouteAnalytics, 
  getAlertAnalytics 
} from '../services/analyticsService';

const COLORS = {
  primary: '#3B82F6',
  secondary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  muted: '#64748B',
  darkBorder: '#334155',
  darkBg: '#1E293B'
};

const Analytics = () => {
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity } = useLanguage();

  const [datePreset, setDatePreset] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRangeActive, setCustomRangeActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [overview, setOverview] = useState(null);
  const [shipments, setShipments] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [alerts, setAlerts] = useState(null);

  const applyPresetDates = (preset) => {
    setError('');
    const today = new Date();
    let start = new Date();
    
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setCustomRangeActive(false);
    } else if (preset === '7days') {
      start.setDate(today.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setCustomRangeActive(false);
    } else if (preset === '30days') {
      start.setDate(today.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setCustomRangeActive(false);
    } else if (preset === '90days') {
      start.setDate(today.getDate() - 90);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      setCustomRangeActive(false);
    } else if (preset === 'custom') {
      setCustomRangeActive(true);
    }
  };

  useEffect(() => {
    applyPresetDates(datePreset);
  }, [datePreset]);

  const fetchAnalyticsDataset = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [
        overviewRes,
        shipmentsRes,
        deliveryRes,
        vehiclesRes,
        routesRes,
        alertsRes
      ] = await Promise.all([
        getOverview(params),
        getShipmentAnalytics(params),
        getDeliveryPerformance(params),
        getVehicleAnalytics(params),
        getRouteAnalytics(params),
        getAlertAnalytics(params)
      ]);

      if (
        overviewRes.data?.success &&
        shipmentsRes.data?.success &&
        deliveryRes.data?.success &&
        vehiclesRes.data?.success &&
        routesRes.data?.success &&
        alertsRes.data?.success
      ) {
        setOverview(overviewRes.data.data);
        setShipments(shipmentsRes.data.data);
        setDelivery(deliveryRes.data.data);
        setVehicles(vehiclesRes.data.data);
        setRoutes(routesRes.data.data);
        setAlerts(alertsRes.data.data);
      } else {
        setError('Analytical registry returned incomplete response data.');
      }
    } catch (err) {
      console.error('Failed to load operational intelligence data:', err);
      setError(err.response?.data?.message || 'Failed to sync with Analytics API service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalyticsDataset();
    }
  }, [startDate, endDate]);

  const handleCustomRangeSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please provide both start and end dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }
    fetchAnalyticsDataset();
  };

  const tooltipStyle = {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    color: '#F1F5F9',
    borderRadius: '8px',
    fontSize: '10px'
  };

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      <PageHeader
        title={t('analyticsOperationalIntelligence', 'Analytics & Operational Intelligence')}
        description={t('analyticsDescription', 'Verify metrics performance, logistics pipelines bottlenecks, and vehicle utilization ratios.')}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAnalyticsDataset} 
              disabled={loading}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {t('refresh', 'Refresh')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-darkCard border border-darkBorder p-4 rounded-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="w-4 h-4 text-customPrimary mr-1" />
          <span className="font-bold uppercase tracking-wider text-[10px] mr-2">{t('queryPeriod', 'Query Period')}:</span>
          {['today', '7days', '30days', '90days', 'custom'].map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                datePreset === preset 
                  ? 'bg-customPrimary text-white' 
                  : 'bg-darkBgSecondary hover:bg-darkBorder/40 text-customMuted hover:text-customText border border-darkBorder'
              }`}
            >
              {preset === 'today' ? t('today', 'Today') :
               preset === '7days' ? t('last7days', 'Last 7 Days') :
               preset === '30days' ? t('last30days', 'Last 30 Days') :
               preset === '90days' ? t('last90days', 'Last 90 Days') :
               t('customRange', 'Custom Range')}
            </button>
          ))}
        </div>

        {customRangeActive && (
          <form onSubmit={handleCustomRangeSubmit} className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="block text-[9px] text-customMuted font-bold uppercase mb-1">{t('startDate', 'Start Date')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded text-[10px]"
              />
            </div>
            <div>
              <label className="block text-[9px] text-customMuted font-bold uppercase mb-1">{t('endDate', 'End Date')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded text-[10px]"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="font-bold py-1.5">
              {t('query', 'Query')}
            </Button>
          </form>
        )}
      </div>

      {error && (
        <div className="p-4 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-[500px] flex items-center justify-center">
          <LoadingSpinner size="md" text={t('compilingAnalytics', 'Compiling analytical operational intelligence...')} />
        </div>
      ) : (
        <>
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <StatCard
                title={t('totalShipments', 'Total Shipments')}
                value={overview.shipments?.total || 0}
                status="info"
                subtitle={t('consignmentsTally', 'Consignments tally')}
              />
              <StatCard
                title={t('activeTransit', 'Active Transit')}
                value={overview.shipments?.active || 0}
                status="warning"
                subtitle={t('enRoutePackages', 'En route packages')}
              />
              <StatCard
                title={t('deliveredShipments', 'Delivered')}
                value={overview.shipments?.delivered || 0}
                status="success"
                subtitle={t('arrivalClearances', 'Arrival clearances')}
              />
              <StatCard
                title={t('onTimeRate', 'On-Time Rate')}
                value={delivery?.onTimeRate !== null ? `${delivery.onTimeRate}%` : 'N/A'}
                status={delivery?.onTimeRate >= 85 ? 'success' : 'warning'}
                subtitle={t('efficiencyIndex', 'Efficiency index')}
              />
              <StatCard
                title={t('vehicleUtil', 'Vehicle Util.')}
                value={`${vehicles?.utilizationRate || 0}%`}
                status="info"
                subtitle={t('fleetAssignments', 'Fleet assignments')}
              />
              <StatCard
                title={t('activeAlerts', 'Active Alerts')}
                value={overview.alerts?.active || 0}
                status={overview.alerts?.active > 0 ? 'danger' : 'success'}
                subtitle={t('reportedWarnings', 'Reported warnings')}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Shipment Status */}
            <Card className="lg:col-span-4 flex flex-col h-[340px]">
              <CardHeader className="pb-2 border-b border-darkBorder select-none">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-customPrimary" />
                  {t('shipmentStatusTally', 'Shipment Status Tally')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 relative flex items-center justify-center">
                {shipments?.statusCounts?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shipments.statusCounts}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }) => `${translateStatus(name)} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {shipments.statusCounts.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={[COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger][idx % 5]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-customMuted italic text-center">{t('noShipmentRecords', 'No shipment records captured.')}</div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Completion Trends */}
            <Card className="lg:col-span-8 flex flex-col h-[340px]">
              <CardHeader className="pb-2 border-b border-darkBorder select-none">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-customSuccess" />
                  {t('deliveryCompletionTrend', 'Delivery Completion Trend')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                {delivery?.trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={delivery.trend}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.darkBorder} />
                      <XAxis dataKey="_id" stroke={COLORS.muted} tick={{ fontSize: 9 }} />
                      <YAxis stroke={COLORS.muted} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        name={t('completedShipments', 'Completed Deliveries')}
                        stroke={COLORS.success} 
                        fillOpacity={1} 
                        fill="url(#colorCompleted)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-customMuted italic">
                    {t('noCompletedDeliveryData', 'No completed delivery data logs for this period.')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Utilization Details */}
            <Card className="lg:col-span-6 flex flex-col h-[340px]">
              <CardHeader className="pb-2 border-b border-darkBorder select-none">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-customSecondary" />
                  {t('vehicleStatusDistributions', 'Vehicle Status Distributions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 relative flex items-center justify-center">
                {vehicles?.statusCounts?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehicles.statusCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.darkBorder} />
                      <XAxis dataKey="_id" stroke={COLORS.muted} tick={{ fontSize: 9 }} tickFormatter={(val) => translateStatus(val)} />
                      <YAxis stroke={COLORS.muted} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name={t('vehicles', 'Vehicles')} fill={COLORS.secondary} radius={[4, 4, 0, 0]}>
                        {vehicles.statusCounts.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={entry._id === 'AVAILABLE' ? COLORS.success : entry._id === 'MAINTENANCE' ? COLORS.danger : COLORS.secondary} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-customMuted italic text-center">{t('noVehicleDataProfiles', 'No vehicle data profiles.')}</div>
                )}
              </CardContent>
            </Card>

            {/* Risk / Hazard Alerts */}
            <Card className="lg:col-span-6 flex flex-col h-[340px]">
              <CardHeader className="pb-2 border-b border-darkBorder select-none">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-customWarning" />
                  {t('hazardsDisruptionSeverities', 'Hazards & Disruption Severities')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 relative flex items-center justify-center">
                {alerts?.severityCounts?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={alerts.severityCounts}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }) => `${translateSeverity(name)} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {alerts.severityCounts.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={
                              entry._id === 'CRITICAL' ? COLORS.danger :
                              entry._id === 'HIGH' ? '#F97316' :
                              entry._id === 'MEDIUM' ? COLORS.warning : COLORS.primary
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-customMuted italic text-center">{t('noHazardsAlerts', 'No hazards alerts logged.')}</div>
                )}
              </CardContent>
            </Card>

            {/* Route Intelligence Averages */}
            <Card className="lg:col-span-12 flex flex-col min-h-[220px]">
              <CardHeader className="pb-2 border-b border-darkBorder select-none">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-purple-400" />
                  {t('routeIntelligenceSummaries', 'Route Intelligence Summaries')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 space-y-4">
                {routes ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-darkBgSecondary/45 border border-darkBorder p-3 rounded-lg flex flex-col justify-center">
                        <span className="text-customMuted font-bold uppercase text-[9px] mb-0.5">{t('averageTransitDistance', 'Average Transit Distance')}</span>
                        <span className="text-sm font-black text-customText">{routes.averageDistanceKm} KM</span>
                      </div>
                      <div className="bg-darkBgSecondary/45 border border-darkBorder p-3 rounded-lg flex flex-col justify-center">
                        <span className="text-customMuted font-bold uppercase text-[9px] mb-0.5">{t('averageEstimatedTime', 'Average Estimated Time')}</span>
                        <span className="text-sm font-black text-customText">{routes.averageDurationMinutes} {t('minutes', 'Minutes')}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-darkBgSecondary/30 border border-darkBorder/40 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-[10px] text-customText uppercase">{t('routeCorridorWarnings', 'Route Corridor Warnings')}</span>
                      <Badge variant="warning">{routes.hazardsCount} {t('activeAlerts', 'Active Alerts')}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-customMuted italic">{t('noRouteStats', 'No route statistics logged.')}</div>
                )}
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
