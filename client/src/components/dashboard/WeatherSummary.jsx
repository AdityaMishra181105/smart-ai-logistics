import React from 'react';
import { Cloud, Droplets, Wind, AlertCircle, RefreshCw } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

const WeatherSummary = ({ weather, loading, onRefresh }) => {
  if (loading) {
    return (
      <Card className="bg-darkCard/40 border border-darkBorder/40">
        <CardHeader className="pb-3 border-b border-darkBorder/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-customSecondary" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-darkBgSecondary rounded w-3/4" />
            <div className="h-4 bg-darkBgSecondary rounded w-1/2" />
            <div className="h-4 bg-darkBgSecondary rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather || !weather.available) {
    return (
      <Card className="bg-darkCard/40 border border-darkBorder/40">
        <CardHeader className="pb-3 border-b border-darkBorder/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-customMuted" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-customMuted" />
            <p className="text-[10px] text-customMuted">
              {weather?.message || 'Weather data unavailable'}
            </p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-[9px] text-customPrimary hover:text-customPrimaryHover flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'HIGH':
        return <Badge variant="danger" className="text-[8px] animate-pulse">HIGH RISK</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning" className="text-[8px]">MEDIUM RISK</Badge>;
      default:
        return <Badge variant="success" className="text-[8px]">LOW RISK</Badge>;
    }
  };

  return (
    <Card className="bg-darkCard/40 border border-darkBorder/40">
      <CardHeader className="pb-3 border-b border-darkBorder/40 flex items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <Cloud className="w-4 h-4 text-customSecondary" />
          Weather Conditions
        </CardTitle>
        {getRiskBadge(weather.riskLevel)}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Weather Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-customText font-mono">
              {weather.temperature}°C
            </div>
            <div className="text-[10px] text-customMuted uppercase font-bold tracking-wider mt-1">
              {weather.condition}
            </div>
            <div className="text-[9px] text-customMuted capitalize mt-0.5">
              {weather.description}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-customMuted uppercase tracking-wider">
              {weather.location}
            </div>
          </div>
        </div>

        {/* Weather Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-darkBorder/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-customText">
                {weather.rainfall > 0 ? `${weather.rainfall.toFixed(1)} mm` : 'None'}
              </div>
              <div className="text-[8px] text-customMuted uppercase tracking-wider">
                Rainfall
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-customText">
                {weather.windSpeed.toFixed(1)} m/s
              </div>
              <div className="text-[8px] text-customMuted uppercase tracking-wider">
                Wind Speed
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-[8px] text-customMuted text-center pt-2 border-t border-darkBorder/40">
          Last updated: {new Date(weather.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherSummary;
