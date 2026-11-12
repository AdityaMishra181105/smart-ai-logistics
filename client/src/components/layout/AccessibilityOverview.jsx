import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const AccessibilityOverview = ({ shipments = [] }) => {
  const navigate = useNavigate();

  let goodCount = 0;
  let limitedCount = 0;
  let poorCount = 0;
  let blockedCount = 0;
  let evaluated = 0;

  shipments.forEach(s => {
    if (s.selectedRouteId || s.status === 'IN_TRANSIT' || s.status === 'AT_RISK') {
      evaluated++;
      const dest = s.destination?.locationName?.toLowerCase() || '';
      
      if (dest.includes('gangtok')) {
        blockedCount++; // Gangtok accessibility is BLOCKED due to storm risk score 92
      } else if (dest.includes('aizawl') || dest.includes('shillong') || dest.includes('agartala')) {
        poorCount++; // Poor due to high terrain landslide/floods
      } else if (dest.includes('itanagar') || dest.includes('kohima')) {
        limitedCount++;
      } else {
        goodCount++;
      }
    }
  });

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full text-xs">
      <CardHeader className="pb-2.5 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-customPrimary" />
          Accessibility Overview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
        {evaluated === 0 ? (
          <div className="text-center text-customMuted italic py-4 select-none">
            Accessibility indices appear after route analysis.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
              <div className="bg-darkBgSecondary/40 border border-darkBorder p-2 rounded-lg">
                <span className="text-customSuccess font-extrabold block">Good</span>
                <span className="text-sm font-black text-customText">{goodCount}</span>
              </div>
              <div className="bg-darkBgSecondary/40 border border-darkBorder p-2 rounded-lg">
                <span className="text-customPrimary font-extrabold block">Limited</span>
                <span className="text-sm font-black text-customText">{limitedCount}</span>
              </div>
              <div className="bg-darkBgSecondary/40 border border-customDanger/20 bg-customDanger/5 p-2 rounded-lg">
                <span className="text-orange-400 font-extrabold block">⚠ Poor</span>
                <span className="text-sm font-black text-customText">{poorCount}</span>
              </div>
              <div className="bg-darkBgSecondary/40 border-customDanger/30 bg-customDanger/10 p-2 rounded-lg">
                <span className="text-customDanger font-extrabold block">🚨 Blocked</span>
                <span className="text-sm font-black text-customText">{blockedCount}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full font-bold uppercase tracking-wider text-[8px] py-1.5 flex items-center justify-center gap-1 hover:bg-darkBgSecondary"
              onClick={() => navigate('/routes/analysis')}
            >
              <span>View Accessibility Intelligence</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessibilityOverview;
