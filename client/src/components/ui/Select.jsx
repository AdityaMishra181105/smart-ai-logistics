import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const Select = React.forwardRef(({
  label,
  options = [],
  error,
  className = '',
  id,
  placeholder,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  let t = (k, f) => f;
  try {
    const lang = useLanguage();
    if (lang && lang.t) t = lang.t;
  } catch (e) {}

  const effectivePlaceholder = placeholder !== undefined ? placeholder : t('selectAnOption', 'Select an option');

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-customMuted tracking-wider uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none bg-darkBgSecondary text-customText border rounded-input px-3.5 py-2 text-sm transition-colors duration-200 outline-none focus:border-customPrimary pr-10 cursor-pointer ${
            error ? 'border-customDanger' : 'border-darkBorder'
          } ${className}`}
          {...props}
        >
          {effectivePlaceholder && <option value="" disabled>{effectivePlaceholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-darkBgSecondary text-customText">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-customMuted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-xs text-customDanger font-medium mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
