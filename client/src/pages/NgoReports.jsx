import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, RefreshCw, Download, Filter, Search, Calendar,
  Truck, Shield, AlertTriangle, CheckCircle2, Clock, MapPin, Navigation,
  Building, ChevronRight, ArrowRight, Activity, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import api from '../services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { useLanguage } from '../context/LanguageContext';

const NgoReports = () => {
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity, translateAlertType, translateAlertDescription, isHindi, language } = useLanguage();
  const { on: onSocketEvent } = useSocket();

  // State
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Period
  const [timeRange, setTimeRange] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const kmUnit = t('kmUnit', 'Km');
  const minsUnit = t('minsUnit', 'mins');

  // Fetch Report Data
  const fetchNgoReport = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/reports/ngo?range=${timeRange}`;
      if (timeRange === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setError(t('failedToLoadReport', 'Failed to load report'));
      }
    } catch (err) {
      console.error('Error fetching NGO report:', err);
      setError(err.response?.data?.message || t('failedToLoadReport', 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoReport();
  }, [timeRange]);

  // Real-time socket sync
  useEffect(() => {
    if (!onSocketEvent) return;

    const unSubShipment = onSocketEvent('shipment:updated', () => fetchNgoReport());
    const unSubAlert = onSocketEvent('alert:new', () => fetchNgoReport());
    const unSubLocation = onSocketEvent('location:update', () => fetchNgoReport());

    return () => {
      if (unSubShipment) unSubShipment();
      if (unSubAlert) unSubAlert();
      if (unSubLocation) unSubLocation();
    };
  }, [onSocketEvent]);

  // Derived Summary & Collections
  const summary = reportData?.summary || {};
  const orderPerf = reportData?.orderPerformance || {};
  const deliveryPerf = reportData?.deliveryPerformance || {};
  const alertSum = reportData?.alertSummary || {};
  const activeShipment = reportData?.activeShipment || null;

  const rawOrders = useMemo(() => reportData?.myOrders || [], [reportData]);
  const rawShipments = useMemo(() => reportData?.shipments || [], [reportData]);
  const rawRoutes = useMemo(() => reportData?.routes || [], [reportData]);
  const rawAlerts = useMemo(() => reportData?.alerts || [], [reportData]);

  // Filtered Collections
  const filteredOrders = useMemo(() => {
    return rawOrders.filter(order => {
      const matchesSearch = 
        !searchTerm ||
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.itemDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.linkedShipmentId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rawOrders, searchTerm, statusFilter]);

  const filteredShipments = useMemo(() => {
    return rawShipments.filter(shp => {
      const matchesSearch = 
        !searchTerm ||
        shp.shipmentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shp.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shp.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shp.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shp.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shp.vehicleReg?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || shp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rawShipments, searchTerm, statusFilter]);

  // Formatting Helpers
  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatTime = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getStatusVariant = (st) => {
    switch (st) {
      case 'DELIVERED':
      case 'COMPLETED': return 'success';
      case 'IN_TRANSIT':
      case 'IN_PROGRESS': return 'warning';
      case 'PENDING':
      case 'APPROVED': return 'info';
      case 'DELAYED':
      case 'AT_RISK': return 'danger';
      case 'CANCELLED': return 'secondary';
      default: return 'neutral';
    }
  };

  const getSeverityVariant = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'neutral';
      default: return 'info';
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!rawOrders.length && !rawShipments.length) {
      setError(isHindi ? 'निर्यात के लिए कोई डेटा उपलब्ध नहीं है।' : 'No data available to export.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += isHindi ? "स्मार्ट लॉजिस्टिक्स - NGO संचालन रिपोर्ट\n" : "SMART LOGISTICS - NGO OPERATIONS REPORT\n";
    csvContent += `${isHindi ? 'संगठन' : 'Organization'}: ${user?.organization || user?.name || 'NGO'}\n`;
    csvContent += `${isHindi ? 'बनाने की तारीख' : 'Generated Date'}: ${new Date().toLocaleString()}\n\n`;

    csvContent += isHindi ? "मेरे ऑर्डर\n" : "MY ORDERS\n";
    csvContent += isHindi 
      ? "ऑर्डर आईडी,कार्गो,मात्रा,पिकअप स्थान,गंतव्य,स्थिति,लिंक किया गया शिपमेंट,बनाने की तारीख\n"
      : "Order ID,Cargo,Quantity,Pickup Location,Destination,Status,Linked Shipment,Created Date\n";
    rawOrders.forEach(o => {
      csvContent += `"${o.orderId}","${o.itemDescription}","${o.quantity}","${o.pickupLocation}","${o.deliveryLocation}","${translateStatus(o.status)}","${o.linkedShipmentId}","${formatDate(o.createdAt)}"\n`;
    });

    csvContent += isHindi ? "\nलिंक किए गए शिपमेंट\n" : "\nLINKED SHIPMENTS\n";
    csvContent += isHindi 
      ? "शिपमेंट आईडी,ऑर्डर आईडी,प्रारंभिक स्थान,गंतव्य,चयनित रूट,ड्राइवर,वाहन,स्थिति,शेष दूरी (किमी),अनुमानित समय (मिनट)\n"
      : "Shipment ID,Order ID,Origin,Destination,Selected Route,Driver,Vehicle,Status,Remaining Dist (Km),ETA (Min)\n";
    rawShipments.forEach(s => {
      csvContent += `"${s.shipmentId}","${s.orderId}","${s.origin}","${s.destination}","${s.selectedRoute}","${s.driverName}","${s.vehicleReg}","${translateStatus(s.status)}","${s.remainingDistanceKm}","${s.etaMinutes}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NGO_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg(t('reportDownloadedSuccess', 'CSV Report downloaded successfully.'));
  };

  // Export PDF Handler
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Title & Header
      doc.setFillColor(15, 15, 35);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(168, 85, 247);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SMART LOGISTICS', 14, 15);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(isHindi ? 'NGO संचालन और प्रदर्शन रिपोर्ट' : 'NGO OPERATIONS & PERFORMANCE REPORT', 14, 23);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 200);
      doc.text(`${isHindi ? 'संगठन' : 'Organization'}: ${user?.organization || user?.name || 'NGO'} | ${isHindi ? 'दिनांक' : 'Date'}: ${new Date().toLocaleDateString()}`, 14, 30);

      // Section 1: Summary Statistics
      doc.setTextColor(30, 30, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(isHindi ? '1. परिचालन सारांश' : '1. OPERATIONAL SUMMARY', 14, 46);

      const summaryTableData = [
        [t('totalOrders', 'Total Orders'), String(summary.totalOrders ?? 0), t('totalShipments', 'Total Shipments'), String(summary.totalShipments ?? 0)],
        [t('activeOrders', 'Active Orders'), String(summary.activeOrders ?? 0), t('activeShipments', 'Active Shipments'), String(summary.activeShipments ?? 0)],
        [t('completedOrders', 'Completed Orders'), String(summary.completedOrders ?? 0), t('deliveredShipments', 'Delivered Shipments'), String(summary.deliveredShipments ?? 0)],
        [t('activeAlerts', 'Active Alerts'), String(summary.activeAlerts ?? 0), t('completionRate', 'Completion Rate'), `${summary.completionRate ?? 0}%`]
      ];

      doc.autoTable({
        startY: 50,
        head: [[isHindi ? 'मेट्रिक' : 'Metric', isHindi ? 'मान' : 'Value', isHindi ? 'मेट्रिक' : 'Metric', isHindi ? 'मान' : 'Value']],
        body: summaryTableData,
        theme: 'striped',
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5 }
      });

      // Section 2: My Orders Table
      const finalY1 = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(isHindi ? '2. मेरे ऑर्डर की रजिस्ट्री' : '2. MY ORDERS REGISTRY', 14, finalY1);

      const ordersTableData = rawOrders.map(o => [
        o.orderId,
        o.itemDescription,
        `${o.pickupLocation} -> ${o.deliveryLocation}`,
        translateStatus(o.status),
        o.linkedShipmentId,
        formatDate(o.createdAt)
      ]);

      doc.autoTable({
        startY: finalY1 + 4,
        head: [[
          t('orderId', 'Order ID'),
          t('cargoDescription', 'Cargo Description'),
          `${t('pickupLocation', 'Pickup')} -> ${t('destination', 'Destination')}`,
          t('status', 'Status'),
          t('shipmentId', 'Shipment'),
          t('createdDate', 'Created Date')
        ]],
        body: ordersTableData.length > 0 ? ordersTableData : [[isHindi ? 'इस अवधि के लिए कोई ऑर्डर नहीं मिला' : 'No orders recorded for this period', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 70], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      // Section 3: Linked Shipments & Tracking
      const finalY2 = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(isHindi ? '3. लिंक किए गए शिपमेंट की ट्रैकिंग' : '3. LINKED SHIPMENT TRACKING', 14, finalY2);

      const shipmentsTableData = rawShipments.map(s => [
        s.shipmentId,
        s.orderId,
        `${s.origin} -> ${s.destination}`,
        s.selectedRoute,
        s.driverName,
        s.vehicleReg,
        translateStatus(s.status)
      ]);

      doc.autoTable({
        startY: finalY2 + 4,
        head: [[
          t('shipmentId', 'Shipment ID'),
          t('orderId', 'Order ID'),
          `${t('origin', 'Origin')} -> ${t('destination', 'Destination')}`,
          t('selectedRoute', 'Route Corridor'),
          t('assignedDriver', 'Driver'),
          t('assignedVehicle', 'Vehicle'),
          t('status', 'Status')
        ]],
        body: shipmentsTableData.length > 0 ? shipmentsTableData : [[isHindi ? 'इस अवधि के लिए कोई शिपमेंट नहीं मिला' : 'No shipments found for this period', '', '', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 70], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 140);
        doc.text(`Smart Logistics Platform - NGO Report | Page ${i} of ${pageCount}`, 14, 287);
      }

      doc.save(`NGO_Operations_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setSuccessMsg(t('reportDownloadedSuccess', 'PDF Report generated and downloaded successfully.'));
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError(isHindi ? 'PDF रिपोर्ट बनाने में विफल।' : 'Failed to generate PDF report.');
    }
  };

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-darkCard border border-darkBorder p-5 rounded-2xl shadow-xl">
        <PageHeader
          title={t('ngoReportsHeader', 'NGO Operations & Performance Report')}
          description={t('ngoReportsSub', 'Track your orders, shipments, delivery progress, route status and safety alerts.')}
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNgoReport}
            disabled={loading}
            className="font-bold text-[10px] uppercase flex items-center gap-1.5 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('syncData', 'Sync Data')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading}
            className="font-bold text-[10px] uppercase flex items-center gap-1.5 py-2"
          >
            <Download className="w-3.5 h-3.5 text-customSuccess" />
            <span>{t('exportCsv', 'Export CSV')}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            disabled={loading}
            className="font-bold text-[10px] uppercase flex items-center gap-1.5 py-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('downloadPdfReport', 'Download PDF Report')}</span>
          </Button>
        </div>
      </div>

      {/* MESSAGES */}
      {successMsg && (
        <div className="p-3.5 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-xl font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-customSuccess hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-xl font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-customDanger hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* REPORTING PERIOD SELECTOR */}
      <Card className="bg-darkCard border border-darkBorder">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-customPrimary" />
            <span className="font-bold uppercase text-[11px] text-customText tracking-wider">{t('reportingPeriod', 'Reporting Period:')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: t('today', 'Today') },
              { id: '7days', label: t('last7Days', 'Last 7 Days') },
              { id: '30days', label: t('last30Days', 'Last 30 Days') },
              { id: 'thisMonth', label: t('thisMonth', 'This Month') },
              { id: 'custom', label: t('custom', 'Custom') }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setTimeRange(period.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${
                  timeRange === period.id
                    ? 'bg-customPrimary text-darkBg shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-darkBgSecondary/60 border border-darkBorder text-customMuted hover:text-customText'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-darkBorder">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded-lg text-[10px] outline-none"
              />
              <span className="text-customMuted">{t('to', 'to')}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded-lg text-[10px] outline-none"
              />
              <Button variant="primary" size="sm" onClick={fetchNgoReport} className="text-[10px] font-bold uppercase py-1">
                {t('apply', 'Apply')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NGO SUMMARY METRIC CARDS (8 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('totalOrders', 'Total Orders')}</span>
            <strong className="text-xl font-black text-customText block">{summary.totalOrders ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('activeOrders', 'Active Orders')}</span>
            <strong className="text-xl font-black text-customWarning block">{summary.activeOrders ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('completedOrders', 'Completed Orders')}</span>
            <strong className="text-xl font-black text-customSuccess block">{summary.completedOrders ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('totalShipments', 'Total Shipments')}</span>
            <strong className="text-xl font-black text-customPrimary block">{summary.totalShipments ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('activeShipments', 'Active Shipments')}</span>
            <strong className="text-xl font-black text-purple-400 block">{summary.activeShipments ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('deliveredShipments', 'Delivered Shipments')}</span>
            <strong className="text-xl font-black text-customSuccess block">{summary.deliveredShipments ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('activeAlerts', 'Active Alerts')}</span>
            <strong className="text-xl font-black text-customDanger block">{summary.activeAlerts ?? 0}</strong>
          </CardContent>
        </Card>

        <Card className="bg-darkCard border border-darkBorder">
          <CardContent className="p-3 space-y-1">
            <span className="text-[9px] text-customMuted font-bold uppercase block">{t('completionRate', 'Completion Rate')}</span>
            <strong className="text-xl font-black text-customPrimary block">{summary.completionRate ?? 0}%</strong>
          </CardContent>
        </Card>
      </div>

      {/* TAB NAVIGATION & SEARCH/FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-darkBorder pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: t('overview', 'Overview') },
            { id: 'ORDERS', label: t('orders', 'Orders') },
            { id: 'SHIPMENTS', label: t('shipments', 'Shipments') },
            { id: 'ROUTES', label: t('routes', 'Routes') },
            { id: 'ALERTS', label: t('alerts', 'Alerts') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-bold text-[11px] uppercase tracking-wider rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-customPrimary text-customPrimary bg-customPrimary/10'
                  : 'border-transparent text-customMuted hover:text-customText'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 md:w-64">
            <Search className="w-3.5 h-3.5 text-customMuted absolute left-2.5 top-2.5 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder', 'Search shipments, vehicles...')}
              className="pl-8 text-xs py-1.5"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-darkCard border border-darkBorder text-customText rounded-lg px-2.5 py-1.5 text-xs outline-none"
          >
            <option value="ALL">{t('allStatuses', 'All Statuses')}</option>
            <option value="PENDING">{t('pending', 'Pending')}</option>
            <option value="IN_PROGRESS">{t('inProgress', 'In Progress')}</option>
            <option value="COMPLETED">{t('completed', 'Completed')}</option>
            <option value="IN_TRANSIT">{t('inTransit', 'In Transit')}</option>
            <option value="DELIVERED">{t('delivered', 'Delivered')}</option>
            <option value="CANCELLED">{t('cancelled', 'Cancelled')}</option>
          </select>
        </div>
      </div>

      {/* MAIN TAB CONTENT */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="md" text={t('fetchingData', 'Fetching Data...')} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* CURRENT ACTIVE SHIPMENT SPOTLIGHT */}
              <Card className="bg-darkCard border border-darkBorder">
                <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                    <Truck className="w-4 h-4 text-customPrimary" />
                    {t('currentActiveShipment', 'Current Active Shipment')}
                  </CardTitle>
                  {activeShipment ? (
                    <Badge variant={getStatusVariant(activeShipment.status)}>
                      {translateStatus(activeShipment.status)}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">{t('noActiveShipment', 'No Active Shipment')}</Badge>
                  )}
                </CardHeader>

                <CardContent className="p-4">
                  {activeShipment ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-3 bg-darkBgSecondary/40 rounded-xl border border-darkBorder/40 space-y-1">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('shipmentRefOrderId', 'SHIPMENT REF / ORDER ID')}</span>
                        <strong className="text-sm font-extrabold text-customText font-mono block">{activeShipment.shipmentId}</strong>
                        <span className="text-[10px] text-customMuted font-mono">{t('orderId', 'Order ID')}: {activeShipment.orderId}</span>
                      </div>

                      <div className="p-3 bg-darkBgSecondary/40 rounded-xl border border-darkBorder/40 space-y-1">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('originNodeFrom', 'ORIGIN NODE (FROM)')} → {t('destinationNodeTo', 'DESTINATION NODE (TO)')}</span>
                        <strong className="text-xs font-bold text-customText flex items-center gap-1.5 truncate">
                          <span>{activeShipment.origin}</span>
                          <ArrowRight className="w-3 h-3 text-customPrimary shrink-0" />
                          <span className="text-customSuccess">{activeShipment.destination}</span>
                        </strong>
                        <span className="text-[10px] text-customMuted block truncate">{t('selectedRoute', 'Selected Route')}: {activeShipment.selectedRoute}</span>
                      </div>

                      <div className="p-3 bg-darkBgSecondary/40 rounded-xl border border-darkBorder/40 space-y-1">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('assignedDriver', 'ASSIGNED DRIVER')}</span>
                        <strong className="text-xs font-bold text-customText block">{activeShipment.driverName}</strong>
                        <span className="text-[10px] text-customMuted font-mono block">{t('assignedVehicle', 'ASSIGNED VEHICLE')}: {activeShipment.vehicleReg}</span>
                      </div>

                      <div className="p-3 bg-darkBgSecondary/40 rounded-xl border border-darkBorder/40 space-y-1">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('distanceAndEta', 'DISTANCE & ESTIMATED ARRIVAL TIME')}</span>
                        <strong className="text-sm font-extrabold text-customPrimary block">{activeShipment.remainingDistanceKm} {kmUnit}</strong>
                        <span className="text-[10px] text-customSuccess font-mono block">{t('etaToPickup', 'ETA TO PICKUP')}: {activeShipment.estimatedTimeRemainingMin} {minsUnit}</span>
                      </div>

                      {/* Live GPS Telemetry Status */}
                      <div className="lg:col-span-4 p-3 bg-darkBgSecondary/60 rounded-xl border border-darkBorder/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-customSuccess animate-pulse" />
                          <span className="font-bold text-customText uppercase text-[10px]">{t('liveGpsSignalStatus', 'LIVE GPS SIGNAL STATUS')}:</span>
                          <span className="font-mono text-customSuccess font-semibold">
                            {activeShipment.liveLocation?.latitude 
                              ? `${isHindi ? 'सक्रिय' : 'ACTIVE'} (${activeShipment.liveLocation.latitude.toFixed(4)}, ${activeShipment.liveLocation.longitude.toFixed(4)})`
                              : t('noDataAvailable', 'No Data Available')}
                          </span>
                        </div>
                        <span className="text-[10px] text-customMuted font-mono">
                          {activeShipment.liveLocation?.timestamp ? `${t('lastUpdated', 'Last Updated')}: ${new Date(activeShipment.liveLocation.timestamp).toLocaleTimeString()}` : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-customMuted font-bold uppercase text-[10px]">
                      {t('noActiveInTransitShipments', 'NO ACTIVE IN-TRANSIT SHIPMENTS FOUND FOR THIS NGO ACCOUNT.')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* TWO COLUMN PERFORMANCE BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ORDER PERFORMANCE CARD */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="pb-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                      <FileText className="w-4 h-4 text-customPrimary" />
                      {t('orderStatusConversion', 'Order Status & Conversion')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('pendingOrders', 'Pending Orders')}</span>
                        <strong className="text-lg font-bold text-customWarning">{orderPerf.pendingOrders ?? 0}</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('inProgressOrders', 'In-Progress Orders')}</span>
                        <strong className="text-lg font-bold text-customPrimary">{orderPerf.inProgressOrders ?? 0}</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('completedOrders', 'Completed Orders')}</span>
                        <strong className="text-lg font-bold text-customSuccess">{orderPerf.completedOrders ?? 0}</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('cancelledOrders', 'Cancelled Orders')}</span>
                        <strong className="text-lg font-bold text-customMuted">{orderPerf.cancelledOrders ?? 0}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-darkBgSecondary/50 rounded-lg border border-darkBorder/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-customMuted font-bold uppercase block">{t('orderConversionRate', 'Order Conversion Rate')}</span>
                        <span className="font-semibold text-customText">
                          {orderPerf.convertedToShipmentsCount ?? 0} | {orderPerf.pendingConversionCount ?? 0} {t('pending', 'Pending')}
                        </span>
                      </div>
                      <Badge variant="info">
                        {summary.totalOrders > 0 ? `${Math.round(((orderPerf.convertedToShipmentsCount ?? 0) / summary.totalOrders) * 100)}%` : '0%'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* DELIVERY PERFORMANCE CARD */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="pb-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-customSuccess" />
                      {t('deliveryPerformanceMetrics', 'Delivery Performance Metrics')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('deliveredShipments', 'Delivered Shipments')}</span>
                        <strong className="text-lg font-bold text-customSuccess">{deliveryPerf.deliveredShipments ?? 0}</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('delayedShipments', 'Delayed Shipments')}</span>
                        <strong className="text-lg font-bold text-customDanger">{deliveryPerf.delayedShipments ?? 0}</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('onTimeSuccessRate', 'On-Time Success Rate')}</span>
                        <strong className="text-lg font-bold text-customPrimary">{deliveryPerf.onTimeDeliveryRate ?? 100}%</strong>
                      </div>
                      <div className="p-3 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40">
                        <span className="text-[9px] text-customMuted font-bold uppercase block">{t('averageDeliveryTime', 'Average Delivery Time')}</span>
                        <strong className="text-lg font-bold text-customText">
                          {deliveryPerf.averageDeliveryTimeMinutes ? `${deliveryPerf.averageDeliveryTimeMinutes} ${minsUnit}` : 'N/A'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 bg-darkBgSecondary/50 rounded-lg border border-darkBorder/40 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-customMuted font-bold uppercase block">{t('totalShipments', 'Total Shipments')}</span>
                        <span className="font-semibold text-customText">{deliveryPerf.totalShipments ?? 0} {t('shipments', 'Shipments')}</span>
                      </div>
                      <Badge variant="success">{t('verified', 'Verified')}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === 'ORDERS' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                  <FileText className="w-4 h-4 text-customPrimary" />
                  {t('orders', 'Orders')} ({filteredOrders.length})
                </CardTitle>
                <Badge variant="info">{summary.totalOrders ?? 0} {t('totalOrders', 'Total Orders')}</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-darkBgSecondary/60 text-customMuted uppercase font-bold text-[9px] border-b border-darkBorder/40">
                      <th className="p-3">{t('orderId', 'Order ID')}</th>
                      <th className="p-3">{t('cargoItem', 'Cargo Item')}</th>
                      <th className="p-3">{t('quantity', 'Quantity')}</th>
                      <th className="p-3">{t('pickupLocation', 'Pickup Location')} ({t('from', 'From')})</th>
                      <th className="p-3">{t('destination', 'Delivery Destination')} ({t('to', 'To')})</th>
                      <th className="p-3">{t('status', 'Status')}</th>
                      <th className="p-3">{t('linkedShipment', 'Linked Shipment')}</th>
                      <th className="p-3">{t('createdDate', 'Created Date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/30">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-customMuted italic">
                          {t('noOrdersFound', 'No Orders Found')}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr key={o._id} className="hover:bg-darkBgSecondary/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-customPrimary">{o.orderId}</td>
                          <td className="p-3 font-semibold text-customText">{o.itemDescription}</td>
                          <td className="p-3 font-mono text-customMuted">{o.quantity}</td>
                          <td className="p-3 font-medium text-customText">{o.pickupLocation}</td>
                          <td className="p-3 font-medium text-customSuccess">{o.deliveryLocation}</td>
                          <td className="p-3">
                            <Badge variant={getStatusVariant(o.status)}>{translateStatus(o.status)}</Badge>
                          </td>
                          <td className="p-3 font-mono text-xs text-customMuted">{o.linkedShipmentId}</td>
                          <td className="p-3 font-mono text-[10px] text-customMuted">{formatDate(o.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SHIPMENTS */}
          {activeTab === 'SHIPMENTS' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                  <Truck className="w-4 h-4 text-customPrimary" />
                  {t('shipments', 'Shipments')} ({filteredShipments.length})
                </CardTitle>
                <Badge variant="primary">{summary.totalShipments ?? 0} {t('totalShipments', 'Total Shipments')}</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-darkBgSecondary/60 text-customMuted uppercase font-bold text-[9px] border-b border-darkBorder/40">
                      <th className="p-3">{t('shipmentId', 'Shipment ID')}</th>
                      <th className="p-3">{t('orderId', 'Order ID')}</th>
                      <th className="p-3">{t('origin', 'Origin')} ({t('from', 'From')})</th>
                      <th className="p-3">{t('destination', 'Destination')} ({t('to', 'To')})</th>
                      <th className="p-3">{t('selectedRoute', 'Selected Route')}</th>
                      <th className="p-3">{t('assignedDriver', 'Driver')}</th>
                      <th className="p-3">{t('assignedVehicle', 'Vehicle')}</th>
                      <th className="p-3">{t('status', 'Status')}</th>
                      <th className="p-3">{t('remainingDistance', 'Remaining Dist')}</th>
                      <th className="p-3">{t('eta', 'ETA')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/30">
                    {filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-customMuted italic">
                          {t('noShipmentsFound', 'No Shipments Found')}
                        </td>
                      </tr>
                    ) : (
                      filteredShipments.map(s => (
                        <tr key={s._id} className="hover:bg-darkBgSecondary/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-customPrimary">{s.shipmentId}</td>
                          <td className="p-3 font-mono text-customMuted">{s.orderId}</td>
                          <td className="p-3 font-medium text-customText">{s.origin}</td>
                          <td className="p-3 font-medium text-customSuccess">{s.destination}</td>
                          <td className="p-3 font-semibold text-customText">{s.selectedRoute}</td>
                          <td className="p-3 font-medium text-customText">{s.driverName}</td>
                          <td className="p-3 font-mono text-[10px] text-customMuted">{s.vehicleReg}</td>
                          <td className="p-3">
                            <Badge variant={getStatusVariant(s.status)}>{translateStatus(s.status)}</Badge>
                          </td>
                          <td className="p-3 font-mono font-bold text-customPrimary">{s.remainingDistanceKm} {kmUnit}</td>
                          <td className="p-3 font-mono text-customSuccess">{s.etaMinutes} {minsUnit}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: ROUTES */}
          {activeTab === 'ROUTES' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-purple-400" />
                  {t('routes', 'Routes')} ({rawRoutes.length})
                </CardTitle>
                <Badge variant="neutral">{t('adminSelectedCorridors', 'Admin-Selected Corridors')}</Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-darkBgSecondary/60 text-customMuted uppercase font-bold text-[9px] border-b border-darkBorder/40">
                      <th className="p-3">{t('shipmentId', 'Shipment ID')}</th>
                      <th className="p-3">{t('routeName', 'Route Name')}</th>
                      <th className="p-3">{t('origin', 'Origin')} ({t('from', 'From')})</th>
                      <th className="p-3">{t('destination', 'Destination')} ({t('to', 'To')})</th>
                      <th className="p-3">{t('totalDistance', 'Total Distance')}</th>
                      <th className="p-3">{t('remainingDistance', 'Remaining Distance')}</th>
                      <th className="p-3">{t('eta', 'ETA')}</th>
                      <th className="p-3">{t('status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/30">
                    {rawRoutes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-customMuted italic">
                          {t('noRoutesFound', 'No Routes Found')}
                        </td>
                      </tr>
                    ) : (
                      rawRoutes.map((r, idx) => (
                        <tr key={idx} className="hover:bg-darkBgSecondary/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-customPrimary">{r.shipmentId}</td>
                          <td className="p-3 font-bold text-customText">{r.routeName}</td>
                          <td className="p-3 font-medium text-customText">{r.origin}</td>
                          <td className="p-3 font-medium text-customSuccess">{r.destination}</td>
                          <td className="p-3 font-mono text-customMuted">{r.totalDistanceKm} {kmUnit}</td>
                          <td className="p-3 font-mono font-bold text-customPrimary">{r.remainingDistanceKm} {kmUnit}</td>
                          <td className="p-3 font-mono text-customSuccess">{r.etaMinutes} {minsUnit}</td>
                          <td className="p-3">
                            <Badge variant={getStatusVariant(r.status)}>{translateStatus(r.status)}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: ALERTS */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-6">
              {/* SEVERITY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-darkCard border border-darkBorder">
                  <CardContent className="p-3 space-y-1">
                    <span className="text-[9px] text-customMuted font-bold uppercase block">{t('critical', 'Critical')}</span>
                    <strong className="text-xl font-black text-customDanger block">{alertSum.criticalAlerts ?? 0}</strong>
                  </CardContent>
                </Card>
                <Card className="bg-darkCard border border-darkBorder">
                  <CardContent className="p-3 space-y-1">
                    <span className="text-[9px] text-customMuted font-bold uppercase block">{t('high', 'High')}</span>
                    <strong className="text-xl font-black text-customWarning block">{alertSum.highAlerts ?? 0}</strong>
                  </CardContent>
                </Card>
                <Card className="bg-darkCard border border-darkBorder">
                  <CardContent className="p-3 space-y-1">
                    <span className="text-[9px] text-customMuted font-bold uppercase block">{t('medium', 'Medium')}</span>
                    <strong className="text-xl font-black text-customInfo block">
                      {(alertSum.mediumAlerts ?? 0) + (alertSum.lowAlerts ?? 0)}
                    </strong>
                  </CardContent>
                </Card>
                <Card className="bg-darkCard border border-darkBorder">
                  <CardContent className="p-3 space-y-1">
                    <span className="text-[9px] text-customMuted font-bold uppercase block">{t('resolved', 'Resolved')}</span>
                    <strong className="text-xl font-black text-customSuccess block">{alertSum.resolvedAlerts ?? 0}</strong>
                  </CardContent>
                </Card>
              </div>

              {/* ALERTS TABLE */}
              <Card className="bg-darkCard border border-darkBorder">
                <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-customDanger" />
                    {t('alerts', 'Alerts')} ({rawAlerts.length})
                  </CardTitle>
                  <Badge variant="danger">{summary.activeAlerts ?? 0} {t('activeAlerts', 'Active Alerts')}</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-darkBgSecondary/60 text-customMuted uppercase font-bold text-[9px] border-b border-darkBorder/40">
                        <th className="p-3">{t('alertId', 'Alert ID')}</th>
                        <th className="p-3">{t('severity', 'Severity')}</th>
                        <th className="p-3">{t('alertType', 'Alert Type')}</th>
                        <th className="p-3">{t('alertDescription', 'Alert Description')}</th>
                        <th className="p-3">{t('shipmentId', 'Shipment ID')}</th>
                        <th className="p-3">{t('corridorLocation', 'Corridor Location')}</th>
                        <th className="p-3">{t('dateLogged', 'Date Logged')}</th>
                        <th className="p-3">{t('status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {rawAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-customMuted italic">
                            {t('noAlertsFound', 'No Alerts Found')}
                          </td>
                        </tr>
                      ) : (
                        rawAlerts.map(a => (
                          <tr key={a._id} className="hover:bg-darkBgSecondary/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-customText">{a.alertId}</td>
                            <td className="p-3">
                              <Badge variant={getSeverityVariant(a.severity)}>{translateSeverity(a.severity)}</Badge>
                            </td>
                            <td className="p-3 font-bold text-customText">{translateAlertType(a.alertType)}</td>
                            <td className="p-3 font-medium text-customMuted max-w-xs truncate">{translateAlertDescription ? translateAlertDescription(a.message) : a.message}</td>
                            <td className="p-3 font-mono text-customPrimary">{a.shipmentId}</td>
                            <td className="p-3 text-customMuted">{a.location}</td>
                            <td className="p-3 font-mono text-[10px] text-customMuted">
                              {formatDate(a.timestamp)} {formatTime(a.timestamp)}
                            </td>
                            <td className="p-3">
                              <Badge variant={a.status === 'RESOLVED' ? 'success' : 'danger'}>{translateStatus(a.status)}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NgoReports;
