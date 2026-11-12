import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, AlertOctagon, Info, ShieldAlert,
  User, Truck, Navigation, FileText, Calendar, Clock,
  MapPin, CheckCircle, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getAlertById, 
  updateAlertStatus, 
  updateAlertSeverity, 
  assignAlert, 
  deleteAlert 
} from '../../services/alertService';
import api from '../../services/api';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import Select from '../ui/Select';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const AlertDetailsPanel = ({
  alertId,
  isOpen,
  onClose,
  onAlertUpdated,
  onAlertDeleted
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity, translateAlertType, translateText, translateAlertTitle, translateAlertDescription } = useLanguage();

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveInput, setShowResolveInput] = useState(false);

  const isOperatorOrAdmin = user && user.role === 'ADMIN';
  const isAdmin = user && user.role === 'ADMIN';

  const fetchAlertDetails = async () => {
    if (!alertId) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setShowResolveInput(false);
    setResolutionNotes('');
    try {
      const res = await getAlertById(alertId);
      if (res.data && res.data.success) {
        const fetchedAlert = res.data.data;
        setAlert(fetchedAlert);
        setSelectedSeverity(fetchedAlert.severity);
        const resolvedId = fetchedAlert.assignedTo?._id || fetchedAlert.assignedTo || fetchedAlert.relatedShipment?.assignedDriver?._id || fetchedAlert.relatedVehicle?.assignedDriver?._id || '';
        setSelectedAssignee(resolvedId);
      }
    } catch (err) {
      console.error('Failed to load alert details:', err);
      setError(err.response?.data?.message || 'Failed to fetch alert details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.data?.success) {
        setAvailableUsers(res.data.data);
      }
    } catch {
      setAvailableUsers([]);
    }
  };

  useEffect(() => {
    if (isOpen && alertId) {
      fetchAlertDetails();
      if (isOperatorOrAdmin) {
        fetchAssignableUsers();
      }
    } else {
      setAlert(null);
    }
  }, [isOpen, alertId]);

  const handleAcknowledge = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await updateAlertStatus(alert._id, 'ACKNOWLEDGED');
      if (res.data && res.data.success) {
        setAlert(res.data.data);
        setSuccessMsg('Alert acknowledged successfully!');
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to acknowledge alert.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Please provide resolution notes.');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await updateAlertStatus(alert._id, 'RESOLVED', resolutionNotes);
      if (res.data && res.data.success) {
        setAlert(res.data.data);
        setSuccessMsg('Alert resolved successfully!');
        setShowResolveInput(false);
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve alert.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await updateAlertStatus(alert._id, 'DISMISSED');
      if (res.data && res.data.success) {
        setAlert(res.data.data);
        setSuccessMsg('Alert dismissed successfully!');
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dismiss alert.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeverityChange = async (e) => {
    const newSeverity = e.target.value;
    setSelectedSeverity(newSeverity);
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await updateAlertSeverity(alert._id, newSeverity);
      if (res.data && res.data.success) {
        setAlert(res.data.data);
        setSuccessMsg('Severity updated successfully!');
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update severity.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignChange = async (e) => {
    const assigneeId = e.target.value;
    setSelectedAssignee(assigneeId);
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await assignAlert(alert._id, assigneeId);
      if (res.data && res.data.success) {
        setAlert(res.data.data);
        setSuccessMsg('Alert assigned successfully!');
        if (onAlertUpdated) onAlertUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign alert.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this alert?')) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await deleteAlert(alert._id);
      if (res.data && res.data.success) {
        if (onAlertDeleted) onAlertDeleted(alert._id);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete alert.');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertOctagon className="w-5 h-5 text-customDanger animate-pulse" />;
      case 'HIGH':
        return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-5 h-5 text-customWarning" />;
      case 'LOW':
      default:
        return <Info className="w-5 h-5 text-customPrimary" />;
    }
  };

  const getSeverityBadgeVariant = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'warning';
      case 'LOW':
      default: return 'success';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'RESOLVED': return 'success';
      case 'ACKNOWLEDGED': return 'success';
      case 'DISMISSED': return 'muted';
      case 'ACTIVE':
      default: return 'danger';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-darkCard border-l border-darkBorder z-[1050] shadow-2xl flex flex-col transition-all duration-300 transform translate-x-0 text-xs">
      <div className="p-4 border-b border-darkBorder flex items-center justify-between bg-darkBgSecondary/50 select-none">
        <div className="flex items-center gap-2">
          {alert && getSeverityIcon(alert.severity)}
          <div>
            <h3 className="font-bold text-customText uppercase tracking-wider text-xs">
              {t('alertDetailsInspection', 'Alert Details Inspection')}
            </h3>
            <span className="text-[9px] text-customMuted font-bold">
              {alert ? alert.alertId : t('loading', 'Telemetry Processing...')}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-darkBorder/40 rounded transition-colors text-customMuted hover:text-customText cursor-pointer"
          aria-label={t('close', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="md" text={t('loading', 'Reading live telemetry...')} />
          </div>
        ) : error ? (
          <div className="p-4 bg-customDanger/10 border border-customDanger/20 text-customDanger rounded-xl font-bold">
            {error}
          </div>
        ) : alert ? (
          <div className="space-y-6">
            {successMsg && (
              <div className="p-3 bg-customSuccess/10 border border-customSuccess/25 text-customSuccess rounded-lg font-bold">
                {successMsg}
              </div>
            )}

            <div className="space-y-2 border-b border-darkBorder pb-4">
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                  {translateSeverity(alert.severity)}
                </Badge>
                <Badge variant={getStatusBadgeVariant(alert.status)}>
                  {translateStatus(alert.status)}
                </Badge>
                <span className="text-[10px] text-customMuted font-semibold">
                  {translateAlertType(alert.alertType)}
                </span>
              </div>
              <h2 className="text-sm font-black text-customText uppercase leading-snug">
                {translateAlertTitle(alert.title)}
              </h2>
              <p className="text-[11px] text-customMuted leading-relaxed">
                {translateAlertDescription(alert.description)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-darkBgSecondary/30 p-3 rounded-lg border border-darkBorder/40">
              <div>
                <span className="text-customMuted text-[10px] font-bold block mb-0.5">{t('reportedBy', 'Reported By')}</span>
                <span className="font-semibold text-customText flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-customPrimary" />
                  {alert.reportedBy ? alert.reportedBy.name : t('systemTelemetry', 'System Telemetry')}
                </span>
              </div>
              <div>
                <span className="text-customMuted text-[10px] font-bold block mb-0.5">{t('taskAssignee', 'Assigned To')}</span>
                <span className="font-semibold text-customText flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-customSecondary" />
                  {(() => {
                    const resolved = alert.assignedTo || alert.relatedShipment?.assignedDriver || alert.relatedVehicle?.assignedDriver;
                    if (!resolved) return t('unassigned', 'Unassigned');
                    return typeof resolved === 'object' ? (resolved.name || resolved.email || t('assignedDriver', 'Assigned Driver')) : String(resolved);
                  })()}
                </span>
              </div>
              <div>
                <span className="text-customMuted text-[10px] font-bold block mb-0.5">{t('dateLogged', 'Date Logged')}</span>
                <span className="font-semibold text-customText flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-customMuted" />
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
              {alert.acknowledgedAt && (
                <div>
                  <span className="text-customMuted text-[10px] font-bold block mb-0.5">{t('acknowledgedAt', 'Acknowledged At')}</span>
                  <span className="font-semibold text-customText flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-customSuccess" />
                    {new Date(alert.acknowledgedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {alert.resolvedAt && (
                <div className="col-span-2">
                  <span className="text-customMuted text-[10px] font-bold block mb-0.5">{t('resolvedAt', 'Resolved At')}</span>
                  <span className="font-semibold text-customText flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-customSuccess" />
                    {new Date(alert.resolvedAt).toLocaleString()}
                  </span>
                  {alert.resolutionNotes && (
                    <div className="mt-1.5 p-2 bg-darkCard/80 border border-darkBorder rounded text-[10px] text-customMuted italic">
                      {t('resolutionNotes', 'Resolution Notes')}: {alert.resolutionNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {alert.location && (alert.location.latitude || alert.location.address) && (
              <div className="space-y-2">
                <h4 className="font-bold text-customText uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-customDanger" />
                  {t('hazardLocation', 'Hazard Location Coordinate')}
                </h4>
                <div className="p-3 bg-darkBgSecondary/25 border border-darkBorder rounded-lg space-y-1">
                  <span className="font-bold text-customText block">
                    {alert.location.region || 'Unspecified Corridor Region'}
                  </span>
                  {alert.location.address && (
                    <span className="text-customMuted block">{alert.location.address}</span>
                  )}
                  {alert.location.latitude && (
                    <span className="text-[10px] text-customMuted font-mono block">
                      {t('coordinates', 'Coordinates')}: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-bold text-customText uppercase tracking-wider text-[10px]">
                {t('quickNavigationLinks', 'Quick Navigation Links')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {alert.relatedShipment && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/shipments/${alert.relatedShipment._id || alert.relatedShipment}`);
                    }}
                    className="p-2.5 bg-darkBgSecondary hover:bg-darkBorder/40 border border-darkBorder rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Truck className="w-4 h-4 text-customPrimary" />
                    <div>
                      <span className="font-bold text-customText block uppercase tracking-wide">{t('shipmentDetails', 'Shipment Details')}</span>
                      <span className="text-[9px] text-customMuted block">{t('inspectConsignments', 'Inspect consignments')}</span>
                    </div>
                  </button>
                )}
                {alert.relatedVehicle && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/vehicles`);
                    }}
                    className="p-2.5 bg-darkBgSecondary hover:bg-darkBorder/40 border border-darkBorder rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Truck className="w-4 h-4 text-customSecondary" />
                    <div>
                      <span className="font-bold text-customText block uppercase tracking-wide">{t('vehicleDetails', 'Vehicle Details')}</span>
                      <span className="text-[9px] text-customMuted block">{t('telemetryStatus', 'Telemetry & status')}</span>
                    </div>
                  </button>
                )}
                {alert.relatedRoute && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/routes`);
                    }}
                    className="p-2.5 bg-darkBgSecondary hover:bg-darkBorder/40 border border-darkBorder rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <Navigation className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold text-customText block uppercase tracking-wide">{t('routesTransitPlanner', 'Route Corridor')}</span>
                      <span className="text-[9px] text-customMuted block">{t('analyzeBypasses', 'Analyze bypasses')}</span>
                    </div>
                  </button>
                )}
                {alert.relatedOrder && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/orders`);
                    }}
                    className="p-2.5 bg-darkBgSecondary hover:bg-darkBorder/40 border border-darkBorder rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-customText block uppercase tracking-wide">{t('orders', 'Order Details')}</span>
                      <span className="text-[9px] text-customMuted block">{t('inspectOrders', 'Inspect orders')}</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {user && (
              <div className="space-y-4 border-t border-darkBorder pt-5">
                <h4 className="font-bold text-customText uppercase tracking-wider text-[10px]">
                  {t('alertActionsBoard', 'Alert Actions Board')}
                </h4>

                {isOperatorOrAdmin && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {alert.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="xs"
                          className="flex-1 font-bold uppercase text-[9px] py-1.5 border-customWarning/30 text-customWarning hover:bg-customWarning/5"
                          onClick={handleAcknowledge}
                          loading={actionLoading}
                          disabled={actionLoading}
                        >
                          {t('acknowledge', 'Acknowledge')}
                        </Button>
                      )}
                      
                      {['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
                        <>
                          <Button
                            variant="primary"
                            size="xs"
                            className="flex-1 font-bold uppercase text-[9px] py-1.5"
                            onClick={() => setShowResolveInput(true)}
                            disabled={actionLoading}
                          >
                            {t('resolve', 'Resolve Alert')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="flex-1 font-bold uppercase text-[9px] py-1.5 hover:bg-darkBgSecondary text-customMuted"
                            onClick={handleDismiss}
                            loading={actionLoading}
                            disabled={actionLoading}
                          >
                            {t('dismiss', 'Dismiss')}
                          </Button>
                        </>
                      )}
                    </div>

                    {showResolveInput && (
                      <form onSubmit={handleResolveSubmit} className="space-y-3 p-3 bg-darkBgSecondary/45 border border-darkBorder rounded-lg">
                        <span className="font-bold text-[10px] text-customText uppercase block">{t('resolveVerification', 'Resolve Action Verification')}</span>
                        <textarea
                          placeholder={t('resolvePlaceholder', 'Provide details on resolution actions, road clearance, or bypass instructions...')}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="w-full bg-darkCard border border-darkBorder text-customText p-2 rounded focus:outline-none focus:border-customPrimary text-[11px] leading-relaxed resize-none h-20"
                          disabled={actionLoading}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setShowResolveInput(false)}
                            disabled={actionLoading}
                          >
                            {t('cancel', 'Cancel')}
                          </Button>
                          <Button
                            variant="primary"
                            size="xs"
                            type="submit"
                            loading={actionLoading}
                            disabled={actionLoading}
                          >
                            {t('submit', 'Submit Clearance')}
                          </Button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label={t('changeSeverity', 'Change Severity')}
                        value={selectedSeverity}
                        onChange={handleSeverityChange}
                        disabled={actionLoading}
                        options={[
                          { label: translateSeverity('LOW'), value: 'LOW' },
                          { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
                          { label: translateSeverity('HIGH'), value: 'HIGH' },
                          { label: translateSeverity('CRITICAL'), value: 'CRITICAL' },
                        ]}
                      />

                      <Select
                        label={t('taskAssignee', 'Assign Task')}
                        value={selectedAssignee}
                        onChange={handleAssignChange}
                        disabled={actionLoading}
                        options={[
                          { label: t('unassigned', 'Unassigned'), value: '' },
                          ...availableUsers.map(u => ({
                            label: u.name,
                            value: u._id
                          }))
                        ]}
                      />
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full font-bold uppercase tracking-wider text-[10px] py-2 border-customDanger/30 text-customDanger hover:bg-customDanger/5 flex items-center justify-center gap-1.5"
                    onClick={handleDelete}
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete', 'Delete Record')}</span>
                  </Button>
                )}
              </div>
            )}

            {alert.history && alert.history.length > 0 && (
              <div className="space-y-3 border-t border-darkBorder pt-5 select-none">
                <h4 className="font-bold text-customText uppercase tracking-wider text-[10px] block mb-2">
                  {t('lifecycleAuditTimeline', 'Lifecycle Audit Timeline')}
                </h4>
                <div className="relative pl-4 border-l border-darkBorder space-y-4 text-[10px]">
                  {alert.history.map((log) => (
                    <div key={log._id} className="relative space-y-1">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-darkCard border-2 border-customPrimary" />
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-customText uppercase">
                          {translateStatus(log.action) || log.action}
                        </span>
                        <span className="text-[8px] text-customMuted font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-customMuted flex items-center gap-1">
                        <User className="w-3 h-3 text-customMuted" />
                        {t('performedBy', 'Performed by')}: <span className="font-semibold text-customText">{log.performedBy ? log.performedBy.name : t('systemTelemetry', 'System Trigger')}</span>
                      </div>
                      {log.notes && (
                        <p className="text-[10px] text-customMuted leading-tight italic bg-darkBgSecondary/15 p-1 rounded border border-darkBorder/20 mt-1">
                          {t('notes', 'Notes')}: {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-customMuted italic py-10">
            Telemetry record not found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertDetailsPanel;
