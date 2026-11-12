import React from 'react';
import { AlertOctagon, AlertTriangle, Info, Bell, ShieldAlert, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const AlertCenter = ({ alertsData }) => {
  const navigate = useNavigate();

  if (!alertsData || !alertsData.alerts) {
    return (
      <div className="p-4 text-center text-xs text-customMuted bg-darkBgSecondary/30 border border-darkBorder rounded-lg">
        No safety alerts telemetry available.
      </div>
    );
  }

  const { alerts = [], alertSummary = {} } = alertsData;

  // Icon mapping helper for alert severities
  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertOctagon className="w-5 h-5 text-customDanger animate-pulse" aria-label="Critical Alert icon" />;
      case 'HIGH':
        return <ShieldAlert className="w-5 h-5 text-orange-500" aria-label="High Alert icon" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-customWarning" aria-label="Warning Alert icon" />;
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-customPrimary" aria-label="Info Alert icon" />;
    }
  };

  // Color mapping helper for alert card backgrounds/borders
  const getSeverityStyles = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'border-customDanger/30 bg-customDanger/5';
      case 'HIGH':
        return 'border-orange-500/30 bg-orange-500/5';
      case 'WARNING':
        return 'border-customWarning/30 bg-customWarning/5';
      case 'INFO':
      default:
        return 'border-darkBorder bg-darkBgSecondary/40';
    }
  };

  // Label mapping helper for severities
  const getSeverityLabel = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="text-[9px] font-black uppercase text-customDanger bg-customDanger/10 border border-customDanger/25 px-1.5 py-0.5 rounded tracking-wider">Critical Risk</span>;
      case 'HIGH':
        return <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.5 rounded tracking-wider">High Risk</span>;
      case 'WARNING':
        return <span className="text-[9px] font-black uppercase text-customWarning bg-customWarning/10 border border-customWarning/25 px-1.5 py-0.5 rounded tracking-wider">Warning</span>;
      case 'INFO':
      default:
        return <span className="text-[9px] font-black uppercase text-customPrimary bg-customPrimary/10 border border-customPrimary/25 px-1.5 py-0.5 rounded tracking-wider">Info</span>;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Title Header */}
      <div className="flex items-center gap-2 border-b border-darkBorder/40 pb-2">
        <Bell className="w-4 h-4 text-customPrimary" />
        <h4 className="font-bold text-customText text-[11px] uppercase tracking-wider">
          Safety & Operations Alerts
        </h4>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-darkBgSecondary/35 border border-darkBorder p-2.5 rounded-lg text-center">
          <span className="text-[9px] text-customMuted uppercase font-semibold block">Critical</span>
          <span className="text-sm font-black text-customDanger">{alertSummary.critical || 0}</span>
        </div>
        <div className="bg-darkBgSecondary/35 border border-darkBorder p-2.5 rounded-lg text-center">
          <span className="text-[9px] text-customMuted uppercase font-semibold block">High Risk</span>
          <span className="text-sm font-black text-orange-500">{alertSummary.high || 0}</span>
        </div>
        <div className="bg-darkBgSecondary/35 border border-darkBorder p-2.5 rounded-lg text-center">
          <span className="text-[9px] text-customMuted uppercase font-semibold block">Warnings</span>
          <span className="text-sm font-black text-customWarning">{alertSummary.warning || 0}</span>
        </div>
        <div className="bg-darkBgSecondary/35 border border-darkBorder p-2.5 rounded-lg text-center">
          <span className="text-[9px] text-customMuted uppercase font-semibold block">Total Alerts</span>
          <span className="text-sm font-black text-customText">{alertSummary.total || 0}</span>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-customMuted bg-darkBgSecondary/10 border border-dashed border-darkBorder rounded-lg italic">
            No significant risk alerts for this shipment.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${getSeverityStyles(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getSeverityIcon(alert.severity)}</div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-customText text-[11px] leading-none">
                      {alert.title}
                    </span>
                    {getSeverityLabel(alert.severity)}
                  </div>
                  <p className="text-[10px] text-customMuted leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action trigger */}
              {alert.actionable && alert.action && (
                <div className="shrink-0 flex justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    className="font-bold uppercase tracking-wider text-[8px] py-1 flex items-center gap-0.5 hover:bg-darkBgSecondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(alert.action.target);
                    }}
                  >
                    <span>{alert.action.label}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertCenter;
