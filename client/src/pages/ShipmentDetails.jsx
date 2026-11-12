import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, AlertTriangle, Truck, RefreshCw, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getShipmentById, updateShipmentStatus, deleteShipment } from '../services/shipmentService';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusUpdateModal from '../components/layout/StatusUpdateModal';
import AssignDriverModal from '../components/layout/AssignDriverModal';
import CombinedRiskCard from '../components/layout/CombinedRiskCard';
import { getShipmentRecommendation } from '../services/recommendationService';
import { getShipmentAlerts } from '../services/alertService';
import AlertCenter from '../components/layout/AlertCenter';
import AccessibilityPanel from '../components/layout/AccessibilityPanel';
import ConnectivityPanel from '../components/layout/ConnectivityPanel';
import ShipmentRouteIntelligence from '../components/layout/ShipmentRouteIntelligence';
import ShipmentLiveTrackingModal from '../components/layout/ShipmentLiveTrackingModal';
import DriverShipmentView from '../components/driver/DriverShipmentView';
import NgoShipmentView from '../components/ngo/NgoShipmentView';
import { getRouteRisk } from '../services/environmentService';


const ShipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [envRiskData, setEnvRiskData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState(false);



  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [isLiveTrackingOpen, setIsLiveTrackingOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isAdmin = user && user.role === 'ADMIN';
  const isDriver = user && user.role === 'DRIVER';
  const isAssignedDriver = isDriver && shipment?.assignedDriver && (shipment.assignedDriver._id === user._id || shipment.assignedDriver === user._id);
  const canUpdateStatus = isAdmin || isAssignedDriver;

  const fetchShipmentDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getShipmentById(id);
      if (res.data && res.data.success) {
        setShipment(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load shipment details:', err);
      if (!err.response) {
        setError('Unable to load shipment data. Check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch shipment details from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipment && shipment.selectedRouteId) {
      const fetchEnvRisk = async () => {
        try {
          const res = await getRouteRisk(shipment._id, shipment.selectedRouteId);
          if (res.data && res.data.success) {
            setEnvRiskData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load shipment selected route risk details:', err);
        }
      };
      fetchEnvRisk();
    } else {
      setEnvRiskData(null);
    }
  }, [shipment]);

  useEffect(() => {
    if (shipment) {
      const fetchRecommendation = async () => {
        try {
          const res = await getShipmentRecommendation(shipment._id);
          if (res.data && res.data.success) {
            setRecommendation(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load shipment route recommendation summary:', err);
        }
      };
      fetchRecommendation();
    } else {
      setRecommendation(null);
    }
  }, [shipment]);

  useEffect(() => {
    if (shipment) {
      const fetchAlerts = async () => {
        setLoadingAlerts(true);
        setAlertsError(false);
        try {
          const res = await getShipmentAlerts(shipment._id);
          if (res.data && res.data.success) {
            setAlertsData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load shipment risk alerts:', err);
          setAlertsError(true);
        } finally {
          setLoadingAlerts(false);
        }
      };
      fetchAlerts();
    } else {
      setAlertsData(null);
    }
  }, [shipment]);

  useEffect(() => {
    fetchShipmentDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdateLoading(true);
    setSuccessMsg('');
    try {
      const res = await updateShipmentStatus(shipment._id, newStatus);
      if (res.data && res.data.success) {
        setShipment(res.data.data);
        setIsStatusOpen(false);
        setSuccessMsg('Shipment status updated successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteShipment = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete shipment ${shipment.shipmentId}? This action is irreversible.`);
    if (!confirmed) return;

    setUpdateLoading(true);
    setSuccessMsg('');
    try {
      const res = await deleteShipment(shipment._id);
      if (res.data && res.data.success) {
        setSuccessMsg(`Shipment ${shipment.shipmentId} deleted successfully.`);
        setTimeout(() => navigate('/shipments'), 1500);
      }
    } catch (err) {
      console.error('Failed to delete shipment:', err);
      alert(err.response?.data?.message || 'Failed to delete shipment. Check connection and try again.');
    } finally {
      setUpdateLoading(false);
    }
  };


  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">Critical</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ROUTE_PENDING':
        return <Badge variant="neutral" className="border-slate-500/40 text-slate-400 bg-slate-500/10">Route Pending</Badge>;
      case 'ROUTE_SELECTED':
        return <Badge variant="primary" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10">Route Selected</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info" className="border-blue-500/40 text-blue-400 bg-blue-500/10">In Transit</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10">At Risk</Badge>;
      case 'DELAYED':
        return <Badge variant="danger" className="border-red-500/40 text-red-400 bg-red-500/10">Delayed</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" className="border-gray-500/40 text-gray-500 bg-gray-500/10">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Retrieving shipment details..." />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <Card className="p-8 border border-customDanger/30 bg-customDanger/5 text-center space-y-4 my-6">
        <AlertTriangle className="w-10 h-10 text-customDanger mx-auto" />
        <h3 className="font-bold text-customText text-base">Shipment Not Found</h3>
        <p className="text-xs text-customMuted max-w-sm mx-auto">
          {error || 'The requested shipment ID does not exist or you do not have permission to view it.'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/shipments')}>
            Return to Registry
          </Button>
          <Button variant="primary" size="sm" onClick={fetchShipmentDetails}>
            <RefreshCw className="w-4.5 h-4.5 mr-1" />
            <span>Retry</span>
          </Button>
        </div>
      </Card>
    );
  }

  if (user && user.role === 'DRIVER') {
    return (
      <DriverShipmentView
        shipment={shipment}
        onStatusUpdate={handleStatusUpdate}
        onRefresh={fetchShipmentDetails}
      />
    );
  }

  if (user && user.role === 'NGO') {
    return (
      <NgoShipmentView
        shipment={shipment}
        onRefresh={fetchShipmentDetails}
      />
    );
  }

  return (
    <div className="space-y-6">
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
            <h1 className="text-xl font-bold tracking-tight text-customText">
              Shipment: {shipment.shipmentId}
            </h1>
            <p className="text-xs text-customMuted mt-0.5">Registry reference parameters</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLiveTrackingOpen(true)}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Live Location
          </Button>
          {getPriorityBadge(shipment.priority)}
          {getStatusBadge(shipment.status)}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg text-xs font-semibold">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Cargo Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-darkBgSecondary border border-darkBorder p-3 rounded-lg">
                  <span className="text-customMuted block mb-1">Goods Category</span>
                  <span className="font-semibold text-customText text-sm block">
                    {shipment.goodsType?.replace('_', ' ')}
                  </span>
                </div>
                <div className="bg-darkBgSecondary border border-darkBorder p-3 rounded-lg">
                  <span className="text-customMuted block mb-1">Quantity / Load</span>
                  <span className="font-semibold text-customText text-sm block">
                    {shipment.quantity} {shipment.unit}
                  </span>
                </div>
                <div className="bg-darkBgSecondary border border-darkBorder p-3 rounded-lg">
                  <span className="text-customMuted block mb-1">Priority Rank</span>
                  <span className="font-semibold text-customText text-sm block">
                    {shipment.priority}
                  </span>
                </div>
              </div>

              {shipment.notes && (
                <div className="bg-darkBgSecondary/50 border border-darkBorder/60 rounded-lg p-3.5 text-xs">
                  <span className="text-customMuted font-semibold block mb-1.5">Additional Dispatch Notes</span>
                  <p className="text-customText leading-relaxed whitespace-pre-wrap">{shipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>



          <ShipmentRouteIntelligence shipment={shipment} onRouteSelected={setShipment} />

              {shipment && (
                <div className="mt-4">
                  {loadingAlerts ? (
                    <div className="p-3.5 bg-darkBgSecondary/30 border border-darkBorder rounded-lg flex items-center justify-center">
                      <LoadingSpinner size="sm" text="Analyzing route risks..." />
                    </div>
                  ) : alertsError ? (
                    <div className="p-3.5 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-lg text-xs font-semibold">
                      Risk alerts are currently unavailable.
                    </div>
                  ) : alertsData ? (
                    <div className="bg-darkBgSecondary/65 border border-darkBorder rounded-lg p-3.5 space-y-3 text-xs">
                      <span className="font-bold text-customText block border-b border-darkBorder/40 pb-1.5 uppercase text-[9px] tracking-wider">
                        🚨 Safety & Accessibility Intelligence
                      </span>
                      <div className="grid grid-cols-3 gap-3 text-[11px] text-center">
                        <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-1.5 flex flex-col justify-center">
                          <span className="text-customMuted block text-[8px] uppercase font-semibold">Highest Severity</span>
                          <span className={`font-black uppercase text-[9px] truncate ${
                            alertsData.alertSummary?.critical > 0 ? 'text-customDanger' :
                            alertsData.alertSummary?.high > 0 ? 'text-orange-400' :
                            alertsData.alertSummary?.warning > 0 ? 'text-customWarning' : 'text-customSuccess'
                          }`}>
                            {alertsData.alertSummary?.critical > 0 ? 'CRITICAL' :
                             alertsData.alertSummary?.high > 0 ? 'HIGH' :
                             alertsData.alertSummary?.warning > 0 ? 'WARNING' : 'INFO/NONE'}
                          </span>
                        </div>
                        <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-1.5 flex flex-col justify-center">
                          <span className="text-customMuted block text-[8px] uppercase font-semibold">Accessibility</span>
                          <span className="font-bold text-customText text-[9px] truncate">
                            {alertsData.accessibility?.accessibilityLevel} ({alertsData.accessibility?.accessibilityScore})
                          </span>
                        </div>
                        <div className="bg-darkBgSecondary/45 border border-darkBorder/40 rounded p-1.5 flex flex-col justify-center">
                          <span className="text-customMuted block text-[8px] uppercase font-semibold">Logistics Conn.</span>
                          <span className="font-bold text-customText uppercase text-[9px] truncate">
                            {alertsData.connectivity?.connectivityLevel}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedAlerts(!expandedAlerts)}
                          className="font-bold uppercase tracking-wider text-[10px] w-full sm:w-auto justify-center flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{expandedAlerts ? 'Hide Risk Details' : 'View All Alerts'}</span>
                        </Button>
                      </div>

                      {expandedAlerts && (
                        <div className="mt-4 pt-4 border-t border-darkBorder/40 space-y-4 animate-fadeIn">
                          <AlertCenter alertsData={alertsData} />
                          <div className="grid grid-cols-1 gap-4">
                            <AccessibilityPanel accessibilityData={alertsData.accessibility} />
                            <ConnectivityPanel connectivityData={alertsData.connectivity} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Transport Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-darkBorder/40">
                <span className="text-customMuted flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-customPrimary" />
                  Vehicle Registration
                </span>
                <span className="font-semibold text-customText uppercase">
                  {shipment.assignedVehicle?.registrationNumber || shipment.vehicleNumber || 'Not specified'}
                </span>
              </div>
              <div className="space-y-1 py-1 flex justify-between items-start">
                <span className="text-customMuted flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-customPrimary" />
                  Assigned Driver
                </span>
                <div className="text-right">
                  {shipment.assignedDriver ? (
                    <>
                      <span className="font-bold text-customText block">{shipment.assignedDriver.name}</span>
                      <span className="text-[10px] text-customMuted block">{shipment.assignedDriver.email}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-customMuted italic">No Driver Assigned</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2.5 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Registry Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <span className="text-customMuted block">Requested By</span>
                <span className="font-semibold text-customText mt-0.5 block">{shipment.requestedBy?.name || 'Unknown User'}</span>
                <span className="text-[10px] text-customMuted block">{shipment.requestedBy?.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-darkBorder/40 pt-3.5">
                <div>
                  <span className="text-customMuted block">Created Date</span>
                  <span className="font-semibold text-customText mt-0.5 block">
                    {new Date(shipment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-customMuted block">Last Updated</span>
                  <span className="font-semibold text-customText mt-0.5 block">
                    {new Date(shipment.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(canUpdateStatus || isAdmin) && (
            <Card className="border border-customPrimary/20 bg-darkBgSecondary/20 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-customPrimary mb-1">
                Logistics Operations
              </h3>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold uppercase tracking-wider justify-center border-darkBorder"
                  onClick={() => setIsAssignDriverOpen(true)}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {shipment.assignedDriver ? 'Change Driver' : 'Assign Driver'}
                </Button>
              )}
              {canUpdateStatus && (
                <Button
                  variant="primary"
                  className="w-full text-xs font-bold uppercase tracking-wider justify-center"
                  onClick={() => setIsStatusOpen(true)}
                >
                  Update Status
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold uppercase tracking-wider justify-center hover:bg-customDanger/10 hover:border-customDanger/30 hover:text-customDanger border-darkBorder"
                  onClick={handleDeleteShipment}
                  disabled={updateLoading}
                >
                  Delete Shipment
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {canUpdateStatus && (
        <StatusUpdateModal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          currentStatus={shipment.status}
          onUpdate={handleStatusUpdate}
          loading={updateLoading}
        />
      )}

      {isAdmin && (
        <AssignDriverModal
          isOpen={isAssignDriverOpen}
          onClose={() => setIsAssignDriverOpen(false)}
          shipmentId={shipment._id}
          currentDriverId={shipment.assignedDriver?._id || shipment.assignedDriver || ''}
          onDriverAssigned={(updatedShipment) => {
            setShipment(updatedShipment);
            setSuccessMsg('Driver assigned to shipment successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
          }}
        />
      )}

      <ShipmentLiveTrackingModal
        shipment={shipment}
        isOpen={isLiveTrackingOpen}
        onClose={() => setIsLiveTrackingOpen(false)}
      />
    </div>
  );
};

export default ShipmentDetails;
