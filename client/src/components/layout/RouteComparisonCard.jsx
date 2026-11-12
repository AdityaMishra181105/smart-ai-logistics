import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Clock, Truck, ShieldAlert, Award, ChevronRight, Check } from 'lucide-react';
import EnvironmentalRiskPanel from './EnvironmentalRiskPanel';

const RouteComparisonCard = ({
  route,
  isSelected = false,
  isHighlighted = false,
  onHover = () => {},
  onSelect = null, // null means read-only
  selecting = false,
  envRiskData = null,
  loadingEnv = false,
  envError = false,
  recommendationLevel = null
}) => {
  const {
    routeId,
    name,
    type,
    distanceKm,
    estimatedDurationMinutes,
    roadCondition,
    riskScore,
    riskLevel,
    riskFactors
  } = route;

  const [expanded, setExpanded] = useState(false);

  // Format estimated time
  const formatDuration = (mins) => {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
  };

  // Color mappings for progress bar and risk labels
  const getRiskScoreColor = (score) => {
    if (score > 75) return 'bg-customDanger';
    if (score > 50) return 'bg-orange-500';
    if (score > 25) return 'bg-customWarning';
    return 'bg-customSuccess';
  };

  const getRiskLevelBadge = (level) => {
    switch (level) {
      case 'LOW':
        return <Badge variant="success">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="border-orange-500/30 text-orange-400 bg-orange-500/10">High Risk</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">Critical Risk</Badge>;
      default:
        return <Badge variant="neutral">{level}</Badge>;
    }
  };

  const getRecommendationBadge = (level) => {
    if (!level) return null;
    switch (level) {
      case 'RECOMMENDED':
        return (
          <Badge variant="success" className="border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-0.5 font-bold uppercase tracking-wider text-[8px] select-none">
            ★ Top Recommendation
          </Badge>
        );
      case 'VIABLE':
        return (
          <Badge variant="success" className="font-bold uppercase tracking-wider text-[8px] select-none">
            Viable
          </Badge>
        );
      case 'CAUTION':
        return (
          <Badge variant="warning" className="font-bold uppercase tracking-wider text-[8px] select-none">
            Caution
          </Badge>
        );
      case 'AVOID':
        return (
          <Badge variant="danger" className="font-bold uppercase tracking-wider text-[8px] select-none animate-pulse">
            Avoid Route
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`transition-all duration-200 border text-xs cursor-pointer ${
        isSelected
          ? 'border-customPrimary bg-customPrimary/5 ring-1 ring-customPrimary/20 shadow-lg'
          : recommendationLevel === 'RECOMMENDED'
          ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/10 shadow-md hover:border-amber-500'
          : isHighlighted
          ? 'border-customSecondary/75 bg-darkBgSecondary/60 shadow'
          : 'border-darkBorder bg-darkCard/80 hover:border-darkBorderHover'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Header Title */}
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-customMuted tracking-wider">
                {type} Route
              </span>
              {isSelected && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-customPrimary bg-customPrimary/10 border border-customPrimary/25 px-1.5 py-0.5 rounded">
                  <Check className="w-2.5 h-2.5" />
                  Active Selection
                </span>
              )}
              {getRecommendationBadge(recommendationLevel)}
            </div>
            <h4 className="font-bold text-customText text-xs leading-snug">{name}</h4>
          </div>
        </div>

        {/* Technical Metrics grid */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-darkBorder/40">
          <div className="space-y-0.5">
            <span className="text-[9px] text-customMuted uppercase font-semibold">Distance</span>
            <span className="font-bold text-customText block">{distanceKm.toFixed(1)} km</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-customMuted uppercase font-semibold flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> Duration
            </span>
            <span className="font-bold text-customText block">{formatDuration(estimatedDurationMinutes)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-customMuted uppercase font-semibold flex items-center gap-0.5">
              <Truck className="w-3 h-3" /> Road Class
            </span>
            <span className="font-bold text-customText block uppercase truncate" title={roadCondition}>
              {roadCondition}
            </span>
          </div>
        </div>

        {/* Geographic Risk Scores */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-customMuted font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-customPrimary" />
              Geographic Risk
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-customText">{riskScore} / 100</span>
              {getRiskLevelBadge(riskLevel)}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-darkBorder/40">
            <div className={`h-1.5 rounded-full ${getRiskScoreColor(riskScore)}`} style={{ width: `${riskScore}%` }} />
          </div>
        </div>

        {/* Environmental & Combined Risks Display */}
        {envRiskData ? (
          <div className="space-y-2.5 pt-2 border-t border-darkBorder/40">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-0.5">
                <span className="text-customMuted block font-medium">Environmental Risk</span>
                <span className="font-bold text-customText">
                  {envRiskData.environmentalRisk.level} ({envRiskData.environmentalRisk.score}/100)
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-customMuted block font-medium">Combined Risk</span>
                <span className={`font-bold block ${
                  envRiskData.combinedRisk.score > 75 ? 'text-customDanger' :
                  envRiskData.combinedRisk.score > 50 ? 'text-orange-400' :
                  envRiskData.combinedRisk.score > 25 ? 'text-customWarning' : 'text-customSuccess'
                }`}>
                  {envRiskData.combinedRisk.level} ({envRiskData.combinedRisk.score}/100)
                </span>
              </div>
            </div>

            {/* Expandable toggle */}
            <div className="pt-0.5">
              <button
                type="button"
                className="text-[10px] text-customPrimary hover:underline font-bold focus:outline-none flex items-center gap-0.5 select-none cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                <span>{expanded ? 'Hide Environmental Details' : 'View Environmental Details'}</span>
              </button>
              {expanded && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <EnvironmentalRiskPanel riskData={envRiskData} />
                </div>
              )}
            </div>
          </div>
        ) : loadingEnv ? (
          <div className="pt-2 border-t border-darkBorder/40 flex items-center gap-1.5 text-customMuted text-[10px] animate-pulse">
            <Clock className="w-3.5 h-3.5 animate-spin text-customWarning" />
            <span>Analyzing environmental conditions...</span>
          </div>
        ) : envError ? (
          <div className="pt-2 border-t border-darkBorder/40 text-customDanger text-[10px] font-semibold">
            Environmental analysis unavailable.
          </div>
        ) : (
          <div className="pt-2 border-t border-darkBorder/40 text-customMuted text-[10px] italic">
            Environmental analysis loading...
          </div>
        )}

        {/* Selection Trigger */}
        {onSelect && !isSelected && (
          <div className="pt-1.5 flex justify-end">
            <Button
              variant="primary"
              size="xs"
              className="w-full justify-center flex items-center gap-1 font-bold uppercase tracking-wider text-[9px] py-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              disabled={selecting}
            >
              <span>Select Route</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RouteComparisonCard;
