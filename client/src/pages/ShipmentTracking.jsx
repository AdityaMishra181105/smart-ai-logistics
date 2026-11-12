import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Truck, User, Phone, Navigation, Clock, Package, AlertTriangle } from 'lucide-react';
import { getShipmentById } from '../services/shipmentService';
import TrackingMap from '../components/map/TrackingMap';
import TrackingTimeline from '../components/map/TrackingTimeline';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const ShipmentTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shipmentIdFromQuery = searchParams.get('shipmentId');
  
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShipmentDetails = async () => {
      const shipmentId = id || shipmentIdFromQuery;
      
      if (!shipmentId) {
        setError('No shipment ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const res = await getShipmentById(shipmentId);
        if (res.data && res.data.success) {
          setShipment(res.data.data);
        } else {
          setError('Failed to load shipment details');
        }
      } catch (err) {
        console.error('Failed to fetch shipment:', err);
        setError(err.response?.data?.message || 'Unable to load tracking information');
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentDetails();
  }, [id, shipmentIdFromQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info">In Transit</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning">At Risk</Badge>;
      case 'DELAYED':
        return <Badge variant="danger">Delayed</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'ROUTE_SELECTED':
        return <Badge variant="primary">Route Selected</Badge>;
      case 'ROUTE_PENDING':
        return <Badge variant="neutral">Route Pending</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="danger">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">Medium</Badge>;
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading tracking information..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-customDanger mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-customText mb-2">Unable to Load Tracking</h3>
            <p className="text-sm text-customMuted mb-6">{error}</p>
            <Button onClick={() => navigate('/shipments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shipments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 text-customMuted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-customText mb-2">Shipment Not Found</h3>
            <p className="text-sm text-customMuted mb-6">The requested shipment could not be found.</p>
            <Button onClick={() => navigate('/shipments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shipments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg">
      {/* Header */}
      <div className="bg-darkCard border-b border-darkBorder">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/shipments')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-customText">{shipment.shipmentId}</h1>
                <p className="text-sm text-customMuted">Live Tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(shipment.status)}
              {getPriorityBadge(shipment.priority)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Map and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Map */}
            <TrackingMap shipment={shipment} height="500px" />

            {/* Shipment Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-customMuted uppercase tracking-wider mb-2">Goods Information</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-customMuted">Type</span>
                        <p className="text-sm font-semibold text-customText">{shipment.goodsType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-customMuted">Quantity</span>
                        <p className="text-sm font-semibold text-customText">{shipment.quantity} {shipment.unit}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-customMuted uppercase tracking-wider mb-2">Vehicle Information</p>
                    <div className="space-y-2">
                      {shipment.vehicleNumber ? (
                        <div>
                          <span className="text-xs text-customMuted">Vehicle Number</span>
                          <p className="text-sm font-semibold text-customText">{shipment.vehicleNumber}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-customMuted">Not assigned yet</p>
                      )}
                      {shipment.assignedDriver && (
                        <div>
                          <span className="text-xs text-customMuted">Driver Assigned</span>
                          <p className="text-sm font-semibold text-customText">Yes</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                {shipment.selectedRoute && (
                  <div className="mt-6 pt-6 border-t border-darkBorder">
                    <p className="text-xs text-customMuted uppercase tracking-wider mb-3">Route Information</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-customMuted">Route Type</p>
                        <p className="text-sm font-semibold text-customText">{shipment.selectedRoute.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-customMuted">Distance</p>
                        <p className="text-sm font-semibold text-customText">{shipment.selectedRoute.distanceKm?.toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-customMuted">Duration</p>
                        <p className="text-sm font-semibold text-customText">
                          {Math.floor(shipment.selectedRoute.estimatedDurationMinutes / 60)}h {shipment.selectedRoute.estimatedDurationMinutes % 60}m
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-customMuted">Road Condition</p>
                        <p className="text-sm font-semibold text-customText">{shipment.selectedRoute.roadCondition}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Timeline */}
          <div className="lg:col-span-1">
            <TrackingTimeline shipment={shipment} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentTracking;
