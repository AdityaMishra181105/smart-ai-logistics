import React from 'react';
import Card from '../ui/Card';

const DashboardMetricCard = ({ title, value, subtitle, icon: Icon, status, trend }) => {
  // Border coloring based on severity status
  const getBorderColor = (st) => {
    switch (st) {
      case 'danger':
        return 'border-customDanger/40';
      case 'warning':
        return 'border-customWarning/40';
      case 'success':
        return 'border-customSuccess/40';
      case 'info':
        return 'border-customPrimary/40';
      default:
        return 'border-darkBorder';
    }
  };

  return (
    <Card className={`bg-darkCard/80 border p-4.5 flex flex-col justify-between transition-all hover:border-darkBorderActive select-none ${getBorderColor(status)}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] text-customMuted uppercase font-bold tracking-wider block">
            {title}
          </span>
          <span className="text-2xl font-black text-customText leading-none block">
            {value}
          </span>
        </div>
        {Icon && (
          <div className="p-2 bg-darkBgSecondary/55 border border-darkBorder rounded-lg shrink-0">
            <Icon className="w-5 h-5 text-customPrimary" />
          </div>
        )}
      </div>
      
      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="text-customMuted font-medium truncate">
          {subtitle}
        </span>
        {trend && (
          <span className="font-semibold text-customSuccess">
            {trend}
          </span>
        )}
      </div>
    </Card>
  );
};

export default DashboardMetricCard;
