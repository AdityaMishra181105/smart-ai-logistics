import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { Shield, Sparkles, Map, Thermometer } from 'lucide-react';

const CombinedRiskCard = ({ riskData }) => {
  if (!riskData) return null;

  const {
    geographicRisk = {},
    environmentalRisk = {},
    combinedRisk = {}
  } = riskData;

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

  // Color mapping helper for gauge/progress bars
  const getProgressColor = (score) => {
    if (score > 75) return 'bg-customDanger';
    if (score > 50) return 'bg-orange-500';
    if (score > 25) return 'bg-customWarning';
    return 'bg-customSuccess';
  };

  return (
    <Card className="bg-darkCard/80 border border-darkBorder text-xs space-y-4">
      <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-customPrimary" />
          Safety Assessment Breakdown
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Combined Scoring Gauge */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-darkBgSecondary/40 border border-darkBorder p-4 rounded-xl">
          {/* Circular Score Circle Mock */}
          <div className="relative w-20 h-20 rounded-full border-[6px] border-slate-800 flex flex-col items-center justify-center bg-darkCard select-none shrink-0 shadow-lg">
            <span className="text-xl font-black text-customText leading-none">
              {combinedRisk.score || 0}
            </span>
            <span className="text-[8px] text-customMuted uppercase font-bold tracking-wider mt-0.5">
              Score
            </span>
            {/* Outline highlight arc based on score color */}
            <div className={`absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent pointer-events-none opacity-50 border-r-customPrimary border-b-customPrimary`} />
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
              <span className="text-sm font-bold text-customText">Combined Risk Profile</span>
              {getRiskLevelBadge(combinedRisk.level)}
            </div>
            <p className="text-customMuted text-[11px] leading-relaxed">
              Calculated using weighted aggregation ($45\%$ geographic zone intersections + $55\%$ sample-point environmental telemetry).
            </p>
          </div>
        </div>

        {/* Breakdown of Sub-components */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Geographic Card */}
          <div className="bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-customText">
              <Map className="w-4 h-4 text-customPrimary" />
              <span>Geographic Risk</span>
            </div>
            <div className="flex items-end justify-between text-[10px]">
              <span className="text-customMuted">Zone Threats</span>
              <span className="font-bold text-customText">{geographicRisk.score || 0} / 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className={`h-1 rounded-full ${getProgressColor(geographicRisk.score)}`}
                style={{ width: `${geographicRisk.score || 0}%` }}
                aria-label="Geographic Risk Score"
              />
            </div>
            <div className="flex justify-between items-center text-[9px] pt-1">
              <span className="text-customMuted">Rating:</span>
              <span className="font-bold text-customText">{geographicRisk.level || 'LOW'}</span>
            </div>
          </div>

          {/* Environmental Card */}
          <div className="bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-customText">
              <Thermometer className="w-4 h-4 text-customWarning" />
              <span>Environmental Risk</span>
            </div>
            <div className="flex items-end justify-between text-[10px]">
              <span className="text-customMuted">Weather Indices</span>
              <span className="font-bold text-customText">{environmentalRisk.score || 0} / 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className={`h-1 rounded-full ${getProgressColor(environmentalRisk.score)}`}
                style={{ width: `${environmentalRisk.score || 0}%` }}
                aria-label="Environmental Risk Score"
              />
            </div>
            <div className="flex justify-between items-center text-[9px] pt-1">
              <span className="text-customMuted">Rating:</span>
              <span className="font-bold text-customText">{environmentalRisk.level || 'LOW'}</span>
            </div>
          </div>
        </div>

        {/* Warning factors list */}
        {combinedRisk.factors && combinedRisk.factors.length > 0 && (
          <div className="bg-darkBgSecondary/40 border border-darkBorder rounded-lg p-3 space-y-1.5 mt-2">
            <span className="text-[9px] uppercase font-bold text-customMuted tracking-wider block">
              Cumulative Risk Factors
            </span>
            <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed max-h-28 overflow-y-auto">
              {combinedRisk.factors.map((factor, idx) => (
                <li key={idx} className="text-customText/90">
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CombinedRiskCard;
