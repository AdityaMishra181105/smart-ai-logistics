import React, { useState, useEffect } from 'react';
import { 
  Clipboard, RefreshCw, Download, Calendar, Search, 
  Truck, Shield, Navigation, AlertTriangle, CheckCircle2, Clock, MapPin, ArrowRight, Activity, FileText, Layers, List
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getDriverReport } from '../services/reportService';

const DriverReports = () => {
  const { user } = useAuth();
  const { 
    t, 
    translateStatus, 
    translateSeverity, 
    translateAlertType, 
    translateAuditAction, 
    translateRole, 
    translateRouteName, 
    isHindi 
  } = useLanguage();

  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRangeActive, setCustomRangeActive] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  const translateDynamicValue = (val) => {
    if (!val || typeof val !== 'string') return val;
    if (!isHindi) return val;

    const lower = val.toLowerCase().trim();
    if (lower === 'arrived at pickup') return t('arrivedAtPickup', 'पिकअप स्थान पर पहुंचे');
    if (lower === 'arrived') return t('arrived', 'पहुंच गए');
    if (lower === 'deviated corridor alert') return t('deviatedCorridorAlert', 'कॉरिडोर से विचलन अलर्ट');
    if (lower === 'on prescribed corridor') return t('onPrescribedCorridor', 'निर्धारित कॉरिडोर पर');
    if (lower === 'off route' || lower === 'off route / deviated') return t('offRoute', 'निर्धारित रूट से बाहर');
    if (lower === 'live location unavailable') return t('liveLocationUnavailable', 'लाइव स्थान उपलब्ध नहीं है');
    if (lower === 'no active shipment') return t('noActiveShipment', 'कोई सक्रिय शिपमेंट नहीं है');
    if (lower === 'no active trip') return t('noActiveTrip', 'कोई सक्रिय यात्रा नहीं है');
    if (lower === 'not assigned' || lower === 'unassigned') return t('unassigned', 'सौंपा नहीं गया');
    if (lower === 'no data available') return t('noDataAvailable', 'कोई डेटा उपलब्ध नहीं है');
    if (lower === 'n/a' || lower === 'not specified') return t('notSpecified', 'उपलब्ध नहीं');
    if (lower === 'unknown') return t('unknown', 'अज्ञात');
    if (lower === 'none') return t('none', 'कोई नहीं');

    return translateStatus(val);
  };

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPresetDates = (preset) => {
    setError('');
    const today = new Date();
    let start = new Date();
    
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 59, 999);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
      setCustomRangeActive(false);
    } else if (preset === '7days') {
      start.setDate(today.getDate() - 7);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
      setCustomRangeActive(false);
    } else if (preset === '30days') {
      start.setDate(today.getDate() - 30);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
      setCustomRangeActive(false);
    } else if (preset === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateLocal(start));
      setEndDate(formatDateLocal(today));
      setCustomRangeActive(false);
    } else if (preset === 'custom') {
      setCustomRangeActive(true);
    }
  };

  useEffect(() => {
    applyPresetDates(datePreset);
  }, [datePreset]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (!customRangeActive && datePreset) {
        params.range = datePreset;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getDriverReport(params);
      if (res.data?.success) {
        setReportData(res.data.data);
      } else {
        setError(t('failedToLoadReport', 'Failed to load report'));
      }
    } catch (err) {
      console.error('Failed to load driver report:', err);
      setError(err.response?.data?.message || t('failedToLoadReport', 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const handleCustomRangeSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError(t('selectStartAndEndDates', 'Please select both start and end dates.'));
      return;
    }
    fetchReport();
  };

  // Safe Data Extraction with Guaranteed Defaults
  const summary = reportData?.summary || {};
  const deliveryPerformance = reportData?.deliveryPerformance || {};
  const routePerformance = reportData?.routePerformance || {};
  const tripGps = reportData?.tripGps || {};
  const vehicle = reportData?.vehicle || {};
  const alertSummary = reportData?.alertSummary || {};
  const shipmentsList = reportData?.shipments || [];
  const assignedVehiclesList = reportData?.assignedVehicles || [];
  const shipmentRoutesList = reportData?.shipmentRoutes || [];
  const currentActiveShipment = reportData?.currentActiveShipment || null;
  const auditLogsList = reportData?.auditLogs || [];

  const totalAssignedShipments = summary.totalAssignedShipments ?? summary.totalShipments ?? 0;
  const completedShipments = summary.completedShipments ?? 0;
  const inTransitShipments = summary.inTransitShipments ?? 0;
  const pendingShipments = summary.pendingShipments ?? 0;
  const cancelledShipments = summary.cancelledShipments ?? 0;
  const delayedDeliveries = deliveryPerformance.delayedDeliveries ?? summary.delayedShipments ?? 0;
  const atRiskShipments = summary.atRiskShipments ?? 0;
  const totalDistanceTravelled = summary.totalDistanceTravelled ?? 0;
  const totalRouteDistance = summary.totalRouteDistance ?? 0;
  const activeAlerts = summary.activeAlerts ?? 0;
  const routeDeviations = summary.routeDeviations ?? 0;
  const vehiclesAssigned = summary.vehiclesAssigned ?? assignedVehiclesList.length;

  const totalDeliveries = deliveryPerformance.totalDeliveries ?? totalAssignedShipments;
  const successfulDeliveries = deliveryPerformance.successfulDeliveries ?? completedShipments;
  const pendingDeliveries = deliveryPerformance.pendingDeliveries ?? (pendingShipments + inTransitShipments);
  const cancelledDeliveries = deliveryPerformance.cancelledDeliveries ?? cancelledShipments;
  const onTimeDeliveries = deliveryPerformance.onTimeDeliveries ?? Math.max(0, successfulDeliveries - delayedDeliveries);
  const onTimeDeliveryPercentage = deliveryPerformance.onTimeDeliveryPercentage ?? (totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 100);
  const averageDeliveryTimeMinutes = deliveryPerformance.averageDeliveryTimeMinutes ?? summary.averageDeliveryTimeMinutes ?? 0;

  // Filter shipments based on status and search query
  const filteredShipments = shipmentsList.filter(s => {
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.shipmentId?.toLowerCase().includes(q) ||
      s.goodsType?.toLowerCase().includes(q) ||
      s.destination?.toLowerCase().includes(q) ||
      s.pickup?.toLowerCase().includes(q) ||
      s.selectedRouteName?.toLowerCase().includes(q) ||
      s.vehicleNumber?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  // PDF Generator using jsPDF and autoTable
  const generatePDFReport = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header Background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SMART LOGISTICS', 14, 16);

    doc.setFontSize(11);
    doc.setTextColor(168, 85, 247);
    doc.text(isHindi ? 'ड्राइवर संचालन और प्रदर्शन रिपोर्ट' : 'DRIVER OPERATIONS & PERFORMANCE REPORT', 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`${t('generatedAt', 'Generated At')}: ${timestamp}`, 130, 16);
    doc.text(`${t('reportPeriod', 'Report Period')}: ${datePreset.toUpperCase()}`, 130, 23);

    // Metadata Box
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`${t('driverName', 'Driver Name')}: ${reportData.driverInfo?.name || user?.name || 'N/A'}`, 14, 46);
    doc.text(`${t('driverEmail', 'Driver Email')}: ${reportData.driverInfo?.email || user?.email || 'N/A'}`, 14, 52);
    doc.text(`${t('authenticatedRole', 'Authenticated Role')}: ${translateRole(reportData.driverInfo?.role || 'DRIVER')}`, 130, 46);

    let startY = 60;

    // SECTION 1: SUMMARY TABLE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? '1. परिचालन सारांश' : '1. OPERATIONAL SUMMARY', 14, startY);

    const summaryRows = [
      [t('totalShipments', 'Total Assigned Shipments'), `${totalAssignedShipments}`, t('completedShipments', 'Completed Shipments'), `${completedShipments}`],
      [t('currentlyEnRoute', 'In-Transit Shipments'), `${inTransitShipments}`, t('pendingShipments', 'Pending Shipments'), `${pendingShipments}`],
      [t('cancelledShipments', 'Cancelled Shipments'), `${cancelledShipments}`, t('totalDistance', 'Total Distance Travelled'), `${totalDistanceTravelled} km`],
      [t('totalRouteDistance', 'Total Route Distance'), `${totalRouteDistance} km`, `${t('activeAlerts', 'Active Alerts')} / ${t('routeDeviationEvents', 'Route Deviations')}`, `${activeAlerts} / ${routeDeviations}`]
    ];

    autoTable(doc, {
      startY: startY + 4,
      head: [[t('metric', 'Metric'), t('value', 'Value'), t('metric', 'Metric'), t('value', 'Value')]],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    startY = doc.lastAutoTable.finalY + 10;

    // SECTION 2: DELIVERY PERFORMANCE TABLE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? '2. डिलीवरी और रूट प्रदर्शन' : '2. DELIVERY & ROUTE PERFORMANCE', 14, startY);

    const perfRows = [
      [t('totalDeliveries', 'Total Deliveries'), `${totalDeliveries}`, t('onTimeDeliveries', 'On-Time Deliveries'), `${onTimeDeliveries}`],
      [t('deliveredShipments', 'Successful Deliveries'), `${successfulDeliveries}`, t('delayedShipments', 'Delayed Deliveries'), `${delayedDeliveries}`],
      [t('pendingDeliveries', 'Pending Deliveries'), `${pendingDeliveries}`, t('deliverySuccessRate', 'On-Time Success Rate'), `${onTimeDeliveryPercentage}%`],
      [t('averageDeliveryTime', 'Average Delivery Time'), `${Math.floor(averageDeliveryTimeMinutes / 60)} hrs ${averageDeliveryTimeMinutes % 60} mins`, t('cancelledShipments', 'Cancelled Deliveries'), `${cancelledDeliveries}`],
      [t('selectedRoute', 'Selected Route Name'), `${translateRouteName(routePerformance.name || 'N/A')}`, t('routeStatus', 'Route Status'), `${routePerformance.routeStatus ? translateStatus(routePerformance.routeStatus) : translateDynamicValue('N/A')}`],
      [t('totalDistance', 'Total Route Distance'), `${routePerformance.totalDistance || 0} km`, t('remainingDistance', 'Remaining Distance'), `${routePerformance.remainingDistance || 0} km`]
    ];

    autoTable(doc, {
      startY: startY + 4,
      head: [[t('performanceIndicator', 'Performance Indicator'), t('value', 'Value'), t('performanceIndicator', 'Performance Indicator'), t('value', 'Value')]],
      body: perfRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    startY = doc.lastAutoTable.finalY + 10;

    // SECTION 3: GPS & VEHICLES TABLE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? '3. लाइव GPS और सौंपे गए वाहन' : '3. LIVE GPS & ASSIGNED VEHICLES', 14, startY);

    const gpsRows = [
      [t('vehicleRegistration', 'Vehicle Registration'), vehicle.registrationNumber || translateDynamicValue('NOT SPECIFIED'), t('vehicleType', 'Vehicle Type'), vehicle.vehicleType || translateDynamicValue('NOT SPECIFIED')],
      [t('vehicleStatus', 'Vehicle Status'), translateStatus(vehicle.vehicleStatus || vehicle.currentStatus) || translateStatus('AVAILABLE'), t('assignedShipment', 'Assigned Shipment'), vehicle.shipmentId || vehicle.assignedShipment || translateDynamicValue('None')],
      [t('tripStartTime', 'Trip Start Time'), tripGps.tripStartTime ? new Date(tripGps.tripStartTime).toLocaleString() : translateDynamicValue('N/A'), t('lastUpdated', 'Last GPS Update'), tripGps.lastGpsUpdate ? new Date(tripGps.lastGpsUpdate).toLocaleString() : translateDynamicValue('Live location unavailable')],
      [t('pickupLocation', 'Current Location'), tripGps.currentLocation ? translateDynamicValue(tripGps.currentLocation) : translateDynamicValue('N/A'), t('distanceTravelled', 'Distance Travelled'), tripGps.totalDistanceTravelled || '0 km'],
      [t('currentSpeed', 'Average Speed'), tripGps.averageSpeed ? translateDynamicValue(tripGps.averageSpeed) : translateDynamicValue('N/A'), t('maximumSpeed', 'Maximum Speed'), tripGps.maxSpeed ? translateDynamicValue(tripGps.maxSpeed) : translateDynamicValue('N/A')],
      [t('gpsAccuracy', 'GPS Accuracy'), tripGps.gpsAccuracy ? translateDynamicValue(tripGps.gpsAccuracy) : translateDynamicValue('N/A'), t('routeDeviationEvents', 'Route Deviation Events'), `${tripGps.routeDeviations || 0}`]
    ];

    autoTable(doc, {
      startY: startY + 4,
      head: [[t('field', 'Field'), t('value', 'Value'), t('field', 'Field'), t('value', 'Value')]],
      body: gpsRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // PAGE 2: SHIPMENT DETAILS TABLE
    doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(isHindi ? '4. सौंपे गए शिपमेंट रिपोर्ट विवरण' : '4. ASSIGNED SHIPMENTS REPORT DETAILS', 14, 16);

    const shipmentTableHeaders = [
      [
        t('shipmentId', 'Shipment ID'),
        t('cargoDetails', 'Cargo'),
        `${t('from', 'FROM')} (${t('origin', 'Origin')})`,
        `${t('to', 'TO')} (${t('destination', 'Destination')})`,
        t('vehicle', 'Vehicle'),
        t('route', 'Route'),
        t('status', 'Status'),
        t('totalDistance', 'Distance'),
        t('eta', 'ETA')
      ]
    ];

    const shipmentTableData = filteredShipments.map(s => [
      s.shipmentId,
      `${s.goodsType} (${s.quantity} ${s.unit})`,
      s.pickup,
      s.destination,
      s.vehicleNumber || translateDynamicValue('NOT SPECIFIED'),
      translateRouteName(s.selectedRouteName),
      translateStatus(s.status),
      `${s.distanceKm} km`,
      s.estimatedDurationMinutes ? `${Math.round(s.estimatedDurationMinutes / 60)} hrs` : translateDynamicValue('N/A')
    ]);

    autoTable(doc, {
      startY: 20,
      head: shipmentTableHeaders,
      body: shipmentTableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }
    });

    // PAGE 3: DRIVER AUDIT LOG & ALERTS
    if (auditLogsList.length > 0) {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(isHindi ? '5. ड्राइवर संचालन ऑडिट लॉग' : '5. DRIVER OPERATIONAL AUDIT LOG', 14, 16);

      const auditTableHeaders = [[
        t('timestamp', 'Timestamp'),
        t('action', 'Action'),
        t('module', 'Module'),
        t('referenceId', 'Reference ID'),
        t('description', 'Description'),
        t('status', 'Status')
      ]];
      const auditTableData = auditLogsList.map(a => [
        new Date(a.timestamp).toLocaleString(),
        translateAuditAction(a.action),
        a.module || 'SHIPMENTS',
        a.shipmentId || translateDynamicValue('N/A'),
        a.description,
        translateStatus(a.status)
      ]);

      autoTable(doc, {
        startY: 20,
        head: auditTableHeaders,
        body: auditTableData,
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2.5 }
      });
    }

    // Page Footers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${isHindi ? 'स्मार्ट लॉजिस्टिक्स गोपनीय ड्राइवर रिपोर्ट - पृष्ठ' : 'Smart Logistics Confidential Driver Report - Page'} ${i} ${isHindi ? 'का' : 'of'} ${pageCount}`, 14, 287);
    }

    doc.save(`SmartLogistics_DriverReport_${(user?.name || 'Driver').replace(/\s+/g, '_')}_${datePreset}.pdf`);
  };

  // CSV Exporter
  const exportCSV = () => {
    if (filteredShipments.length === 0) {
      alert(t('noShipmentDataExport', 'No shipment data available to export.'));
      return;
    }

    const headers = isHindi
      ? 'शिपमेंट आईडी,माल,मात्रा,इकाई,पिकअप (प्रारंभिक),गंतव्य,वाहन,रूट,स्थिति,दूरी (किमी),सृजन तिथि\n'
      : 'Shipment ID,Cargo,Quantity,Unit,Pickup (FROM),Destination (TO),Vehicle,Route,Status,Distance (km),Date Created\n';

    let csv = headers;
    filteredShipments.forEach(s => {
      const statusText = translateStatus(s.status);
      const routeText = translateRouteName(s.selectedRouteName);
      const vehicleText = s.vehicleNumber || translateDynamicValue('NOT SPECIFIED');
      csv += `"${s.shipmentId}","${s.goodsType}",${s.quantity},"${s.unit}","${s.pickup}","${s.destination}","${vehicleText}","${routeText}","${statusText}",${s.distanceKm},"${new Date(s.createdAt).toLocaleString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Driver_Shipments_${datePreset}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      <PageHeader
        title={t('driverReportTitle', 'Driver Operations & Performance Report')}
        description={t('driverReportDesc', 'Verify your assigned shipments, route telemetry, delivery success rates, and export official reports.')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {t('syncData', 'Sync Data')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={generatePDFReport}
              disabled={loading || !reportData}
              className="font-bold uppercase tracking-wider text-[10px] bg-customPrimary hover:bg-customPrimary/90 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              <Download className="w-4 h-4" />
              <span>{t('downloadPdfReport', 'Download PDF Report')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={loading || !reportData}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              {t('exportCsv', 'Export CSV')}
            </Button>
          </div>
        }
      />

      {/* Reporting Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-darkCard border border-darkBorder p-4 rounded-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="w-4 h-4 text-customPrimary mr-1" />
          <span className="font-bold uppercase tracking-wider text-[10px] mr-2">{t('reportingPeriod', 'Reporting Period')}:</span>
          {[
            { id: 'today', label: t('today', 'Today') },
            { id: '7days', label: t('last7Days', 'Last 7 Days') },
            { id: '30days', label: t('last30Days', 'Last 30 Days') },
            { id: 'thisMonth', label: t('thisMonth', 'This Month') },
            { id: 'custom', label: t('custom', 'Custom') }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                datePreset === preset.id 
                  ? 'bg-customPrimary text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                  : 'bg-darkBgSecondary hover:bg-darkBorder/40 text-customMuted hover:text-customText border border-darkBorder'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {customRangeActive && (
          <form onSubmit={handleCustomRangeSubmit} className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="block text-[9px] text-customMuted font-bold uppercase mb-1">{t('startDate', 'Start Date')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded text-[10px]"
              />
            </div>
            <div>
              <label className="block text-[9px] text-customMuted font-bold uppercase mb-1">{t('endDate', 'End Date')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-darkBgSecondary border border-darkBorder text-customText p-1.5 rounded text-[10px]"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="font-bold py-1.5">
              {t('apply', 'Apply')}
            </Button>
          </form>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-darkBorder overflow-x-auto">
        {[
          { id: 'overview', label: t('overview', 'Overview'), icon: Layers },
          { id: 'shipments', label: t('shipments', 'Shipments'), icon: Truck },
          { id: 'vehicles', label: t('assignedVehicles', 'Assigned Vehicles'), icon: Shield },
          { id: 'routes', label: t('routePerformanceSummary', 'Route Performance Summary'), icon: Navigation },
          { id: 'alerts', label: t('alerts', 'Alerts'), icon: AlertTriangle },
          { id: 'activity', label: t('driverAuditLog', 'Driver Operational Audit Log'), icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold uppercase tracking-wider text-[11px] border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-customPrimary text-customPrimary bg-customPrimary/5'
                  : 'border-transparent text-customMuted hover:text-customText hover:bg-darkCard/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-customPrimary' : 'text-customMuted'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-xl font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner size="md" text={t('fetchingData', 'Fetching Data...')} />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* TOP SUMMARY CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <StatCard
                  title={t('totalShipments', 'Total Shipments')}
                  value={totalAssignedShipments}
                  status="info"
                  subtitle={t('totalShipments', 'Total Shipments')}
                />
                <StatCard
                  title={t('completedShipments', 'Completed Shipments')}
                  value={completedShipments}
                  status="success"
                  subtitle={t('successfullyDelivered', 'Successfully Delivered')}
                />
                <StatCard
                  title={t('currentlyEnRoute', 'Currently En Route')}
                  value={inTransitShipments}
                  status="warning"
                  subtitle={t('currentlyEnRoute', 'Currently En Route')}
                />
                <StatCard
                  title={t('activeShipments', 'Active Shipments')}
                  value={pendingShipments}
                  status="info"
                  subtitle={t('pendingShipments', 'Pending Shipments')}
                />
                <StatCard
                  title={t('cancelledShipments', 'Cancelled Shipments')}
                  value={cancelledShipments}
                  status="danger"
                  subtitle={t('cancelledShipments', 'Cancelled Shipments')}
                />
                <StatCard
                  title={t('totalDistance', 'Total Distance')}
                  value={`${totalDistanceTravelled} km`}
                  status="success"
                  subtitle={`${t('totalDistance', 'Total Distance')} ${totalRouteDistance} km`}
                />
                <StatCard
                  title={t('activeAlerts', 'Active Alerts')}
                  value={activeAlerts}
                  status={activeAlerts > 0 ? "danger" : "success"}
                  subtitle={t('activeAlerts', 'Active Alerts')}
                />
                <StatCard
                  title={t('routeDeviationEvents', 'Route Deviation Events')}
                  value={routeDeviations}
                  status={routeDeviations > 0 ? "warning" : "success"}
                  subtitle={t('routeDeviationEvents', 'Route Deviation Events')}
                />
              </div>

              {/* CURRENT ACTIVE SHIPMENT CARD */}
              {currentActiveShipment && (
                <Card className="bg-darkCard border-2 border-customPrimary/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <CardHeader className="pb-3 border-b border-darkBorder flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customPrimary flex items-center gap-2">
                      <Activity className="w-4 h-4 animate-pulse text-customPrimary" />
                      {t('currentActiveTrip', 'Current Active Trip')}
                    </CardTitle>
                    <Badge variant={currentActiveShipment.status === 'IN_TRANSIT' ? 'warning' : 'info'}>
                      {translateStatus(currentActiveShipment.status)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('shipmentId', 'Shipment ID')}</span>
                        <strong className="text-customText font-mono font-extrabold text-sm block">{currentActiveShipment.shipmentId}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('cargoDetails', 'Cargo Details')}</span>
                        <strong className="text-customText font-bold block">{currentActiveShipment.goodsType} ({currentActiveShipment.quantity} {currentActiveShipment.unit})</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('origin', 'Origin')} ({t('from', 'From')})</span>
                        <strong className="text-customMuted block">{currentActiveShipment.from}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('destination', 'Destination')} ({t('to', 'To')})</span>
                        <strong className="text-customSuccess font-bold block">{currentActiveShipment.to}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('selectedRoute', 'Selected Route')}</span>
                        <strong className="text-purple-400 font-bold block truncate">{translateRouteName(currentActiveShipment.routeName)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase font-bold">{t('assignedVehicle', 'Assigned Vehicle')}</span>
                        <strong className="text-customText font-mono block">{currentActiveShipment.vehicleNumber || translateDynamicValue('NOT SPECIFIED')}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-darkBgSecondary/40 p-3 rounded-lg border border-darkBorder/40">
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase">{t('pickupLocation', 'Pickup Location')}</span>
                        <strong className="text-customText">{translateDynamicValue(currentActiveShipment.distanceToPickup)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase">{t('eta', 'Estimated Arrival Time')}</span>
                        <strong className="text-customText">{translateDynamicValue(currentActiveShipment.etaToPickup)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase">{t('remainingDistance', 'Remaining Distance')}</span>
                        <strong className="text-customWarning">{currentActiveShipment.remainingDistance}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-customMuted block uppercase">{t('routeStatus', 'Route Status')}</span>
                        <strong className={currentActiveShipment.routeDeviation?.includes('Deviated') ? 'text-customDanger' : 'text-customSuccess'}>
                          {translateDynamicValue(currentActiveShipment.routeDeviation)}
                        </strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* DELIVERY PERFORMANCE & ROUTE PERFORMANCE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* SHIPMENT STATUS & DELIVERY PERFORMANCE */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="pb-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-customSuccess" />
                      {t('shipmentStatusPerformance', 'Shipment Status & Delivery Performance')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('totalDeliveries', 'Total Deliveries')}</span>
                      <strong className="text-customText font-bold">{totalDeliveries}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('deliveredShipments', 'Delivered Shipments')}</span>
                      <strong className="text-customSuccess font-bold">{successfulDeliveries}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('currentlyEnRoute', 'Currently En Route')}</span>
                      <strong className="text-customWarning font-bold">{inTransitShipments}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('activeShipments', 'Active Shipments')}</span>
                      <strong className="text-customInfo font-bold">{pendingShipments}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('delayedShipments', 'Delayed Shipments')}</span>
                      <strong className="text-customDanger font-bold">{delayedDeliveries}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('cancelledShipments', 'Cancelled Shipments')}</span>
                      <strong className="text-customMuted font-bold">{cancelledDeliveries}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('deliverySuccessRate', 'Delivery Success Rate')}</span>
                      <strong className="text-customPrimary font-extrabold text-sm">{onTimeDeliveryPercentage}%</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('averageDeliveryTime', 'Average Delivery Time')}</span>
                      <strong className="text-customText font-bold">
                        {averageDeliveryTimeMinutes > 0 ? `${Math.floor(averageDeliveryTimeMinutes / 60)} ${isHindi ? 'घंटे' : 'hrs'} ${averageDeliveryTimeMinutes % 60} ${isHindi ? 'मिनट' : 'mins'}` : translateDynamicValue('N/A')}
                      </strong>
                    </div>
                  </CardContent>
                </Card>

                {/* ROUTE PERFORMANCE SUMMARY */}
                <Card className="bg-darkCard border border-darkBorder">
                  <CardHeader className="pb-3 border-b border-darkBorder">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-purple-400" />
                      {t('routePerformanceSummary', 'Route Performance Summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    {routePerformance && routePerformance.name ? (
                      <>
                        <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/40 space-y-1">
                          <span className="text-[10px] text-customMuted font-bold uppercase block">{t('selectedRouteAdminChoice', 'Selected Route (ADMIN CHOICE)')}</span>
                          <strong className="text-customText font-bold block">{translateRouteName(routePerformance.name)}</strong>
                          {routePerformance.origin && (
                            <div className="text-[10px] text-customMuted flex items-center gap-1 pt-1">
                              <span>{routePerformance.origin}</span>
                              <ArrowRight className="w-3 h-3 text-customPrimary inline" />
                              <span className="text-customSuccess">{routePerformance.destination}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('totalDistance', 'Total Distance')}</span>
                            <strong className="text-customText">{routePerformance.totalDistance || 0} km</strong>
                          </div>
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('distanceTravelled', 'Distance Travelled')}</span>
                            <strong className="text-customSuccess">{routePerformance.distanceTravelled || 0} km</strong>
                          </div>
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('remainingDistance', 'Remaining Distance')}</span>
                            <strong className="text-customWarning">{routePerformance.remainingDistance || 0} km</strong>
                          </div>
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('eta', 'Estimated Arrival Time')}</span>
                            <strong className="text-customText">{translateDynamicValue(routePerformance.eta)}</strong>
                          </div>
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('routeDeviationEvents', 'Route Deviation Events')}</span>
                            <strong className="text-orange-400">{routePerformance.routeDeviations || 0}</strong>
                          </div>
                          <div className="p-2 bg-darkBgSecondary/40 rounded border border-darkBorder/30">
                            <span className="text-[9px] text-customMuted block uppercase">{t('routeAlerts', 'Route Alerts')}</span>
                            <strong className="text-customDanger">{routePerformance.alertCount || 0}</strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center text-customMuted italic">{t('noRoutesFound', 'No Routes Found')}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* LIVE TRIP TELEMETRY */}
              <Card className="bg-darkCard border border-darkBorder">
                <CardHeader className="pb-3 border-b border-darkBorder">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    {t('liveTripTelemetry', 'Live Trip Telemetry')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('time', 'Time')}</span>
                      <strong className="text-customText font-mono">
                        {tripGps.tripStartTime ? new Date(tripGps.tripStartTime).toLocaleString() : translateDynamicValue('N/A')}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('lastUpdated', 'Last Updated')}</span>
                      <strong className="text-customSuccess font-mono">
                        {tripGps.lastGpsUpdate ? new Date(tripGps.lastGpsUpdate).toLocaleTimeString() : translateDynamicValue('No Data Available')}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('pickupLocation', 'Pickup Location')}</span>
                      <strong className="text-customText font-mono truncate block">{translateDynamicValue(tripGps.currentLocation) || translateDynamicValue('N/A')}</strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('distanceTravelled', 'Distance Travelled')}</span>
                      <strong className="text-customText">{tripGps.totalDistanceTravelled || '0 km'}</strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('currentSpeed', 'Current Speed')}</span>
                      <strong className="text-customText">{translateDynamicValue(tripGps.averageSpeed) || translateDynamicValue('N/A')}</strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('maximumSpeed', 'Maximum Speed')}</span>
                      <strong className="text-customText">{translateDynamicValue(tripGps.maxSpeed) || translateDynamicValue('N/A')}</strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('gpsAccuracy', 'GPS Accuracy')}</span>
                      <strong className="text-customText">{translateDynamicValue(tripGps.gpsAccuracy) || translateDynamicValue('N/A')}</strong>
                    </div>
                    <div className="p-2.5 bg-darkBgSecondary/40 rounded-lg border border-darkBorder/30">
                      <span className="text-[9px] text-customMuted block uppercase">{t('corridorDeviations', 'Corridor Deviations')}</span>
                      <strong className="text-customWarning">{tripGps.routeDeviations || 0}</strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: MY SHIPMENTS */}
          {activeTab === 'shipments' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-customPrimary" />
                  {t('shipments', 'My Shipments')}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-64">
                    <Input
                      placeholder={t('searchPlaceholder', 'Search shipments, vehicles...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      icon={Search}
                      className="text-[10px]"
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      options={[
                        { label: t('allStatuses', 'All Statuses'), value: '' },
                        { label: t('statusPending', 'Pending'), value: 'ROUTE_SELECTED' },
                        { label: t('statusInTransit', 'In Transit'), value: 'IN_TRANSIT' },
                        { label: t('statusDelivered', 'Delivered'), value: 'DELIVERED' },
                        { label: t('statusCancelled', 'Cancelled'), value: 'CANCELLED' }
                      ]}
                      className="text-[10px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto min-h-[300px]">
                {filteredShipments.length === 0 ? (
                  <div className="p-12 text-center text-customMuted italic font-medium space-y-1">
                    <Truck className="w-8 h-8 mx-auto opacity-30 text-customMuted" />
                    <p>{t('noShipmentsFound', 'No Shipments Found')}</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/15 select-none">
                        <th className="px-4 py-3">{t('shipmentId', 'Shipment ID')}</th>
                        <th className="px-4 py-3">{t('cargoDetails', 'Cargo Details')}</th>
                        <th className="px-4 py-3">{t('origin', 'Origin')} ({t('from', 'From')}) → {t('destination', 'Destination')} ({t('to', 'To')})</th>
                        <th className="px-4 py-3">{t('selectedRoute', 'Selected Route')}</th>
                        <th className="px-4 py-3">{t('assignedVehicle', 'Assigned Vehicle')}</th>
                        <th className="px-4 py-3">{t('status', 'Status')}</th>
                        <th className="px-4 py-3">{t('totalDistance', 'Distance')}</th>
                        <th className="px-4 py-3">{t('eta', 'ETA')}</th>
                        <th className="px-4 py-3 text-right">{t('date', 'Date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {filteredShipments.map((s) => (
                        <tr key={s._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-4 py-3 font-extrabold font-mono text-customText">{s.shipmentId}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-customText block">{s.goodsType}</span>
                            <span className="text-[10px] text-customMuted">{s.quantity} {s.unit}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-semibold text-customText">
                              <span>{s.pickup}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-customPrimary shrink-0" />
                              <span className="text-customSuccess">{s.destination}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-customPrimary font-semibold">{translateRouteName(s.selectedRouteName)}</td>
                          <td className="px-4 py-3 font-mono text-customMuted">{s.vehicleNumber || translateDynamicValue('NOT SPECIFIED')}</td>
                          <td className="px-4 py-3">
                            <Badge variant={s.status === 'DELIVERED' ? 'success' : s.status === 'IN_TRANSIT' ? 'warning' : 'info'}>
                              {translateStatus(s.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono">{s.distanceKm} km</td>
                          <td className="px-4 py-3 font-mono text-customMuted">
                            {s.estimatedDurationMinutes ? `${Math.round(s.estimatedDurationMinutes / 60)} ${isHindi ? 'घंटे' : 'hrs'}` : translateDynamicValue('N/A')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-customMuted">
                            {s.actualDeliveryTime ? new Date(s.actualDeliveryTime).toLocaleString() : t('pendingEnRoute', 'Pending / En Route')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: ASSIGNED VEHICLES */}
          {activeTab === 'vehicles' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-customSecondary" />
                  {t('assignedVehicles', 'Assigned Vehicles')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto min-h-[250px]">
                {assignedVehiclesList.length === 0 ? (
                  <div className="p-12 text-center text-customMuted italic font-medium">{t('noVehiclesFound', 'No Vehicles Found')}</div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/20">
                        <th className="px-4 py-3">{t('vehicleRegistration', 'Vehicle Registration')}</th>
                        <th className="px-4 py-3">{t('vehicleType', 'Vehicle Type')}</th>
                        <th className="px-4 py-3">{t('fuelType', 'Fuel Type')}</th>
                        <th className="px-4 py-3">{t('shipmentId', 'Assigned Shipment ID')}</th>
                        <th className="px-4 py-3">{t('capacity', 'Capacity')}</th>
                        <th className="px-4 py-3">{t('vehicleStatus', 'Vehicle Status')}</th>
                        <th className="px-4 py-3 text-right">{t('status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {assignedVehiclesList.map((v) => (
                        <tr key={v._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-4 py-3 font-bold font-mono text-customText">{v.registrationNumber}</td>
                          <td className="px-4 py-3 text-customMuted">{v.vehicleType}</td>
                          <td className="px-4 py-3 text-customMuted">{v.fuelType ? translateDynamicValue(v.fuelType) : t('diesel', 'DIESEL')}</td>
                          <td className="px-4 py-3 font-mono text-customPrimary font-bold">
                            {v.shipmentId === 'None' || !v.shipmentId ? translateDynamicValue('None') : v.shipmentId}
                          </td>
                          <td className="px-4 py-3 font-mono">{v.capacity ? v.capacity : translateDynamicValue('N/A')}</td>
                          <td className="px-4 py-3">
                            <Badge variant={v.vehicleStatus === 'IN_TRANSIT' ? 'warning' : 'success'}>
                              {translateStatus(v.vehicleStatus)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-customText">
                            {translateStatus(v.assignmentStatus)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: ROUTE PERFORMANCE */}
          {activeTab === 'routes' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-customPrimary" />
                  {t('routePerformanceSummary', 'Route Performance Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto min-h-[300px]">
                {shipmentRoutesList.length === 0 ? (
                  <div className="p-12 text-center text-customMuted italic">{t('noRoutesFound', 'No Routes Found')}</div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/20">
                        <th className="px-4 py-3">{t('shipmentId', 'Shipment ID')}</th>
                        <th className="px-4 py-3">{t('origin', 'Origin')} ({t('from', 'From')}) → {t('destination', 'Destination')} ({t('to', 'To')})</th>
                        <th className="px-4 py-3">{t('selectedRoute', 'Selected Route')}</th>
                        <th className="px-4 py-3">{t('totalDistance', 'Distance')}</th>
                        <th className="px-4 py-3">{t('remainingDistance', 'Remaining')}</th>
                        <th className="px-4 py-3">{t('eta', 'ETA')}</th>
                        <th className="px-4 py-3">{t('routeDeviationEvents', 'Deviations')}</th>
                        <th className="px-4 py-3 text-right">{t('status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {shipmentRoutesList.map((r) => (
                        <tr key={r._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-4 py-3 font-bold font-mono text-customText">{r.shipmentId}</td>
                          <td className="px-4 py-3 font-semibold text-customText">
                            <div className="flex items-center gap-1.5">
                              <span>{r.from}</span>
                              <ArrowRight className="w-3 h-3 text-customPrimary shrink-0" />
                              <span className="text-customSuccess">{r.to}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-purple-400 font-semibold truncate max-w-xs">{translateRouteName(r.routeName)}</td>
                          <td className="px-4 py-3 font-mono">{r.distanceKm} km</td>
                          <td className="px-4 py-3 font-mono text-customWarning">{r.remainingDistanceKm} km</td>
                          <td className="px-4 py-3 font-mono text-customMuted">{translateDynamicValue(r.eta)}</td>
                          <td className="px-4 py-3 font-mono text-orange-400 font-bold">{r.routeDeviations}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={r.status === 'DELIVERED' ? 'success' : r.status === 'IN_TRANSIT' ? 'warning' : 'info'}>
                              {translateStatus(r.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 5: ALERTS */}
          {activeTab === 'alerts' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-customWarning" />
                  {t('alerts', 'Alerts')}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="danger">{t('criticalAlerts', 'Critical Alerts')}: {alertSummary.criticalAlerts ?? 0}</Badge>
                  <Badge variant="warning">{t('highSeverity', 'High Severity')}: {alertSummary.highAlerts ?? 0}</Badge>
                  <Badge variant="info">{t('mediumSeverity', 'Medium Severity')}: {alertSummary.mediumAlerts ?? 0}</Badge>
                  <Badge variant="muted">{t('lowSeverity', 'Low Severity')}: {alertSummary.lowAlerts ?? 0}</Badge>
                  <Badge variant="success">{t('activeAlerts', 'Active Alerts')}: {alertSummary.activeAlerts ?? 0}</Badge>
                  <Badge variant="success">{t('resolved', 'Resolved')}: {alertSummary.resolvedAlerts ?? 0}</Badge>
                  <Badge variant="warning">{t('routeDeviations', 'Route Deviations')}: {alertSummary.routeDeviationAlerts ?? 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto min-h-[300px]">
                {alertSummary.recentAlerts && alertSummary.recentAlerts.length > 0 ? (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/20">
                        <th className="px-4 py-3">{t('alertId', 'Alert ID')}</th>
                        <th className="px-4 py-3">{t('alertType', 'Alert Type')}</th>
                        <th className="px-4 py-3">{t('severity', 'Severity')}</th>
                        <th className="px-4 py-3">{t('alertDescription', 'Alert Description')}</th>
                        <th className="px-4 py-3">{t('shipmentId', 'Shipment ID')}</th>
                        <th className="px-4 py-3 text-right">{t('dateLogged', 'Date Logged')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {alertSummary.recentAlerts.map((a) => (
                        <tr key={a._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-4 py-3 font-bold font-mono text-customText">{a.alertId}</td>
                          <td className="px-4 py-3 uppercase text-[9px] font-extrabold text-customPrimary">{translateAlertType(a.alertType)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={a.severity === 'CRITICAL' ? 'danger' : a.severity === 'HIGH' ? 'warning' : 'info'}>
                              {translateSeverity(a.severity)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-customMuted max-w-xs truncate">{a.description || a.title}</td>
                          <td className="px-4 py-3 font-mono text-customText">{a.relatedShipment?.shipmentId || translateDynamicValue('N/A')}</td>
                          <td className="px-4 py-3 text-right font-mono text-customMuted">{new Date(a.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-customMuted italic font-medium">
                    {t('noActiveAlerts', 'No Active Alerts')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 6: DRIVER AUDIT LOG */}
          {activeTab === 'activity' && (
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" />
                  {t('driverOperationalAuditLog', 'Driver Operational Audit Log')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto min-h-[300px]">
                {auditLogsList.length === 0 ? (
                  <div className="p-12 text-center text-customMuted italic font-medium">{t('noAuditRecordsFound', 'No Audit Records Found')}</div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse min-w-[750px]">
                    <thead>
                      <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/20">
                        <th className="px-4 py-3">{t('time', 'Time')}</th>
                        <th className="px-4 py-3">{t('action', 'Action')}</th>
                        <th className="px-4 py-3">{t('module', 'Module')}</th>
                        <th className="px-4 py-3">{t('referenceId', 'Reference ID')}</th>
                        <th className="px-4 py-3">{t('description', 'Description')}</th>
                        <th className="px-4 py-3 text-right">{t('status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkBorder/30">
                      {auditLogsList.map((log) => (
                        <tr key={log._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-customMuted">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold text-customText">{translateAuditAction(log.action)}</td>
                          <td className="px-4 py-3 text-[10px] text-customPrimary font-mono font-bold uppercase">{log.module || 'SHIPMENTS'}</td>
                          <td className="px-4 py-3 font-mono text-customText">{log.shipmentId}</td>
                          <td className="px-4 py-3 text-customMuted">{log.description}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'danger' : 'warning'}>
                              {translateStatus(log.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DriverReports;
