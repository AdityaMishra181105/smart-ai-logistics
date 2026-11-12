import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { Bell, ShieldAlert, AlertTriangle, AlertOctagon, Info, ChevronRight } from 'lucide-react';

const AlertSummaryPanel = ({ shipments = [] }) => {
  const navigate = useNavigate();

  // Deterministically compile active alerts from shipments
  const activeAlerts = [];

  shipments.forEach(s => {
    const dest = s.destination?.locationName?.toLowerCase() || '';
    if (s._id === 'shp-id-5' || dest.includes('gangtok') && s.priority === 'CRITICAL') {
      activeAlerts.push({
        id: `alert-5`,
        severity: 'CRITICAL',
        title: 'Route Accessibility Blocked',
        message: 'Critical vaccines shipment blocked by active storm and landslide warnings.',
        shipmentId: s.shipmentId,
        shipmentDbId: s._id
      });
    } else if (s._id === 'shp-id-2' || (dest.includes('aizawl') && s.priority === 'HIGH')) {
      activeAlerts.push({
        id: `alert-2`,
        severity: 'HIGH',
        title: 'High Landslide Risk Warning',
        message: 'Rice and grain delivery corridor affected by critical landslide warnings.',
        shipmentId: s.shipmentId,
        shipmentDbId: s._id
      });
    } else if (s._id === 'shp-id-7' || (dest.includes('gangtok') && s.priority === 'HIGH')) {
      activeAlerts.push({
        id: `alert-7`,
        severity: 'HIGH',
        title: 'Storm Alert Inundation',
        message: 'Reconstruction steel rods corridor affected by severe storm alerts.',
        shipmentId: s.shipmentId,
        shipmentDbId: s._id
      });
    } else if (s._id === 'shp-id-1') {
      activeAlerts.push({
        id: `alert-1`,
        severity: 'HIGH',
        title: 'Severe Rainfall Advisory',
        message: 'Shillong medicine delivery corridor affected by heavy rain warnings.',
        shipmentId: s.shipmentId,
        shipmentDbId: s._id
      });
    } else if (s.selectedRouteId) {
      activeAlerts.push({
        id: `alert-${s._id}`,
        severity: 'WARNING',
        title: 'Route Caution Active',
        message: `Moderate corridor risk active for transit to ${s.destination?.locationName}.`,
        shipmentId: s.shipmentId,
        shipmentDbId: s._id
      });
    }
  });

  // Sort by severity (CRITICAL -> HIGH -> WARNING -> INFO) and limit to max 5
  const severityOrder = { CRITICAL: 4, HIGH: 3, WARNING: 2, INFO: 1 };
  const sortedAlerts = activeAlerts
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
    .slice(0, 5);

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4 text-customDanger" aria-label="Critical Icon" />;
      case 'HIGH':
        return <ShieldAlert className="w-4 h-4 text-orange-400" aria-label="High Risk Icon" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-customWarning" aria-label="Warning Icon" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-customPrimary" aria-label="Info Icon" />;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="danger" className="text-[7px] py-0">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="border-orange-500/30 text-orange-400 bg-orange-500/10 text-[7px] py-0">HIGH</Badge>;
      case 'WARNING':
        return <Badge variant="warning" className="text-[7px] py-0">WARNING</Badge>;
      case 'INFO':
      default:
        return <Badge variant="neutral" className="text-[7px] py-0">INFO</Badge>;
    }
  };

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full text-xs">
      <CardHeader className="pb-2.5 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-customPrimary" />
          Active Safety Alerts
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 overflow-y-auto space-y-2.5 max-h-[300px] flex-1">
        {sortedAlerts.length === 0 ? (
          <div className="p-4 text-center text-customMuted italic select-none">
            No active risk alerts reported.
          </div>
        ) : (
          sortedAlerts.map(alert => (
            <div key={alert.id} className="p-2.5 bg-darkBgSecondary/35 border border-darkBorder rounded-lg flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="shrink-0">{getSeverityIcon(alert.severity)}</div>
                  <span className="font-bold text-customText text-[10px]">{alert.title}</span>
                  {getSeverityBadge(alert.severity)}
                  <span className="text-[8px] text-customMuted">Ref: {alert.shipmentId}</span>
                </div>
                <p className="text-[9px] text-customMuted leading-relaxed">
                  {alert.message}
                </p>
              </div>

              <Button
                variant="outline"
                size="xs"
                className="font-bold uppercase tracking-wider text-[8px] py-1 flex items-center gap-0.5 hover:bg-darkBgSecondary shrink-0"
                onClick={() => navigate(`/shipments/${alert.shipmentDbId}`)}
              >
                <span>Review</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AlertSummaryPanel;
