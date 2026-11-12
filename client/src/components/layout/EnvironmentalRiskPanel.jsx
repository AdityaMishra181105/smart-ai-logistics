import React from 'react';
import { CloudRain, Wind, AlertTriangle, CloudFog, Sun, Cloud, Thermometer, ShieldAlert } from 'lucide-react';
import Badge from '../ui/Badge';

const EnvironmentalRiskPanel = ({ riskData }) => {
  if (!riskData) {
    return (
      <div className="p-3 text-center text-xs text-customMuted bg-darkBgSecondary/30 border border-darkBorder rounded-lg">
        No environmental telemetry details available.
      </div>
    );
  }

  const {
    weather = {},
    flood = {},
    landslide = {},
    visibility = {},
    source = 'DEMO',
    updatedAt
  } = riskData;

  // Weather icon mapping
  const getWeatherIcon = (cond) => {
    switch (cond) {
      case 'HEAVY_RAIN':
      case 'STORM':
        return <CloudRain className="w-5 h-5 text-customDanger" />;
      case 'MODERATE_RAIN':
      case 'LIGHT_RAIN':
        return <CloudRain className="w-5 h-5 text-customPrimary" />;
      case 'FOG':
        return <CloudFog className="w-5 h-5 text-customWarning" />;
      case 'CLOUDY':
        return <Cloud className="w-5 h-5 text-customMuted" />;
      case 'CLEAR':
      default:
        return <Sun className="w-5 h-5 text-customSuccess" />;
    }
  };

  // Color mapping helper for progress bars
  const getProgressBarColor = (score) => {
    if (score > 75) return 'bg-customDanger';
    if (score > 50) return 'bg-orange-500';
    if (score > 25) return 'bg-customWarning';
    return 'bg-customSuccess';
  };

  // Badge mapping helper for risk levels
  const getRiskLevelBadge = (level) => {
    switch (level) {
      case 'LOW':
        return <Badge variant="success">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="border-orange-500/30 text-orange-400 bg-orange-500/10">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">Critical</Badge>;
      default:
        return <Badge variant="neutral">{level}</Badge>;
    }
  };

  return (
    <div className="bg-darkBgSecondary/40 border border-darkBorder rounded-lg p-3.5 space-y-3.5 text-xs">
      {/* Header and Source Indicator */}
      <div className="flex justify-between items-center border-b border-darkBorder pb-2">
        <span className="font-semibold text-customText text-[11px] uppercase tracking-wider">
          Environmental Metrics
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-customWarning border border-customWarning/30 bg-customWarning/5 px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider select-none">
            <ShieldAlert className="w-2.5 h-2.5" />
            {source} DATA
          </span>
        </div>
      </div>

      {/* Grid: Weather & Visibility */}
      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-darkBorder/40">
        {/* Weather Conditions */}
        <div className="flex items-start gap-2.5 bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-2">
          <div className="mt-0.5">{getWeatherIcon(weather.condition)}</div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-customMuted uppercase font-semibold">Conditions</span>
            <span className="font-bold text-customText block truncate uppercase text-[10px]">
              {weather.condition?.replace('_', ' ') || 'CLEAR'}
            </span>
            <span className="text-[10px] text-customMuted block">
              Precip: {weather.rainfallMm || 0} mm
            </span>
          </div>
        </div>

        {/* Temperature & Visibility */}
        <div className="flex items-start gap-2.5 bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-2">
          <Thermometer className="w-5 h-5 text-customWarning mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[9px] text-customMuted uppercase font-semibold">Atmospheric</span>
            <span className="font-bold text-customText block text-[10px]">
              Temp: {weather.temperatureC || 20}°C
            </span>
            <span className="text-[10px] text-customMuted block truncate">
              Vis: {weather.visibilityKm?.toFixed(1) || '10.0'} km
            </span>
          </div>
        </div>
      </div>

      {/* Specific risk vectors progress indicators */}
      <div className="space-y-3">
        {/* Rainfall Risk */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium">Rainfall Intensity</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-customText">
                {weather.rainfallRiskScore || 0} / 100
              </span>
              {getRiskLevelBadge(weather.rainfallRiskLevel)}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full ${getProgressBarColor(weather.rainfallRiskScore)}`}
              style={{ width: `${weather.rainfallRiskScore || 0}%` }}
              aria-label="Rainfall Risk Score"
            />
          </div>
        </div>

        {/* Flood Risk */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium flex items-center gap-1">
              Flood Vulnerability
              {flood.active && (
                <span className="w-1.5 h-1.5 rounded-full bg-customDanger animate-ping" />
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-customText">{flood.riskScore || 0} / 100</span>
              {getRiskLevelBadge(flood.riskLevel)}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full ${getProgressBarColor(flood.riskScore)}`}
              style={{ width: `${flood.riskScore || 0}%` }}
              aria-label="Flood Risk Score"
            />
          </div>
        </div>

        {/* Landslide Risk */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium flex items-center gap-1">
              Landslide Hazard
              {landslide.active && (
                <span className="w-1.5 h-1.5 rounded-full bg-customDanger animate-ping" />
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-customText">{landslide.riskScore || 0} / 100</span>
              {getRiskLevelBadge(landslide.riskLevel)}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full ${getProgressBarColor(landslide.riskScore)}`}
              style={{ width: `${landslide.riskScore || 0}%` }}
              aria-label="Landslide Risk Score"
            />
          </div>
        </div>

        {/* Visibility Risk */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium">Visibility Obstruction</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-customText">{visibility.riskScore || 0} / 100</span>
              {getRiskLevelBadge(visibility.riskLevel)}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full ${getProgressBarColor(visibility.riskScore)}`}
              style={{ width: `${visibility.riskScore || 0}%` }}
              aria-label="Visibility Risk Score"
            />
          </div>
        </div>
      </div>

      {/* Analysis Timestamp */}
      {updatedAt && (
        <div className="text-[9px] text-customMuted text-right select-none">
          Updated: {new Date(updatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default EnvironmentalRiskPanel;
