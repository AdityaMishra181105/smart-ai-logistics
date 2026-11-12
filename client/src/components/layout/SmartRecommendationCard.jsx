import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { BrainCircuit, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Star, HelpCircle } from 'lucide-react';
import RecommendationScoreBreakdown from './RecommendationScoreBreakdown';

const SmartRecommendationCard = ({ recommendationData }) => {
  const [expanded, setExpanded] = useState(false);

  if (!recommendationData) {
    return (
      <div className="p-4 text-center text-xs text-customMuted bg-darkBgSecondary/30 border border-darkBorder rounded-lg">
        Decision Intelligence telemetry unavailable.
      </div>
    );
  }

  const {
    recommendationStatus,
    recommendedRouteId,
    recommendedRoute,
    rankedRoutes = [],
    confidence = {},
    decisionAnalysis = {},
    explanation = {},
    source = 'SMART_RULE_ENGINE',
    generatedAt
  } = recommendationData;

  // Render warning if all routes are dangerous (AVOID)
  if (recommendationStatus === 'NO_SAFE_ROUTE') {
    return (
      <Card className="bg-customDanger/5 border border-customDanger/25 text-xs">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-customDanger/20 pb-2">
            <ShieldAlert className="w-5 h-5 text-customDanger animate-pulse" />
            <h4 className="font-bold text-customDanger text-[13px] uppercase tracking-wider">
              Transit Safety Alert: No Safe Route Alternatives
            </h4>
          </div>
          
          <div className="space-y-1">
            <p className="text-customText text-[11px] leading-relaxed font-semibold">
              {explanation.summary || 'No route meets the current safety threshold. Active weather or geographic disasters make corridors unsafe.'}
            </p>
            <p className="text-customMuted text-[10px]">
              All generated alternative corridors intersect critical flood rings, landslide hazards, or extreme storm conditions.
            </p>
          </div>

          {explanation.warnings && explanation.warnings.length > 0 && (
            <div className="bg-darkBgSecondary/50 border border-darkBorder p-3 rounded-lg space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-customMuted tracking-wider block">
                Primary Hazard Flags:
              </span>
              <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed">
                {explanation.warnings.map((w, idx) => (
                  <li key={idx} className="text-customDanger">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[9px] text-customMuted flex justify-between select-none">
            <span>Decision Source: {source}</span>
            <span>Evaluated: {new Date(generatedAt).toLocaleTimeString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendedRoute) return null;

  // Badge mapping helper for route viability level
  const getViabilityBadge = (level) => {
    switch (level) {
      case 'RECOMMENDED':
        return <Badge variant="success" className="border-customPrimary/30 text-customPrimary bg-customPrimary/10">Top Recommendation</Badge>;
      case 'VIABLE':
        return <Badge variant="success">Viable Route</Badge>;
      case 'CAUTION':
        return <Badge variant="warning">Caution Risk</Badge>;
      case 'AVOID':
        return <Badge variant="danger">Avoid Route</Badge>;
      default:
        return <Badge variant="neutral">{level}</Badge>;
    }
  };

  // Color mapping helper for confidence scores
  const getConfidenceBadgeColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'text-customSuccess border-customSuccess/30 bg-customSuccess/5';
      case 'MEDIUM':
        return 'text-customWarning border-customWarning/30 bg-customWarning/5';
      case 'LOW':
      default:
        return 'text-customDanger border-customDanger/30 bg-customDanger/5';
    }
  };

  return (
    <Card className="bg-darkCard/90 border border-darkBorder text-xs relative overflow-hidden shadow-xl">
      {/* Decorative Top Accent line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-customPrimary via-indigo-500 to-purple-600" />
      
      <CardContent className="p-4.5 space-y-4">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-darkBorder/40 pb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-customPrimary shrink-0" />
            <div>
              <h4 className="font-bold text-customText text-[13px] uppercase tracking-wider flex items-center gap-1">
                Route Intelligence Analysis
              </h4>
              <p className="text-[10px] text-customMuted">
                Decision engine algorithm recommendation matching cargo category and transit criteria.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 select-none">
            <span className="text-[9px] font-bold text-customMuted border border-darkBorder bg-darkBgSecondary px-1.5 py-0.5 rounded uppercase tracking-wider">
              {source}
            </span>
          </div>
        </div>

        {/* Recommended Route Metric Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-darkBgSecondary/35 border border-darkBorder p-4 rounded-xl items-center">
          {/* Circular Score Circle */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-20 h-20 rounded-full border-[6px] border-slate-800 flex flex-col items-center justify-center bg-darkCard select-none shadow-lg shrink-0">
              <span className="text-xl font-black text-customText leading-none">
                {recommendedRoute.overallScore || 0}
              </span>
              <span className="text-[8px] text-customMuted uppercase font-bold tracking-wider mt-0.5">
                Suitability
              </span>
              <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent pointer-events-none opacity-50 border-r-customPrimary border-b-customPrimary" />
            </div>
          </div>

          {/* Core Recommendation summary */}
          <div className="md:col-span-3 space-y-2 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
              <span className="text-sm font-black text-customText flex items-center gap-1">
                <Star className="w-4 h-4 text-customPrimary fill-customPrimary" />
                {recommendedRoute.name} ({recommendedRoute.type} corridor)
              </span>
              {getViabilityBadge(recommendedRoute.recommendationLevel)}
            </div>
            
            <p className="text-customText text-[11px] leading-relaxed">
              {explanation.summary || 'Selected as the most optimal route choice based on shipment priorities.'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-customMuted text-[10px]">Decision Confidence:</span>
                <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider select-none ${getConfidenceBadgeColor(confidence.level)}`}>
                  {confidence.level} ({confidence.score}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Why this route: Strengths & Warnings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Strengths */}
          <div className="bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-3 space-y-2">
            <span className="text-[9px] uppercase font-bold text-customPrimary tracking-wider block">
              Selection Strengths
            </span>
            <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed">
              {explanation.strengths && explanation.strengths.map((str, idx) => (
                <li key={idx} className="text-customText/95">{str}</li>
              ))}
            </ul>
          </div>

          {/* Warnings */}
          <div className="bg-darkBgSecondary/65 border border-darkBorder/40 rounded-lg p-3 space-y-2">
            <span className="text-[9px] uppercase font-bold text-orange-400 tracking-wider block">
              Hazard Warnings
            </span>
            {explanation.warnings && explanation.warnings.length > 0 ? (
              <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1 leading-relaxed">
                {explanation.warnings.map((warn, idx) => (
                  <li key={idx} className="text-customWarning">{warn}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-customMuted italic">No significant active hazard warnings along path.</p>
            )}
          </div>
        </div>

        {/* Expandable detailed scorecard logic */}
        <div className="border-t border-darkBorder/40 pt-2">
          <button
            type="button"
            className="flex items-center justify-between w-full text-customMuted hover:text-customText text-[10px] font-bold py-1 select-none focus:outline-none cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="uppercase tracking-wider">How was this decided? (Scoring Weightings)</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="mt-3.5 space-y-4 animate-fadeIn border-t border-darkBorder/30 pt-3">
              {/* Decision details row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-darkBgSecondary/25 border border-darkBorder rounded-lg p-3">
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-semibold">Priority</span>
                  <span className="font-bold text-customText uppercase">{decisionAnalysis.shipmentPriority || 'NORMAL'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-semibold">Cargo Category</span>
                  <span className="font-bold text-customText uppercase">{decisionAnalysis.shipmentCategory || 'OTHER'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-semibold">Decision Weights</span>
                  <span className="text-[10px] text-customText block leading-tight">
                    Safety: {decisionAnalysis.weights?.safety}% | Time: {decisionAnalysis.weights?.duration}%
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-semibold">Confidence Factors</span>
                  <span className="text-[10px] text-customMuted block truncate leading-tight" title={confidence.factors?.join(', ')}>
                    {confidence.factors?.[0] || 'Complete Telemetry'}
                  </span>
                </div>
              </div>

              {/* Suitability Score Breakdown Bars */}
              <div className="space-y-3.5">
                <span className="text-[9px] uppercase font-bold text-customMuted tracking-wider block">
                  Route Suitability Score Breakdowns
                </span>
                
                <div className="space-y-3.5 bg-darkBgSecondary/40 border border-darkBorder p-3.5 rounded-lg">
                  {rankedRoutes.map((rankedRoute) => {
                    const isBest = rankedRoute.routeId === recommendedRouteId;
                    return (
                      <div key={rankedRoute.routeId} className={`p-2.5 rounded-lg border ${isBest ? 'border-customPrimary/30 bg-customPrimary/5' : 'border-darkBorder/40 bg-darkBgSecondary/10'}`}>
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="font-bold text-customText text-[11px] flex items-center gap-1">
                            {isBest && <Star className="w-3 h-3 text-customPrimary fill-customPrimary" />}
                            {rankedRoute.name} ({rankedRoute.type})
                          </span>
                          <span className="font-extrabold text-customText">
                            Suitability Score: {rankedRoute.overallScore} / 100
                          </span>
                        </div>
                        
                        <RecommendationScoreBreakdown
                          distanceScore={rankedRoute.distanceScore}
                          durationScore={rankedRoute.durationScore}
                          safetyScore={rankedRoute.safetyScore}
                          environmentalScore={rankedRoute.environmentalScore}
                          combinedRiskScore={rankedRoute.combinedRiskScore}
                          weights={decisionAnalysis.weights}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-[9px] text-customMuted text-right select-none pt-1">
          Analyzed at: {new Date(generatedAt).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartRecommendationCard;
