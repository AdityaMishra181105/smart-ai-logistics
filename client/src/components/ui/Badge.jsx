import React from 'react';

const Badge = ({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border';
  
  const variants = {
    success: 'bg-customSuccess/10 text-customSuccess border-customSuccess/30',
    warning: 'bg-customWarning/10 text-customWarning border-customWarning/30',
    danger: 'bg-customDanger/10 text-customDanger border-customDanger/30',
    info: 'bg-customSecondary/10 text-customSecondary border-customSecondary/30',
    primary: 'bg-customPrimary/10 text-customPrimary border-customPrimary/30',
    neutral: 'bg-darkBgSecondary text-customMuted border-darkBorder'
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
