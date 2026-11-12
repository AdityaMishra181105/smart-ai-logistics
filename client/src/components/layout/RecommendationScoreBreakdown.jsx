import React from 'react';

const RecommendationScoreBreakdown = ({
  distanceScore = 0,
  durationScore = 0,
  safetyScore = 0,
  environmentalScore = 0,
  combinedRiskScore = 0,
  weights = {}
}) => {
  // Determine risk penalty based on combined risk score
  const getPenaltyValue = (score) => {
    if (score > 75) return -35;
    if (score > 50) return -15;
    if (score > 25) return -5;
    return 0;
  };

  const penalty = getPenaltyValue(combinedRiskScore);

  const getProgressBarColor = (score) => {
    if (score > 75) return 'bg-customSuccess';
    if (score > 50) return 'bg-customPrimary';
    if (score > 25) return 'bg-customWarning';
    return 'bg-customDanger';
  };

  return (
    <div className="space-y-2.5 text-[10px] text-customMuted">
      {/* Distance Score */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-medium text-customMuted">Distance Efficiency (w: {weights.distance || 0}%)</span>
          <span className="font-bold text-customText">{distanceScore} / 100</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-1 rounded-full ${getProgressBarColor(distanceScore)}`}
            style={{ width: `${distanceScore}%` }}
            aria-label="Distance Efficiency Score"
          />
        </div>
      </div>

      {/* Duration Score */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-medium text-customMuted">Time/Duration Efficiency (w: {weights.duration || 0}%)</span>
          <span className="font-bold text-customText">{durationScore} / 100</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-1 rounded-full ${getProgressBarColor(durationScore)}`}
            style={{ width: `${durationScore}%` }}
            aria-label="Duration Efficiency Score"
          />
        </div>
      </div>

      {/* Safety Score */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-medium text-customMuted">Safety Score (w: {weights.safety || 0}%)</span>
          <span className="font-bold text-customText">{safetyScore} / 100</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-1 rounded-full ${getProgressBarColor(safetyScore)}`}
            style={{ width: `${safetyScore}%` }}
            aria-label="Safety Score"
          />
        </div>
      </div>

      {/* Environmental Score */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-medium text-customMuted">Environmental Index (w: {weights.environmental || 0}%)</span>
          <span className="font-bold text-customText">{environmentalScore} / 100</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-1 rounded-full ${getProgressBarColor(environmentalScore)}`}
            style={{ width: `${environmentalScore}%` }}
            aria-label="Environmental Conditions Score"
          />
        </div>
      </div>

      {/* Hazard Penalty indicator */}
      {penalty < 0 && (
        <div className="flex items-center justify-between p-1.5 bg-customDanger/10 border border-customDanger/25 rounded-md text-customDanger font-bold select-none text-[9px] mt-1.5">
          <span>Active Hazard Risk Penalty Applied:</span>
          <span>{penalty} Points</span>
        </div>
      )}
    </div>
  );
};

export default RecommendationScoreBreakdown;
