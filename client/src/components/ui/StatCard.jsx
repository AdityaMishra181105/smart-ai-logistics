import React from 'react';
import { Card } from './Card';

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendType = 'neutral', // 'success', 'warning', 'danger', 'neutral'
  className = ''
}) => {
  const trendColors = {
    success: 'text-customSuccess',
    warning: 'text-customWarning',
    danger: 'text-customDanger',
    neutral: 'text-customMuted'
  };

  return (
    <Card className={`relative overflow-hidden p-4 sm:p-5 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-customMuted uppercase tracking-wider block">
            {title}
          </span>
          <h3 className="text-2xl font-bold text-customText mt-2 tracking-tight">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className="p-2 bg-darkBgSecondary border border-darkBorder rounded-lg text-customPrimary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(description || trend) && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {trend && (
            <span className={`font-semibold ${trendColors[trendType]}`}>
              {trend}
            </span>
          )}
          {description && (
            <span className="text-customMuted">
              {description}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
