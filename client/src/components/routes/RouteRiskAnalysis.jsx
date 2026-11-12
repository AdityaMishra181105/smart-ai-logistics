import React from 'react';
import { AlertTriangle, Cloud, Droplets, Wind, Navigation, MapPin, Activity } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * Route Risk Analysis Component
 * Displays detailed risk breakdown for a route
 */

const RouteRiskAnalysis = ({ riskAnalysis }) => {
  if (!riskAnalysis) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No risk analysis available</p>
          <p className="text-sm text-gray-500 mt-1">Run route analysis to see risk details</p>
        </CardContent>
      </Card>
    );
  };

  const { riskLevel, riskScore, riskFactors, weatherAnalysis, affectedIncidents } = riskAnalysis;

  const getRiskColor = (level) => {
    switch (level) {
      case 'LOW': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'LOW': return 'bg-green-900/20 border-green-700';
      case 'MEDIUM': return 'bg-yellow-900/20 border-yellow-700';
      case 'HIGH': return 'bg-red-900/20 border-red-700';
      default: return 'bg-gray-900/20 border-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Risk Score */}
      <Card className={`${getRiskBgColor(riskLevel)} border`}>
        <CardContent className="py-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-900/50 mb-4">
              <div className="text-center">
                <p className={`text-3xl font-bold ${getRiskColor(riskLevel)}`}>
                  {riskScore || 0}
                </p>
                <p className="text-xs text-gray-400">/ 100</p>
              </div>
            </div>
            <h3 className={`text-2xl font-bold ${getRiskColor(riskLevel)}`}>
              {riskLevel || 'UNKNOWN'} RISK
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              {riskLevel === 'LOW' && 'Route appears safe for travel'}
              {riskLevel === 'MEDIUM' && 'Moderate risk - proceed with caution'}
              {riskLevel === 'HIGH' && 'High risk - consider alternative route'}
              {!riskLevel && 'Risk level not determined'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {riskFactors && riskFactors.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskFactors.map((factor, index) => (
              <div
                key={index}
                className="p-3 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-white text-sm">{factor.factor}</p>
                  <Badge
                    variant={
                      factor.severity === 'HIGH' ? 'error' :
                      factor.severity === 'MEDIUM' ? 'warning' : 'default'
                    }
                    className="text-xs"
                  >
                    {factor.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">{factor.impact}</p>
                {factor.location && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {factor.location}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weather Analysis */}
      {weatherAnalysis && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" />
              Weather Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-gray-400">Rainfall</p>
                </div>
                <p className="text-lg font-semibold text-white">
                  {weatherAnalysis.avgRainfall} mm
                </p>
                <p className="text-xs text-gray-500">
                  Max: {weatherAnalysis.maxRainfall} mm
                </p>
              </div>

              <div className="p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">Wind Speed</p>
                </div>
                <p className="text-lg font-semibold text-white">
                  {weatherAnalysis.avgWindSpeed} m/s
                </p>
                <p className="text-xs text-gray-500">
                  Max: {weatherAnalysis.maxWindSpeed} m/s
                </p>
              </div>
            </div>

            {/* Weather Alerts */}
            <div className="mt-3 space-y-2">
              {weatherAnalysis.hasHeavyRain && (
                <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-700 rounded text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  Heavy rainfall detected along route
                </div>
              )}
              {weatherAnalysis.hasStrongWind && (
                <div className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-200">
                  <AlertTriangle className="w-4 h-4" />
                  Strong wind conditions
                </div>
              )}
              {weatherAnalysis.hasSnow && (
                <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700 rounded text-xs text-blue-200">
                  <AlertTriangle className="w-4 h-4" />
                  Snow/ice conditions present
                </div>
              )}
              {!weatherAnalysis.hasHeavyRain && !weatherAnalysis.hasStrongWind && !weatherAnalysis.hasSnow && (
                <p className="text-xs text-gray-500 text-center py-2">
                  No severe weather alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affected Incidents */}
      {affectedIncidents && affectedIncidents.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Active Incidents Near Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {affectedIncidents.map((incident, index) => (
              <div
                key={index}
                className="p-3 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">
                      {incident.type || 'Incident'}
                    </p>
                    {incident.location && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {incident.location}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'error' :
                      incident.severity === 'MEDIUM' ? 'warning' : 'default'
                    }
                    className="text-xs"
                  >
                    {incident.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Risk Factors */}
      {(!riskFactors || riskFactors.length === 0) && 
       (!affectedIncidents || affectedIncidents.length === 0) && 
       !weatherAnalysis && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-8 text-center">
            <p className="text-gray-400">No specific risk factors detected</p>
            <p className="text-sm text-gray-500 mt-1">Route appears clear for travel</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteRiskAnalysis;
