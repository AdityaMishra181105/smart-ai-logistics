import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { navigationConfig } from '../../constants/navigation';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getSectionTitle = (name) => {
    const keyMap = {
      'OVERVIEW': 'overviewSection',
      'OPERATIONS': 'operationsSection',
      'INTELLIGENCE': 'intelligenceSection'
    };
    const key = keyMap[name];
    return key ? t(key, name) : name;
  };

  const getNavTitle = (name) => {
    const keyMap = {
      'Dashboard': 'dashboard',
      'Orders': 'orders',
      'Shipments': 'shipments',
      'Routes': 'routes',
      'Vehicles': 'vehicles',
      'Alerts': 'alerts',
      'Reports': 'reports',
      'Analytics': 'analytics',
      'AI Assistant': 'aiAssistant',
      'Profile': 'profile',
      'Live Tracking': 'liveTracking',
      'Route Analysis': 'routeAnalysis',
      'Users': 'users'
    };
    const key = keyMap[name];
    return key ? t(key, name) : name;
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
      isActive
        ? 'bg-customPrimary/15 text-customPrimary border-l-3 border-customPrimary rounded-l-none pl-3.5 neon-text-purple shadow-[inset_0_0_10px_rgba(168,85,247,0.05)]'
        : 'text-customMuted hover:text-customText hover:bg-darkCard/30 hover:border-l-3 hover:border-darkBorder pl-4'
    }`;

  // Helper to format role names cleanly
  const formatRole = (roleName) => {
    if (!roleName) return t('roleAdmin', 'ADMIN');
    if (roleName === 'DRIVER') return t('roleDriver', 'DRIVER');
    if (roleName === 'NGO') return t('roleNgo', 'NGO');
    return roleName.replace('_', ' ');
  };

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#09091b]/95 border-r border-darkBorder/40 w-60 text-customText backdrop-blur-md">
      
      {/* Brand Logo & Name */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-darkBorder/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-customPrimary/10 border border-customPrimary/30 rounded-xl text-customPrimary shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-extrabold text-[12px] tracking-wider uppercase leading-none neon-text-purple">Smart Logistics</h2>
            <span className="text-[8px] text-customMuted font-black uppercase tracking-widest block mt-1">{t('controlPanel', 'Control Panel')}</span>
          </div>
        </div>
        {/* Mobile close button */}
        <button 
          onClick={onClose} 
          className="md:hidden text-customMuted hover:text-customText"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-5 space-y-4 overflow-y-auto">
        {Object.entries(navigationConfig).map(([sectionName, items]) => {
          const allowedItems = items.filter(
            (item) => !user || item.roles.includes(user.role)
          );
          if (allowedItems.length === 0) return null;

          return (
            <div key={sectionName} className="space-y-1.5">
              <span className="text-[8px] text-customMuted uppercase font-black tracking-widest block px-4 mb-2 opacity-50 select-none">
                {getSectionTitle(sectionName)}
              </span>
              {allowedItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 768) onClose(); // Auto close on click in mobile
                  }}
                  className={navLinkClass}
                >
                  <item.icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span>{getNavTitle(item.name)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User Profile Info & Logout */}
      <div className="p-4 border-t border-darkBorder/30 bg-[#070715]/95">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-darkCard border border-darkBorder/40 flex items-center justify-center font-black text-xs text-customPrimary shadow-[0_0_10px_rgba(168,85,247,0.1)]">
            {getInitials(user?.name || 'Current User')}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-[11px] font-black text-customText truncate leading-tight" title={user?.name || 'Current User'}>
              {user?.name || 'Current User'}
            </h4>
            <span className="text-[8px] text-customMuted uppercase font-extrabold tracking-wider mt-0.5 block">
              {formatRole(user?.role || 'LOGISTICS_OPERATOR')}
            </span>
          </div>
        </div>
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-darkBgSecondary/50 hover:bg-customDanger/10 border border-darkBorder/40 hover:border-customDanger/30 text-customMuted hover:text-customDanger rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>{t('signOut', 'Sign Out')}</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-customPrimary hover:bg-customPrimary/90 text-darkBg rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300"
          >
            <span>{t('signIn', 'Sign In')}</span>
          </NavLink>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Permanent drawer */}
      <aside className="hidden md:flex md:flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar: Off-canvas overlay drawer */}
      <div className={`md:hidden fixed inset-0 z-40 flex ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div
          className={`fixed inset-0 bg-darkBg/60 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        {/* Drawer content */}
        <div
          className={`relative flex flex-col max-w-xs w-full bg-darkCard transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
