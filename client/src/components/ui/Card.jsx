import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-darkCard/50 border border-darkBorder/40 rounded-card shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:border-customPrimary/35 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`border-b border-darkBorder/30 pb-4 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3
      className={`text-[12px] font-black uppercase tracking-wider text-customText ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`border-t border-darkBorder/30 pt-4 mt-4 flex items-center justify-end gap-2 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
