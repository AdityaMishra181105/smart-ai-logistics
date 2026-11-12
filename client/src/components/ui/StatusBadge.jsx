import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge = ({ type, value }) => {
  const { translateStatus } = useLanguage();
  if (!value) return null;
  const val = value.toUpperCase();

  let styles = 'bg-darkBgSecondary/60 border-darkBorder text-customMuted';

  if (type === 'priority') {
    switch (val) {
      case 'LOW':
        styles = 'bg-slate-500/10 border-slate-500/30 text-slate-400';
        break;
      case 'NORMAL':
      case 'MEDIUM':
        styles = 'bg-customPrimary/10 border-customPrimary/30 text-customPrimary';
        break;
      case 'HIGH':
        styles = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
        break;
      case 'URGENT':
      case 'CRITICAL':
        styles = 'bg-customDanger/10 border-customDanger/30 text-customDanger';
        break;
      default:
        break;
    }
  } else if (type === 'risk') {
    switch (val) {
      case 'LOW':
        styles = 'bg-customSuccess/10 border-customSuccess/30 text-customSuccess';
        break;
      case 'MODERATE':
      case 'MEDIUM':
        styles = 'bg-customWarning/10 border-customWarning/30 text-customWarning';
        break;
      case 'HIGH':
        styles = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
        break;
      case 'CRITICAL':
      case 'AVOID':
        styles = 'bg-customDanger/10 border-customDanger/30 text-customDanger';
        break;
      default:
        break;
    }
  } else if (type === 'status') {
    switch (val) {
      case 'PENDING':
      case 'ROUTE_PENDING':
        styles = 'bg-slate-500/10 border-slate-500/30 text-slate-400';
        break;
      case 'ASSIGNED':
      case 'ROUTE_SELECTED':
        styles = 'bg-customPrimary/10 border-customPrimary/30 text-customPrimary';
        break;
      case 'IN_TRANSIT':
        styles = 'bg-purple-500/10 border-purple-500/30 text-purple-400';
        break;
      case 'DELIVERED':
        styles = 'bg-customSuccess/10 border-customSuccess/30 text-customSuccess';
        break;
      case 'DELAYED':
        styles = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
        break;
      case 'BLOCKED':
      case 'AT_RISK':
        styles = 'bg-customDanger/10 border-customDanger/30 text-customDanger';
        break;
      default:
        break;
    }
  }

  return (
    <span className={`inline-flex items-center justify-center border px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase ${styles}`}>
      {translateStatus(val)}
    </span>
  );
};

export default StatusBadge;
