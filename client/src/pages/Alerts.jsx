import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, AlertOctagon, Info, ShieldAlert, 
  Search, SlidersHorizontal, RefreshCw, X, Eye
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import { getAlerts, getAlertStats } from '../services/alertService';
import AlertDetailsPanel from '../components/layout/AlertDetailsPanel';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';

const Alerts = () => {
  const { user } = useAuth();
  const { t, isHindi, translateSeverity, translateAlertType, translateStatus, translateText, translateAlertTitle, translateAlertDescription } = useLanguage();
  const [searchParams] = useSearchParams();
  const { on: onSocketEvent } = useSocket();

  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [stats, setStats] = useState({
    active: 0,
    critical: 0,
    high: 0,
    acknowledged: 0,
    resolved: 0
  });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [alertType, setAlertType] = useState('');
  const [relatedModule, setRelatedModule] = useState('');
  const [relatedId, setRelatedId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const shipmentQuery = searchParams.get('shipment');
    const vehicleQuery = searchParams.get('vehicle');
    const routeQuery = searchParams.get('route');
    const alertQuery = searchParams.get('alert');

    if (alertQuery) {
      setSelectedAlertId(alertQuery);
      setIsDetailsOpen(true);
    } else if (shipmentQuery) {
      setRelatedModule('shipment');
      setRelatedId(shipmentQuery);
    } else if (vehicleQuery) {
      setRelatedModule('vehicle');
      setRelatedId(vehicleQuery);
    } else if (routeQuery) {
      setRelatedModule('route');
      setRelatedId(routeQuery);
    }
  }, [searchParams]);

  const fetchTelemetryStats = async () => {
    try {
      const res = await getAlertStats();
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load telemetry stats:', err);
    }
  };

  const fetchAlertsGrid = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status || undefined,
        severity: severity || undefined,
        alertType: alertType || undefined
      };

      if (relatedModule && relatedId.trim()) {
        params[relatedModule] = relatedId.trim();
      }

      const res = await getAlerts(params);
      if (res.data?.success) {
        setAlerts(res.data.data.alerts || []);
        setTotalPages(res.data.data.pagination.totalPages || 1);
        setTotalItems(res.data.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to query alerts pipeline:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryStats();
  }, []);

  useEffect(() => {
    fetchAlertsGrid();
  }, [page, status, severity, alertType, relatedModule, relatedId]);

  // Real-time Socket.IO alert updates
  useEffect(() => {
    if (!onSocketEvent) return;

    const unSubNew = onSocketEvent('alert:new', () => {
      fetchTelemetryStats();
      fetchAlertsGrid();
    });

    const unSubCreated = onSocketEvent('alert:created', () => {
      fetchTelemetryStats();
      fetchAlertsGrid();
    });

    return () => {
      if (unSubNew) unSubNew();
      if (unSubCreated) unSubCreated();
    };
  }, [onSocketEvent, page, status, severity, alertType, relatedModule, relatedId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAlertsGrid();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setSeverity('');
    setAlertType('');
    setRelatedModule('');
    setRelatedId('');
    setPage(1);
  };

  const handleOpenDetails = (id) => {
    setSelectedAlertId(id);
    setIsDetailsOpen(true);
  };

  const handleAlertUpdated = () => {
    fetchTelemetryStats();
    fetchAlertsGrid();
  };

  const handleAlertDeleted = () => {
    fetchTelemetryStats();
    fetchAlertsGrid();
  };

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4 text-customDanger animate-pulse" aria-label="Critical Alert Icon" />;
      case 'HIGH':
        return <ShieldAlert className="w-4 h-4 text-orange-400" aria-label="High Alert Icon" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-customWarning" aria-label="Warning Alert Icon" />;
      case 'LOW':
      default:
        return <Info className="w-4 h-4 text-customPrimary" aria-label="Info Alert Icon" />;
    }
  };

  const getSeverityLeftBorder = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'border-l-customDanger bg-customDanger/5 border-customDanger/20';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-500/5 border-orange-500/20';
      case 'MEDIUM':
        return 'border-l-customWarning bg-customWarning/5 border-customWarning/20';
      case 'LOW':
      default:
        return 'border-l-customPrimary bg-customPrimary/5 border-customPrimary/20';
    }
  };

  const getSeverityBadgeVariant = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW':
      default: return 'muted';
    }
  };

  const getStatusBadgeVariant = (statusVal) => {
    switch (statusVal) {
      case 'RESOLVED': return 'success';
      case 'ACKNOWLEDGED': return 'success';
      case 'DISMISSED': return 'muted';
      case 'ACTIVE':
      default: return 'danger';
    }
  };

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      <PageHeader
        title={t('activeHazards', 'Active Hazards & Risk Alerts')}
        description={t('activeHazardsSub', 'Dynamic regional safety warnings, landslide alerts, and weather advisories.')}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchTelemetryStats();
                fetchAlertsGrid();
              }} 
              className="font-bold uppercase tracking-wider text-[10px] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {t('syncGrid', 'Sync Grid')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title={t('activeAlerts', 'Active Alerts')}
          value={stats.active}
          status="danger"
          subtitle={t('awaitingResponse', 'Awaiting response')}
        />
        <StatCard
          title={t('criticalThreats', 'Critical Threats')}
          value={stats.critical}
          status="danger"
          subtitle={t('haltedCorridorSections', 'Halted corridor sections')}
        />
        <StatCard
          title={t('highSeverity', 'High Severity')}
          value={stats.high}
          status="warning"
          subtitle={t('precipitationWarnings', 'Precipitation warnings')}
        />
        <StatCard
          title={t('acknowledged', 'Acknowledged')}
          value={stats.acknowledged}
          status="info"
          subtitle={t('operatorsAssigned', 'Operators assigned')}
        />
        <StatCard
          title={t('resolved', 'Resolved')}
          value={stats.resolved}
          status="success"
          subtitle={t('clearedHazardsLogged', 'Cleared hazards logged')}
        />
      </div>

      <Card className="bg-darkCard border border-darkBorder">
        <CardHeader className="pb-2 border-b border-darkBorder flex items-center gap-2 select-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-customPrimary" />
          <span className="text-xs font-bold uppercase tracking-wider">{t('searchFilteringDashboard', 'Search & Filtering Dashboard')}</span>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <Input
                label={t('searchTelemetryDetails', 'Search Telemetry Details')}
                placeholder={t('searchAlertsPlaceholder', 'Search by ID, title, description, address, region...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label={t('alertStatus', 'Alert Status')}
                placeholder={t('selectAnOption', 'Select an option')}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: t('allStatuses', 'All Statuses'), value: '' },
                  { label: translateStatus('ACTIVE'), value: 'ACTIVE' },
                  { label: translateStatus('ACKNOWLEDGED'), value: 'ACKNOWLEDGED' },
                  { label: translateStatus('RESOLVED'), value: 'RESOLVED' },
                  { label: translateStatus('DISMISSED'), value: 'DISMISSED' }
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label={t('severity', 'Severity')}
                placeholder={t('selectAnOption', 'Select an option')}
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: t('allSeverities', 'All Severities'), value: '' },
                  { label: translateSeverity('LOW'), value: 'LOW' },
                  { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
                  { label: translateSeverity('HIGH'), value: 'HIGH' },
                  { label: translateSeverity('CRITICAL'), value: 'CRITICAL' }
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label={t('alertType', 'Alert Type')}
                placeholder={t('selectAnOption', 'Select an option')}
                value={alertType}
                onChange={(e) => {
                  setAlertType(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: t('allTypes', 'All Types'), value: '' },
                  { label: translateAlertType('TRANSIT_DELAY'), value: 'TRANSIT_DELAY' },
                  { label: translateAlertType('CORRIDOR_HAZARD'), value: 'CORRIDOR_HAZARD' },
                  { label: translateAlertType('WEATHER_WARNING'), value: 'WEATHER_WARNING' },
                  { label: translateAlertType('VEHICLE_ISSUE'), value: 'VEHICLE_ISSUE' },
                  { label: translateAlertType('SHIPMENT_RISK'), value: 'SHIPMENT_RISK' },
                  { label: translateAlertType('SYSTEM_ALERT'), value: 'SYSTEM_ALERT' }
                ]}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" className="flex-1 font-bold uppercase text-[9px] py-2">
                {t('query', 'Query')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleResetFilters} 
                className="font-bold uppercase text-[9px] py-2 text-customMuted hover:text-customText"
                title={t('resetFilters', 'Reset Filters')}
              >
                {t('reset', 'Reset')}
              </Button>
            </div>
          </form>

          <div className="pt-3 border-t border-darkBorder/40 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider">{t('relatedReferenceModule', 'Related Reference Module')}:</span>
            <div className="flex gap-2 items-center">
              <select
                value={relatedModule}
                onChange={(e) => {
                  setRelatedModule(e.target.value);
                  setPage(1);
                }}
                className="bg-darkCard border border-darkBorder text-customText p-1.5 rounded text-[10px] focus:outline-none focus:border-customPrimary uppercase font-bold"
              >
                <option value="">{t('noFilter', 'No Filter')}</option>
                <option value="shipment">{t('shipmentId', 'Shipment ID')}</option>
                <option value="vehicle">{t('vehicleId', 'Vehicle ID')}</option>
                <option value="route">{t('routeId', 'Route ID')}</option>
              </select>
              {relatedModule && (
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={t('provideMongoIdPlaceholder', 'Provide MongoDB ID...')}
                    value={relatedId}
                    onChange={(e) => {
                      setRelatedId(e.target.value);
                      setPage(1);
                    }}
                    className="bg-darkCard border border-darkBorder text-customText p-1.5 rounded text-[10px] w-48 focus:outline-none focus:border-customPrimary font-mono font-bold"
                  />
                  {relatedId && (
                    <button 
                      onClick={() => setRelatedId('')} 
                      className="absolute right-2 text-customMuted hover:text-customText"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="md" text="Syncing alerts telemetry stream..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-customDanger bg-darkCard border border-darkBorder rounded-xl font-bold">
            Failed to contact Central Hazards Registry. Check server status.
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-customMuted bg-darkCard border border-dashed border-darkBorder rounded-xl font-medium space-y-2">
            <ShieldAlert className="w-8 h-8 text-customMuted mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-customText">
              {user?.role === 'NGO' ? "No Active Alerts" : "No Active Telemetry Alerts"}
            </h3>
            <p className="text-xs text-customMuted">
              {user?.role === 'NGO'
                ? "There are currently no alerts related to your orders."
                : "No active telemetry records match the current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {alerts.map((alert) => (
                <Card 
                  key={alert._id} 
                  className={`relative overflow-hidden border-l-[4px] border ${getSeverityLeftBorder(alert.severity)} hover:border-customPrimary/20 transition-all duration-200`}
                >
                  <div className="p-4 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <span className="font-extrabold text-[9px] text-customText uppercase tracking-wider">
                          {alert.alertId}
                        </span>
                        <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                          {translateSeverity(alert.severity)}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(alert.status)}>
                          {translateStatus(alert.status)}
                        </Badge>
                        <span className="text-[10px] text-customMuted uppercase font-bold">
                          {translateAlertType(alert.alertType)}
                        </span>
                      </div>
                      <span className="text-[9px] text-customMuted uppercase font-mono font-bold">
                        {t('logged', 'Logged')}: {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-customText uppercase tracking-wide">
                        {alert.location?.region || translateAlertTitle(alert.title)}
                      </h4>
                      {alert.location?.region && (
                        <p className="text-[11px] font-semibold text-customText">{translateAlertTitle(alert.title)}</p>
                      )}
                      <p className="text-[11px] text-customMuted leading-relaxed">{translateAlertDescription(alert.description)}</p>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-customMuted">
                      {alert.relatedShipment && (
                        <span>{t('shipmentRef', 'Shipment Ref')}: <strong className="text-customText select-all">{alert.relatedShipment.shipmentId || 'Seeded'}</strong></span>
                      )}
                      {alert.relatedVehicle && (
                        <span>{t('assignedVehicle', 'Vehicle')}: <strong className="text-customText select-all">{alert.relatedVehicle.registrationNumber || 'Seeded'}</strong></span>
                      )}
                      {(() => {
                        const resolvedDriver = alert.assignedTo || alert.relatedShipment?.assignedDriver || alert.relatedVehicle?.assignedDriver;
                        if (!resolvedDriver) return null;
                        const name = typeof resolvedDriver === 'object' ? (resolvedDriver.name || resolvedDriver.email) : String(resolvedDriver);
                        return <span>{t('taskAssignee', 'Task Assignee')}: <strong className="text-customSecondary">{name}</strong></span>;
                      })()}
                    </div>

                    <div className="flex gap-2 pt-1.5 border-t border-darkBorder/30">
                      <Button
                        variant="outline"
                        size="xs"
                        className="font-bold uppercase tracking-wider text-[8px] py-1 flex items-center gap-1 cursor-pointer"
                        onClick={() => handleOpenDetails(alert._id)}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{t('inspectHandleAlert', 'Inspect & Handle Alert')}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-darkCard border border-darkBorder p-4 rounded-xl select-none">
                <span className="text-[10px] text-customMuted">
                  {t('showing', 'Showing')} <strong className="text-customText">{alerts.length}</strong> {t('of', 'of')} <strong className="text-customText">{totalItems}</strong> alerts
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                  >
                    {t('previous', 'Previous')}
                  </Button>
                  <span className="px-3 py-1.5 border border-darkBorder rounded text-[10px] font-bold bg-darkBgSecondary flex items-center">
                    {t('page', 'Page')} {page} {t('of', 'of')} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    className="font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                  >
                    {t('next', 'Next')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDetailsPanel
        alertId={selectedAlertId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedAlertId(null);
        }}
        onAlertUpdated={handleAlertUpdated}
        onAlertDeleted={handleAlertDeleted}
      />
    </div>
  );
};

export default Alerts;
