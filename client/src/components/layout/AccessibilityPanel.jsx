import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { ShieldCheck, EyeOff, ShieldX } from 'lucide-react';

const AccessibilityPanel = ({ accessibilityData }) => {
  if (!accessibilityData) return null;

  const {
    accessibilityLevel = 'GOOD',
    accessibilityScore = 100,
    concerns = [],
    summary = ''
  } = accessibilityData;

  // Badge mapping helper for accessibility levels
  const getAccessibilityBadge = (lvl) => {
    switch (lvl) {
      case 'GOOD':
        return <Badge variant="success">Fully Accessible</Badge>;
      case 'LIMITED':
        return <Badge variant="warning">Limited Access</Badge>;
      case 'POOR':
        return <Badge variant="warning" className="border-orange-500/30 text-orange-400 bg-orange-500/10">Poor Accessibility</Badge>;
      case 'BLOCKED':
        return <Badge variant="danger">Blocked / Closed</Badge>;
      default:
        return <Badge variant="neutral">{lvl}</Badge>;
    }
  };

  // Color mapping helper for accessibility progress bars
  const getProgressBarColor = (score) => {
    if (score >= 80) return 'bg-customSuccess';
    if (score >= 55) return 'bg-customPrimary';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-customDanger';
  };

  return (
    <Card className="bg-darkCard/80 border border-darkBorder text-xs space-y-4">
      <CardHeader className="pb-2.5 border-b border-darkBorder mb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-customPrimary" />
          Route Accessibility Intelligence
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Accessibility Score layout */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-darkBgSecondary/40 border border-darkBorder p-4 rounded-xl">
          <div className="relative w-20 h-20 rounded-full border-[6px] border-slate-800 flex flex-col items-center justify-center bg-darkCard select-none shrink-0 shadow-lg">
            <span className="text-xl font-black text-customText leading-none">
              {accessibilityScore}
            </span>
            <span className="text-[8px] text-customMuted uppercase font-bold tracking-wider mt-0.5">
              Score
            </span>
            <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent pointer-events-none opacity-50 border-r-customPrimary border-b-customPrimary" />
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
              <span className="text-sm font-bold text-customText">Accessibility Status</span>
              {getAccessibilityBadge(accessibilityLevel)}
            </div>
            <p className="text-customText text-[11px] leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        {/* Accessibility Progress score indicator */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium">Logistics Channel Flow</span>
            <span className="font-bold text-customText">{accessibilityScore} / 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${getProgressBarColor(accessibilityScore)}`}
              style={{ width: `${accessibilityScore}%` }}
              aria-label={`Route accessibility score ${accessibilityScore} out of 100`}
            />
          </div>
        </div>

        {/* Accessibility concerns list */}
        {concerns && concerns.length > 0 && (
          <div className="bg-darkBgSecondary/40 border border-darkBorder rounded-lg p-3 space-y-1.5 mt-2">
            <span className="text-[9px] uppercase font-bold text-customMuted tracking-wider block">
              Active Access Impediments:
            </span>
            <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed max-h-24 overflow-y-auto">
              {concerns.map((concern, idx) => (
                <li key={idx} className="text-customText/90">
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessibilityPanel;
