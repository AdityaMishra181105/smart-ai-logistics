import React from 'react';
import { Package, MapPin, Truck, Navigation, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

const TrackingTimeline = ({ shipment }) => {
  if (!shipment) {
    return (
      <div className="bg-darkCard border border-darkBorder rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-customMuted mx-auto mb-3" />
        <p className="text-sm text-customMuted">No shipment selected for tracking</p>
      </div>
    );
  }

  // Define all possible tracking events
  const trackingEvents = [
    {
      id: 'CREATED',
      label: 'Order Created',
      icon: Package,
      statuses: ['CREATED', 'ROUTE_PENDING', 'ROUTE_SELECTED', 'IN_TRANSIT', 'AT_RISK', 'DELAYED', 'DELIVERED'],
      description: 'Shipment order has been created'
    },
    {
      id: 'ROUTE_SELECTED',
      label: 'Route Selected',
      icon: MapPin,
      statuses: ['ROUTE_SELECTED', 'IN_TRANSIT', 'AT_RISK', 'DELAYED', 'DELIVERED'],
      description: 'Optimal route has been calculated'
    },
    {
      id: 'PICKUP',
      label: 'Shipment Picked Up',
      icon: Truck,
      statuses: ['IN_TRANSIT', 'AT_RISK', 'DELAYED', 'DELIVERED'],
      description: `Picked up from ${shipment.pickup?.locationName || 'pickup location'}`
    },
    {
      id: 'IN_TRANSIT',
      label: 'In Transit',
      icon: Navigation,
      statuses: ['IN_TRANSIT', 'AT_RISK', 'DELAYED', 'DELIVERED'],
      description: 'Vehicle is on the move'
    },
    {
      id: 'OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      icon: Truck,
      statuses: ['DELIVERED'],
      description: `Approaching ${shipment.destination?.locationName || 'destination'}`
    },
    {
      id: 'DELIVERED',
      label: 'Delivered',
      icon: CheckCircle,
      statuses: ['DELIVERED'],
      description: `Delivered to ${shipment.destination?.locationName || 'destination'}`
    }
  ];

  const currentStatus = shipment.status;

  // Determine if an event is completed, current, or pending
  const getEventState = (event) => {
    const isCompleted = event.statuses.includes(currentStatus);
    const eventIndex = trackingEvents.findIndex(e => e.id === event.id);
    const currentEventIndex = trackingEvents.findIndex(e => 
      e.id === currentStatus || e.statuses[0] === currentStatus
    );

    if (currentStatus === 'CANCELLED') {
      return eventIndex === 0 ? 'completed' : 'cancelled';
    }

    if (event.statuses.includes(currentStatus)) {
      // Check if this is the current event or a past event
      if (event.id === currentStatus || event.statuses[0] === currentStatus) {
        return 'current';
      }
      // Check if we've moved past this event
      const firstStatusIndex = trackingEvents.findIndex(e => e.id === event.statuses[0]);
      if (currentEventIndex > firstStatusIndex) {
        return 'completed';
      }
      return 'current';
    }

    return 'pending';
  };

  return (
    <div className="bg-darkCard border border-darkBorder rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-customText uppercase tracking-wider">Tracking History</h3>
        <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${
          currentStatus === 'DELIVERED' ? 'bg-customSuccess/10 text-customSuccess border-customSuccess/30' :
          currentStatus === 'IN_TRANSIT' ? 'bg-customPrimary/10 text-customPrimary border-customPrimary/30' :
          currentStatus === 'AT_RISK' || currentStatus === 'DELAYED' ? 'bg-customWarning/10 text-customWarning border-customWarning/30' :
          currentStatus === 'CANCELLED' ? 'bg-customDanger/10 text-customDanger border-customDanger/30' :
          'bg-customMuted/10 text-customMuted border-customMuted/30'
        }`}>
          {currentStatus.replace('_', ' ')}
        </div>
      </div>

      <div className="space-y-1 relative">
        {/* Vertical connecting line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-darkBorder" />

        {trackingEvents.map((event, index) => {
          const state = getEventState(event);
          const Icon = event.icon;
          const isLast = index === trackingEvents.length - 1;

          return (
            <div key={event.id} className="relative flex items-start gap-4 pb-6">
              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                state === 'completed' ? 'bg-customSuccess border-customSuccess shadow-lg shadow-customSuccess/20' :
                state === 'current' ? 'bg-customPrimary border-customPrimary shadow-lg shadow-customPrimary/20 animate-pulse' :
                state === 'cancelled' ? 'bg-customDanger/20 border-customDanger/50' :
                'bg-darkBgSecondary border-darkBorder'
              }`}>
                <Icon className={`w-4 h-4 ${
                  state === 'completed' ? 'text-white' :
                  state === 'current' ? 'text-white' :
                  state === 'cancelled' ? 'text-customDanger' :
                  'text-customMuted'
                }`} />
              </div>

              {/* Content */}
              <div className={`flex-1 pt-0.5 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold ${
                  state === 'completed' || state === 'current' ? 'text-customText' : 'text-customMuted'
                }`}>
                  {event.label}
                </p>
                <p className="text-xs text-customMuted mt-0.5">{event.description}</p>
                
                {/* Show timestamp if available (from shipment.createdAt or updatedAt) */}
                {state === 'completed' && shipment.createdAt && event.id === 'CREATED' && (
                  <p className="text-xs text-customMuted mt-1">
                    {new Date(shipment.createdAt).toLocaleString()}
                  </p>
                )}
                {state === 'completed' && shipment.updatedAt && event.id === currentStatus && (
                  <p className="text-xs text-customMuted mt-1">
                    {new Date(shipment.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Cancelled state */}
        {currentStatus === 'CANCELLED' && (
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-customDanger border-customDanger shadow-lg shadow-customDanger/20">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-semibold text-customDanger">Shipment Cancelled</p>
              <p className="text-xs text-customMuted mt-0.5">This shipment has been cancelled</p>
              {shipment.updatedAt && (
                <p className="text-xs text-customMuted mt-1">
                  {new Date(shipment.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alert states */}
      {(currentStatus === 'AT_RISK' || currentStatus === 'DELAYED') && (
        <div className="mt-4 p-3 bg-customWarning/10 border border-customWarning/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-customWarning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-customWarning">
              {currentStatus === 'AT_RISK' ? 'Shipment At Risk' : 'Shipment Delayed'}
            </p>
            <p className="text-xs text-customMuted mt-1">
              {currentStatus === 'AT_RISK' 
                ? 'This shipment has encountered risk factors along the route.' 
                : 'This shipment is experiencing delays. Estimated arrival time may be affected.'}
            </p>
          </div>
        </div>
      )}

      {/* Shipment details */}
      {shipment.notes && (
        <div className="mt-4 p-3 bg-darkBgSecondary border border-darkBorder rounded-lg">
          <p className="text-xs font-semibold text-customMuted uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-customText">{shipment.notes}</p>
        </div>
      )}
    </div>
  );
};

export default TrackingTimeline;
