import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title = 'No records found',
  description = 'There is no data available to show at this moment.',
  icon: Icon = PackageOpen,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-darkBorder rounded-card bg-darkCard/50 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-darkBgSecondary flex items-center justify-center text-customMuted mb-4 border border-darkBorder">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-customText mb-1">{title}</h4>
      <p className="text-sm text-customMuted max-w-sm mb-5">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
