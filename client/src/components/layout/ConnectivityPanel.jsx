import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { Wifi, WifiOff, Radio } from 'lucide-react';

const ConnectivityPanel = ({ connectivityData }) => {
  if (!connectivityData) return null;

  const {
    connectivityLevel = 'GOOD',
    connectivityScore = 100,
    factors = [],
    summary = '',
    source = 'Deterministic Location Analysis'
  } = connectivityData;

  // Badge mapping helper for connectivity levels
  const getConnectivityBadge = (lvl) => {
    switch (lvl) {
      case 'GOOD':
        return <Badge variant="success">Strong Signal</Badge>;
      case 'MODERATE':
        return <Badge variant="success" className="border-customPrimary/30 text-customPrimary bg-customPrimary/10">Moderate Signal</Badge>;
      case 'LIMITED':
        return <Badge variant="warning">Intermittent Signal</Badge>;
      case 'UNKNOWN':
      default:
        return <Badge variant="danger">Blackout Zone</Badge>;
    }
  };

  // Color mapping helper for connectivity scores
  const getProgressBarColor = (score) => {
    if (score >= 80) return 'bg-customSuccess';
    if (score >= 55) return 'bg-customPrimary';
    if (score >= 25) return 'bg-customWarning';
    return 'bg-customDanger';
  };

  return (
    <Card className="bg-darkCard/80 border border-darkBorder text-xs space-y-4">
      <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-customPrimary" />
          Estimated Logistics Connectivity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Connectivity score details */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-darkBgSecondary/40 border border-darkBorder p-4 rounded-xl">
          <div className="relative w-20 h-20 rounded-full border-[6px] border-slate-800 flex flex-col items-center justify-center bg-darkCard select-none shrink-0 shadow-lg">
            <span className="text-xl font-black text-customText leading-none">
              {connectivityScore}
            </span>
            <span className="text-[8px] text-customMuted uppercase font-bold tracking-wider mt-0.5">
              Score
            </span>
            <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent pointer-events-none opacity-50 border-r-customPrimary border-b-customPrimary" />
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
              <span className="text-sm font-bold text-customText">Channel Signal Estimate</span>
              {getConnectivityBadge(connectivityLevel)}
            </div>
            <p className="text-customText text-[11px] leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        {/* Progress Score Indicator */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium">Estimated Channel Latency</span>
            <span className="font-bold text-customText">{connectivityScore} / 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${getProgressBarColor(connectivityScore)}`}
              style={{ width: `${connectivityScore}%` }}
              aria-label={`Logistics connectivity score ${connectivityScore} out of 100`}
            />
          </div>
        </div>

        {/* Connectivity Factors list */}
        {factors && factors.length > 0 && (
          <div className="bg-darkBgSecondary/40 border border-darkBorder rounded-lg p-3 space-y-1.5 mt-2">
            <span className="text-[9px] uppercase font-bold text-customMuted tracking-wider block">
              Calculated Signal Factors:
            </span>
            <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed max-h-24 overflow-y-auto">
              {factors.map((factor, idx) => (
                <li key={idx} className="text-customText/90">
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer Warning - Mandatory */}
        <div className="border-t border-darkBorder/40 pt-3 text-[10px] text-customMuted leading-relaxed bg-darkBgSecondary/20 p-2.5 rounded-lg border border-darkBorder select-none">
          <span className="font-bold text-orange-400 block mb-0.5 uppercase text-[9px] tracking-wider">
            Disclaimer:
          </span>
          Connectivity is estimated from terrain, risk, and location data and does not represent live telecom coverage.
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectivityPanel;
