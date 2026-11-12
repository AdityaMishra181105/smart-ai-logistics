import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { AlertCircle, AlertOctagon, CloudRain, ShieldAlert } from 'lucide-react';
import { demoRiskZones } from '../../constants/demoRiskZones';

const RiskZoneLayer = ({ visible = true }) => {
  if (!visible) return null;

  // Handle empty state - no risk zones to display
  if (!demoRiskZones || demoRiskZones.length === 0) {
    return null;
  }

  // Resolve color scheme based on risk levels
  const getRiskColors = (level) => {
    switch (level) {
      case 'LOW':
        return { fill: '#10B981', border: '#047857' }; // Green
      case 'MEDIUM':
        return { fill: '#F59E0B', border: '#D97706' }; // Yellow/Orange
      case 'HIGH':
        return { fill: '#EA580C', border: '#C2410C' }; // Orange-red
      case 'CRITICAL':
        return { fill: '#EF4444', border: '#B91C1C' }; // Bright Red
      default:
        return { fill: '#6B7280', border: '#374151' };
    }
  };

  const getRiskIcon = (type) => {
    switch (type) {
      case 'LANDSLIDE':
        return <AlertOctagon className="w-4 h-4 text-customDanger" />;
      case 'FLOOD':
        return <ShieldAlert className="w-4 h-4 text-customWarning" />;
      case 'HIGH_RAINFALL':
        return <CloudRain className="w-4 h-4 text-customPrimary" />;
      default:
        return <AlertCircle className="w-4 h-4 text-customMuted" />;
    }
  };

  const formatType = (type) => {
    return type.replace('_', ' ');
  };

  return (
    <>
      {demoRiskZones.map((zone) => {
        const colors = getRiskColors(zone.riskLevel);
        const circleOptions = {
          fillColor: colors.fill,
          color: colors.border,
          weight: 1.8,
          fillOpacity: 0.22,
          dashArray: '3, 4'
        };

        return (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={circleOptions}
          >
            <Popup>
              <div className="text-xs space-y-2 p-0.5 text-customText max-w-[220px]">
                {/* Header title */}
                <div className="flex items-center gap-1.5 border-b border-darkBorder pb-1.5 mb-1.5">
                  {getRiskIcon(zone.riskType)}
                  <h4 className="font-bold text-customText text-xs truncate">{zone.name}</h4>
                </div>

                {/* Info blocks */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-customMuted">Risk Classification:</span>
                  <span className="font-semibold text-customText uppercase text-[9px]">{formatType(zone.riskType)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-customMuted">Severity Index:</span>
                  <span
                    className="font-bold uppercase text-[9px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${colors.fill}15`,
                      color: colors.fill,
                      borderColor: `${colors.fill}30`
                    }}
                  >
                    {zone.riskLevel}
                  </span>
                </div>

                <p className="text-[10px] text-customMuted leading-relaxed pt-1 border-t border-darkBorder/40">
                  {zone.description}
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};

export default RiskZoneLayer;
