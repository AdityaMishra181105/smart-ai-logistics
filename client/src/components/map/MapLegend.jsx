import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Flag, MapPin, HelpCircle, AlertTriangle } from 'lucide-react';

const MapLegend = ({ showAlerts = false, showRiskZones = false }) => {
  const legendItems = [
    {
      label: 'Shipment Pickup Origin',
      color: '#6366F1',
      icon: <MapPin className="w-3.5 h-3.5" style={{ color: '#6366F1' }} />
    },
    {
      label: 'Shipment Destination',
      color: '#10B981',
      icon: <Flag className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
    }
  ];

  const alertLegends = [
    { label: 'Critical Alert', color: '#EF4444' },
    { label: 'High Alert', color: '#EA580C' },
    { label: 'Medium Alert', color: '#F59E0B' }
  ];

  const riskLegends = [
    { label: 'Critical Risk Zone', color: '#B91C1C' },
    { label: 'High Risk Zone', color: '#EF4444' },
    { label: 'Medium Risk Zone', color: '#F59E0B' },
    { label: 'Low Risk Zone', color: '#10B981' }
  ];

  return (
    <Card className="bg-darkCard/95 border border-darkBorder shadow-2xl">
      <CardHeader className="pb-2 border-b border-darkBorder">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-customPrimary" />
          <span>Map Legend</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3.5 space-y-4">
        {/* Shipment markers */}
        <div className="space-y-2 text-xs">
          <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block mb-1.5">
            Shipment Locations
          </span>
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 py-0.5 text-customText">
              <div className="w-6 h-6 rounded-full bg-darkBgSecondary border border-darkBorder flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <span className="text-xs text-customMuted">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Route lines */}
        <div className="space-y-2 text-xs pt-3 border-t border-darkBorder/40">
          <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block mb-1.5">
            Route Status
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-0.5 bg-blue-500" style={{ opacity: 0.85 }} />
              <span className="text-[10px] text-customMuted">In Transit</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-0.5 bg-amber-500" style={{ opacity: 0.75 }} />
              <span className="text-[10px] text-customMuted">At Risk</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-0.5 bg-red-500" style={{ opacity: 0.75 }} />
              <span className="text-[10px] text-customMuted">Delayed</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-0.5 bg-emerald-500" style={{ opacity: 0.75 }} />
              <span className="text-[10px] text-customMuted">Delivered</span>
            </div>
          </div>
        </div>

        {/* Alerts if shown */}
        {showAlerts && (
          <div className="space-y-2 text-xs pt-3 border-t border-darkBorder/40">
            <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block mb-1.5">
              Active Alerts
            </span>
            <div className="space-y-1.5">
              {alertLegends.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: alert.color }} />
                  <span className="text-[10px] text-customMuted">{alert.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk zones if shown */}
        {showRiskZones && (
          <div className="space-y-2 text-xs pt-3 border-t border-darkBorder/40">
            <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block mb-1.5">
              Risk Overlays
            </span>
            <div className="space-y-1.5">
              {riskLegends.map((risk, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full border border-darkCard flex-shrink-0"
                    style={{
                      backgroundColor: `${risk.color}35`,
                      borderColor: risk.color
                    }}
                  />
                  <span className="text-[10px] text-customMuted">{risk.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapLegend;
