import React from 'react';

const LoadingSpinner = ({
  size = 'md',
  className = '',
  text = 'Loading...'
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-customPrimary border-r-transparent border-b-transparent border-l-transparent border-slate-700 ${sizes[size]}`}
      />
      {text && (
        <span className="text-xs font-medium tracking-wider text-customMuted uppercase">
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
