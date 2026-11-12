import React from 'react';

const Input = React.forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-customMuted tracking-wider uppercase">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        id={inputId}
        placeholder={placeholder}
        className={`w-full bg-darkBgSecondary text-customText placeholder-customMuted border rounded-input px-3.5 py-2 text-sm transition-colors duration-200 outline-none focus:border-customPrimary ${
          error ? 'border-customDanger' : 'border-darkBorder'
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-customDanger font-medium mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
