import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ClipboardList } from 'lucide-react';

const ShipmentStatusOverview = ({ shipments = [] }) => {
  // Aggregate counts by status dynamically
  const statusCounts = {
    ROUTE_PENDING: 0,
    ROUTE_SELECTED: 0,
    IN_TRANSIT: 0,
    DELIVERED: 0,
    DELAYED: 0,
    AT_RISK: 0
  };

  shipments.forEach((s) => {
    if (statusCounts[s.status] !== undefined) {
      statusCounts[s.status]++;
    }
  });

  const total = shipments.length || 1;

  // Render variables
  const statusConfigs = [
    { key: 'ROUTE_PENDING', label: 'Route Pending', color: 'bg-customPrimary' },
    { key: 'ROUTE_SELECTED', label: 'Route Selected', color: 'bg-indigo-500' },
    { key: 'IN_TRANSIT', label: 'In Transit', color: 'bg-teal-500' },
    { key: 'DELIVERED', label: 'Delivered', color: 'bg-customSuccess' },
    { key: 'DELAYED', label: 'Delayed', color: 'bg-customWarning' },
    { key: 'AT_RISK', label: 'At Risk', color: 'bg-customDanger' }
  ];

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full text-xs">
      <CardHeader className="pb-2.5 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-customPrimary" />
          Shipment Status Distribution
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-center">
        {statusConfigs.map((cfg) => {
          const count = statusCounts[cfg.key];
          const pct = Math.round((count / total) * 100);

          return (
            <div key={cfg.key} className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-customText">{cfg.label}</span>
                <span className="font-semibold text-customMuted">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${cfg.color}`}
                  style={{ width: `${pct}%` }}
                  aria-label={`${cfg.label} status count is ${count}`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ShipmentStatusOverview;
