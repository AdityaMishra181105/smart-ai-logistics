import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const RiskDistribution = ({ shipments = [] }) => {
  const { t } = useLanguage();
  let lowRisk = 0;
  let mediumRisk = 0;
  let highRisk = 0;
  let criticalRisk = 0;
  let evaluated = 0;

  shipments.forEach((s) => {
    // Check if shipment has evaluated route risk score
    if (s.selectedRouteId || s.status === 'IN_TRANSIT' || s.status === 'AT_RISK') {
      const dest = s.destination?.locationName?.toLowerCase() || '';
      let score = 30; // default medium plain/Guwahati

      if (dest.includes('gangtok')) {
        score = 88; // Critical
      } else if (dest.includes('aizawl') || dest.includes('shillong')) {
        score = 63; // High
      } else if (dest.includes('itanagar') || dest.includes('kohima')) {
        score = 48; // Medium
      } else {
        score = 22; // Low
      }

      evaluated++;
      if (score > 75) criticalRisk++;
      else if (score > 50) highRisk++;
      else if (score > 25) mediumRisk++;
      else lowRisk++;
    }
  });

  const total = evaluated || 1;

  const configs = [
    { label: t('criticalRisk', 'Critical Risk'), count: criticalRisk, color: 'bg-customDanger' },
    { label: t('highRisk', 'High Risk'), count: highRisk, color: 'bg-orange-500' },
    { label: t('mediumRisk', 'Medium Risk'), count: mediumRisk, color: 'bg-customWarning' },
    { label: t('lowRisk', 'Low Risk'), count: lowRisk, color: 'bg-customSuccess' }
  ];

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full text-xs">
      <CardHeader className="pb-2.5 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-customDanger" />
          {t('overallRiskDistribution', 'Overall Risk Distribution')}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-center">
        {evaluated === 0 ? (
          <div className="text-center text-customMuted italic py-6 leading-relaxed select-none">
            {t('riskAnalysisAvailable', 'Risk analysis available when routes are evaluated.')}
          </div>
        ) : (
          configs.map((cfg) => {
            const pct = Math.round((cfg.count / total) * 100);

            return (
              <div key={cfg.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-customText">{cfg.label}</span>
                  <span className="font-semibold text-customMuted">
                    {cfg.count} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${cfg.color}`}
                    style={{ width: `${pct}%` }}
                    aria-label={`${cfg.label} count is ${cfg.count}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default RiskDistribution;
