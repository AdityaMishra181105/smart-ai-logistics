import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Menu, Search, Bell, ChevronDown, User, LogOut, Info, RefreshCw, CheckCheck, Trash2, Mail, MailOpen,
  AlertCircle, Truck, FileText, Shield, Navigation, AlertTriangle, Clipboard, Globe, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import useSocket from '../../hooks/useSocket';
import AboutModal from './AboutModal';
import { 
  getUnreadCount, 
  getNotifications, 
  markRead, 
  markAllRead, 
  deleteNotification 
} from '../../services/notificationService';
import { getProfileImageUrl } from '../../utils/imageUtils';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'SHIPMENT': return Truck;
    case 'ORDER': return FileText;
    case 'VEHICLE': return Shield;
    case 'ROUTE': return Navigation;
    case 'ALERT': return AlertTriangle;
    case 'REPORT': return Clipboard;
    default: return AlertCircle;
  }
};

const TopNavbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, isHindi, t } = useLanguage();
  const { on: onSocketEvent } = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const bellRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNavNotifications = async () => {
    try {
      const countRes = await getUnreadCount();
      if (countRes.data?.success) {
        setUnreadCount(countRes.data.data.count);
      }

      const params = { limit: 10 };
      if (filterUnreadOnly) {
        params.isRead = false;
      }

      const listRes = await getNotifications(params);
      if (listRes.data?.success) {
        setNotifications(listRes.data.data.notifications);
      }
    } catch (err) {
      console.error('Failed to query notifications in TopNavbar:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNavNotifications();
      const interval = setInterval(fetchNavNotifications, 15000);
      
      const unSubNotif = onSocketEvent ? onSocketEvent('notification:new', () => {
        fetchNavNotifications();
      }) : null;

      const unSubAlertNew = onSocketEvent ? onSocketEvent('alert:new', () => {
        fetchNavNotifications();
      }) : null;

      const unSubAlertCreated = onSocketEvent ? onSocketEvent('alert:created', () => {
        fetchNavNotifications();
      }) : null;

      return () => {
        clearInterval(interval);
        if (unSubNotif) unSubNotif();
        if (unSubAlertNew) unSubAlertNew();
        if (unSubAlertCreated) unSubAlertCreated();
      };
    }
  }, [user?._id, location.pathname, filterUnreadOnly, onSocketEvent]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read in navbar:', err);
    }
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read in navbar:', err);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const target = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification in navbar:', err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await markRead(n._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
      }
      setNotificationsOpen(false);
      
      if (n.relatedEntityId) {
        switch (n.category) {
          case 'SHIPMENT':
            navigate(`/shipments/${n.relatedEntityId}`);
            break;
          case 'ORDER':
            navigate('/orders');
            break;
          case 'VEHICLE':
            navigate('/vehicles');
            break;
          case 'ROUTE':
            navigate('/routes');
            break;
          case 'ALERT':
            navigate('/alerts');
            break;
          default:
            break;
        }
      }
    } catch (err) {
      console.error('Failed to handle notification click:', err);
    }
  };

  const getPageTitle = (path) => {
    if (path.startsWith('/dashboard')) return t('logisticsControlCenter', 'Logistics Control Center');
    if (path.startsWith('/shipments/create')) return t('initiateNewShipment', 'Initiate New Shipment');
    if (path.startsWith('/shipments/')) return t('shipmentDetails', 'Shipment Details');
    if (path.startsWith('/shipments')) return t('shipmentRegistry', 'Shipment Registry');
    if (path.startsWith('/routes/analysis')) return t('aiRouteAnalyzer', 'AI Route Analyzer');
    if (path.startsWith('/routes')) return t('routesTransitPlanner', 'Routes Transit Planner');
    if (path.startsWith('/tracking')) return t('liveGpsTrackingMap', 'Live GPS Tracking Map');
    if (path.startsWith('/alerts')) return t('activeHazards', 'Active Hazards & Risk Alerts');
    if (path.startsWith('/analytics')) return t('performanceStatistics', 'Performance Statistics');
    if (path.startsWith('/users')) return t('accessControlDirectory', 'Access Control & Directory');
    if (path.startsWith('/settings')) return t('systemConfiguration', 'System Configuration');
    if (path.startsWith('/orders')) return t('ordersManagementRegistry', 'Orders Management Registry');
    if (path.startsWith('/vehicles')) return t('vehiclesRegistryDatabase', 'Vehicles Registry Database');
    if (path.startsWith('/reports')) return t('reportsOperationsAudits', 'Reports & Operations Audits');
    return t('logisticsPortal', 'Logistics Portal');
  };

  const title = getPageTitle(location.pathname);

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatRole = (roleName) => {
    if (!roleName) return t('roleAdmin', 'ADMIN');
    if (roleName === 'DRIVER') return t('roleDriver', 'DRIVER');
    if (roleName === 'NGO') return t('roleNgo', 'NGO');
    return roleName.replace('_', ' ');
  };

  return (
    <header className="h-16 bg-darkCard border-b border-darkBorder flex items-center justify-between px-3 sm:px-4 md:px-6 z-10 text-customText relative">
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-1.5 rounded-lg text-customMuted hover:text-customText hover:bg-darkBgSecondary shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-wider uppercase text-customText truncate max-w-[130px] sm:max-w-xs md:max-w-none">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
        <div className="hidden lg:flex items-center relative w-56">
          <Search className="w-3.5 h-3.5 text-customMuted absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchPlaceholder', 'Search shipments, vehicles...')}
            className="w-full bg-darkBgSecondary/80 text-xs text-customText placeholder-customMuted border border-darkBorder rounded-lg pl-9 pr-3 py-1.5 outline-none focus:border-customPrimary transition-colors"
          />
        </div>

        {/* English <-> Hindi Language Switcher Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-customMuted hover:text-customText hover:bg-darkBgSecondary border border-darkBorder transition-colors cursor-pointer text-xs font-semibold"
            title="Switch Language / भाषा बदलें"
            aria-label="Language selector"
          >
            <Globe className="w-4 h-4 text-customPrimary" />
            <span className="font-bold">{language === 'hi' ? 'हिंदी' : 'EN'}</span>
            <ChevronDown className="w-3 h-3 text-customMuted" />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-darkCard border border-darkBorder rounded-lg shadow-2xl py-1.5 z-50 text-xs font-semibold overflow-hidden">
              <button
                onClick={() => {
                  setLanguage('en');
                  setLangOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-darkBgSecondary text-left transition-colors cursor-pointer ${
                  language === 'en' ? 'text-customPrimary font-bold bg-customPrimary/10' : 'text-customMuted hover:text-customText'
                }`}
              >
                <span>English</span>
                {language === 'en' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setLanguage('hi');
                  setLangOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-darkBgSecondary text-left transition-colors cursor-pointer ${
                  language === 'hi' ? 'text-customPrimary font-bold bg-customPrimary/10' : 'text-customMuted hover:text-customText'
                }`}
              >
                <span>हिंदी</span>
                {language === 'hi' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown System */}
        <div className="relative" ref={bellRef}>
          <button 
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              fetchNavNotifications();
            }}
            className="p-2 rounded-lg text-customMuted hover:text-customText hover:bg-darkBgSecondary border border-darkBorder relative transition-colors cursor-pointer flex items-center justify-center"
            aria-label="View notifications"
            title={t('systemNotifications', 'System Notifications')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-4 h-4 bg-customPrimary text-darkBg text-[9px] font-black rounded-full flex items-center justify-center border border-darkCard shadow-md animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-[-50px] sm:right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 md:w-96 bg-darkCard border border-darkBorder rounded-xl shadow-2xl z-50 text-[11px] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-darkBorder bg-darkBgSecondary/40">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-customText">
                    {t('notifications', 'System Notifications')}
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-customPrimary/15 text-customPrimary border border-customPrimary/30">
                      {unreadCount} {t('unread', 'Unread')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-customPrimary hover:underline font-semibold cursor-pointer flex items-center gap-1"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3 h-3" />
                      {t('markAllRead', 'Mark all read')}
                    </button>
                  )}
                  <button
                    onClick={fetchNavNotifications}
                    className="p-1 rounded text-customMuted hover:text-customText hover:bg-darkBgSecondary cursor-pointer transition-colors"
                    title="Refresh notifications"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-darkBorder/40 bg-darkCard text-[10px] font-bold">
                <button
                  onClick={() => setFilterUnreadOnly(false)}
                  className={`flex-1 py-1.5 text-center cursor-pointer transition-colors border-b-2 ${
                    !filterUnreadOnly ? 'border-customPrimary text-customPrimary bg-customPrimary/5' : 'border-transparent text-customMuted hover:text-customText'
                  }`}
                >
                  {t('allNotifications', 'All Notifications')}
                </button>
                <button
                  onClick={() => setFilterUnreadOnly(true)}
                  className={`flex-1 py-1.5 text-center cursor-pointer transition-colors border-b-2 ${
                    filterUnreadOnly ? 'border-customPrimary text-customPrimary bg-customPrimary/5' : 'border-transparent text-customMuted hover:text-customText'
                  }`}
                >
                  {t('unread', 'Unread')} ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-darkBorder/40">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-customMuted italic">
                    {t('noNotifications', 'No system notifications found.')}
                  </div>
                ) : (
                  notifications.map(n => {
                    const Icon = getCategoryIcon(n.category);
                    return (
                      <div
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        className={`px-4 py-3 hover:bg-darkBgSecondary/30 cursor-pointer flex items-start justify-between gap-3 transition-colors ${
                          !n.isRead ? 'bg-customPrimary/5 border-l-2 border-customPrimary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                            !n.isRead ? 'bg-customPrimary/15 text-customPrimary' : 'bg-darkBgSecondary text-customMuted'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <div className="space-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-[11px] truncate ${!n.isRead ? 'text-customText' : 'text-customMuted'}`}>
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-customPrimary shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-customMuted line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 text-[8px] text-customMuted/70 font-mono pt-1">
                              <span className="font-semibold uppercase tracking-wider text-customPrimary/80">{n.category}</span>
                              <span>•</span>
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.isRead ? (
                            <button
                              onClick={(e) => handleMarkAsRead(e, n._id)}
                              className="p-1 rounded hover:bg-darkBgSecondary text-customMuted hover:text-customText transition-colors"
                              title="Mark read"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-customMuted/40 cursor-default" title="Read">
                              <MailOpen className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(e, n._id)}
                            className="p-1 rounded hover:bg-customDanger/10 text-customMuted hover:text-customDanger transition-colors"
                            title="Dismiss"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2 border-l border-darkBorder hover:opacity-90 outline-none text-left cursor-pointer"
          >
            {user?.profileImage ? (
              <img
                src={getProfileImageUrl(user.profileImage)}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-customPrimary/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-customPrimary/15 border border-customPrimary/30 text-customPrimary flex items-center justify-center font-bold text-xs">
                {getInitials(user?.name || 'User')}
              </div>
            )}
            <div className="hidden sm:block">
              <h4 className="text-[11px] font-bold max-w-[100px] truncate">{user?.name || 'Admin User'}</h4>
              <span className="text-[9px] text-customMuted uppercase font-medium">{formatRole(user?.role)}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-customMuted hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-darkCard border border-darkBorder rounded-lg shadow-2xl py-1.5 z-50 text-[11px] font-semibold">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setAboutOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-darkBgSecondary text-customMuted hover:text-customText text-left transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-customPrimary" />
                <span>{t('aboutPlatform', 'About Platform')}</span>
              </button>
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 hover:bg-darkBgSecondary text-customMuted hover:text-customText transition-colors"
              >
                <User className="w-3.5 h-3.5 text-customPrimary" />
                <span>{t('profile', 'Profile Details')}</span>
              </Link>
              <hr className="border-darkBorder my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-customDanger/10 text-customMuted hover:text-customDanger text-left transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('logout', 'Sign Out')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </header>
  );
};

export default TopNavbar;
