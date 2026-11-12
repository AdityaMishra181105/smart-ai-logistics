import React from 'react';

const PageHeader = ({
  title,
  description,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-darkBorder ${className}`}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-customText">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-customMuted mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
