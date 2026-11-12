import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
  size = 'md'
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-darkBg/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`w-full bg-darkCard border border-darkBorder rounded-card shadow-2xl z-10 flex flex-col overflow-hidden max-h-[90vh] ${sizes[size]} ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-darkBorder px-6 py-4">
          <h3 className="text-lg font-semibold text-customText">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-customMuted hover:text-customText transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 text-sm text-customMuted">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-darkBorder px-6 py-4 bg-darkBgSecondary/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
