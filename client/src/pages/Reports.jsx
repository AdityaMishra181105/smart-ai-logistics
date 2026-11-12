import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clipboard, RefreshCw, Download, Calendar, Search,
  Truck, FileText, Database, Navigation, MapPin, Route,
  Shield, AlertTriangle, Activity, CheckCircle2, Clock, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import DriverReports from './DriverReports';
import { getOrders } from '../services/orderService';
import { getShipments } from '../services/shipmentService';
import {
  getOverviewReport,
  getShipmentReport,
  getOrderReport,
  getVehicleReport,
  getRouteReport,
  getAlertReport
} from '../services/reportService';

import { useLanguage } from '../context/LanguageContext';

const Reports = () => {
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity, translateAlertType } = useLanguage();

  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRangeActive, setCustomRangeActive] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [overview, setOverview] = useState(null);
  const [reportData, setReportData] = useState({ summary: {}, records: [] });

  // Direct DB Orders State (Same source of truth as Main Orders module)
  const [allDbOrders, setAllDbOrders] = useState([]);
  const [shipmentsMap, setShipmentsMap] = useState({});
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

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

  // Fetch real Orders using the exact same service as Main Orders module
  const fetchOrdersData = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const [ordersRes, shipmentsRes] = await Promise.all([
        getOrders({ limit: 100 }),
        getShipments({ limit: 100 })
      ]);

      let fetchedOrders = [];
      if (ordersRes.data?.success && Array.isArray(ordersRes.data.data)) {
        fetchedOrders = ordersRes.data.data;
      } else if (Array.isArray(ordersRes.data)) {
        fetchedOrders = ordersRes.data;
      }

      let fetchedShipments = [];
      if (shipmentsRes.data?.success && Array.isArray(shipmentsRes.data.data?.shipments)) {
        fetchedShipments = shipmentsRes.data.data.shipments;
      } else if (Array.isArray(shipmentsRes.data?.data)) {
        fetchedShipments = shipmentsRes.data.data;
      }

      const map = {};
      fetchedShipments.forEach(s => {
        if (s.assignedOrder) {
          const ordIdStr = typeof s.assignedOrder === 'object' ? s.assignedOrder._id : s.assignedOrder;
          map[ordIdStr] = s;
        }
        if (s.orderId) {
          map[s.orderId] = s;
        }
      });

      setAllDbOrders(fetchedOrders);
      setShipmentsMap(map);
    } catch (err) {
      console.error('Failed to load orders for Reports:', err);
      setOrdersError(err.response?.data?.message || t('failedToLoadOrders', 'Failed to load orders'));
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOverviewReportData = async () => {
    try {
      const params = {};
      if (!customRangeActive && datePreset) {
        params.range = datePreset;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getOverviewReport(params);
      if (res.data?.success) {
        const data = res.data.data;
        setOverview({
          ...(data.summary || {}),
          activeShipment: data.activeShipment || null,
          topHighRiskShipments: data.topHighRiskShipments || [],
          recentAlerts: data.recentAlerts || [],
          auditLogs: data.auditLogs || data.summary?.auditLogs || []
        });
      }
    } catch (err) {
      console.error('Failed to load overview report summary:', err);
    }
  };

  const fetchCategoryReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (!customRangeActive && datePreset) {
        params.range = datePreset;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;

      let res;
      switch (activeTab) {
        case 'shipments':
          res = await getShipmentReport(params);
          break;
        case 'vehicles':
          res = await getVehicleReport(params);
          break;
        case 'routes':
          res = await getRouteReport(params);
          break;
        case 'alerts':
          res = await getAlertReport(params);
          break;
        default:
          res = null;
      }

      if (res && res.data?.success) {
        setReportData(res.data.data);
      } else {
        setReportData({ summary: {}, records: [] });
      }
    } catch (err) {
      console.error(`Failed to load ${activeTab} report:`, err);
      setError(err.response?.data?.message || `Failed to fetch ${activeTab} report details.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewReportData();
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      if (activeTab === 'overview') {
        setLoading(false);
      } else if (activeTab !== 'orders') {
        fetchCategoryReportData();
      }
    }
  }, [activeTab, startDate, endDate, filterStatus, filterSeverity]);

  const handleCustomRangeSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    fetchOverviewReportData();
    fetchOrdersData();
    if (activeTab !== 'overview' && activeTab !== 'orders') {
      fetchCategoryReportData();
    }
  };

  // Filter Orders by Date Reporting Period
  const periodFilteredOrders = useMemo(() => {
    if (!allDbOrders || allDbOrders.length === 0) return [];
    const now = new Date();

    return allDbOrders.filter(o => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;

      if (datePreset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return orderDate >= start && orderDate <= end;
      } else if (datePreset === '7days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return orderDate >= start && orderDate <= now;
      } else if (datePreset === '30days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return orderDate >= start && orderDate <= now;
      } else if (datePreset === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        return orderDate >= start && orderDate <= now;
      } else if (datePreset === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  }, [allDbOrders, datePreset, startDate, endDate]);

  // Final Filtered Orders (Search + Status Filter)
  const finalFilteredOrders = useMemo(() => {
    return periodFilteredOrders.filter(o => {
      // Status filter
      if (filterStatus && filterStatus !== '') {
        if (o.status !== filterStatus) return false;
      }

      // Search filter
      if (searchTerm && searchTerm.trim() !== '') {
        const s = searchTerm.trim().toLowerCase();
        const code = (o.orderId || ('ORD-' + (o._id ? o._id.toString().slice(-6).toUpperCase() : ''))).toLowerCase();
        const cargo = (o.cargoDescription || o.itemDescription || o.goodsType || '').toLowerCase();
        const pickup = (o.pickupLocation?.locationName || o.pickupLocation?.address || (typeof o.pickupLocation === 'string' ? o.pickupLocation : '')).toLowerCase();
        const deliv = (o.deliveryLocation?.locationName || o.deliveryLocation?.address || (typeof o.deliveryLocation === 'string' ? o.deliveryLocation : '')).toLowerCase();
        const statusStr = (o.status || '').toLowerCase();
        const custName = (o.customerName || o.createdBy?.name || '').toLowerCase();
        const linkedShipment = shipmentsMap[o._id] || shipmentsMap[o.orderId] || o.assignedShipment;
        const shpId = (linkedShipment?.shipmentId || '').toLowerCase();

        return (
          code.includes(s) ||
          cargo.includes(s) ||
          pickup.includes(s) ||
          deliv.includes(s) ||
          statusStr.includes(s) ||
          custName.includes(s) ||
          shpId.includes(s)
        );
      }
      return true;
    });
  }, [periodFilteredOrders, filterStatus, searchTerm, shipmentsMap]);

  // Filtered records for other tabs
  const filteredCategoryRecords = (reportData.records || []).filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    if (activeTab === 'shipments') {
      return (
        (r.shipmentId && r.shipmentId.toLowerCase().includes(term)) ||
        (r.goodsType && r.goodsType.toLowerCase().includes(term)) ||
        (r.pickup?.locationName && r.pickup.locationName.toLowerCase().includes(term)) ||
        (r.destination?.locationName && r.destination.locationName.toLowerCase().includes(term)) ||
        (r.status && r.status.toLowerCase().includes(term))
      );
    }
    if (activeTab === 'vehicles') {
      return (
        (r.registrationNumber && r.registrationNumber.toLowerCase().includes(term)) ||
        (r.vehicleType && r.vehicleType.toLowerCase().includes(term)) ||
        (r.currentStatus && r.currentStatus.toLowerCase().includes(term)) ||
        (r.fuelType && r.fuelType.toLowerCase().includes(term))
      );
    }
    if (activeTab === 'routes') {
      const nameStr = r.name || r.routeName || r.corridorId || '';
      return (
        nameStr.toLowerCase().includes(term) ||
        (r.routeStatus && r.routeStatus.toLowerCase().includes(term)) ||
        (r.riskLevel && r.riskLevel.toLowerCase().includes(term))
      );
    }
    if (activeTab === 'alerts') {
      return (
        (r.alertId && r.alertId.toLowerCase().includes(term)) ||
        (r.title && r.title.toLowerCase().includes(term)) ||
        (r.alertType && r.alertType.toLowerCase().includes(term)) ||
        (r.severity && r.severity.toLowerCase().includes(term)) ||
        (r.status && r.status.toLowerCase().includes(term)) ||
        (r.relatedShipment?.shipmentId && r.relatedShipment.shipmentId.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handlePDFExport = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Title & Header
      doc.setFillColor(15, 15, 35);
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(168, 85, 247);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SMART LOGISTICS PLATFORM', 14, 15);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('SYSTEM-WIDE LOGISTICS & OPERATIONS AUDIT REPORT', 14, 23);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 200);
      doc.text(`Generated By: ${user?.name || 'Administrator'} (${user?.role || 'ADMIN'}) | Date: ${new Date().toLocaleString()}`, 14, 30);

      // Section 1: Summary Statistics
      doc.setTextColor(30, 30, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. OPERATIONAL PERFORMANCE SUMMARY', 14, 46);

      const summaryTableData = [
        ['Total Shipments', String(overview?.totalShipments ?? 0), 'Active Shipments', String(overview?.activeShipments ?? 0)],
        ['Delivered Shipments', String(overview?.deliveredShipments ?? 0), 'Delivery Completion Rate', `${overview?.deliveryCompletionRate ?? 0}%`],
        ['Total Orders', String(allDbOrders.length || overview?.totalOrders || 0), 'Order Conversion Rate', `${overview?.orderConversionRate ?? 0}%`],
        ['Fleet Utilization', `${overview?.vehicleUtilizationRate ?? 0}%`, 'Unresolved Alerts', String(overview?.unresolvedAlerts ?? 0)]
      ];

      doc.autoTable({
        startY: 50,
        head: [['Metric', 'Value', 'Metric', 'Value']],
        body: summaryTableData,
        theme: 'striped',
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5 }
      });

      let nextY = doc.lastAutoTable.finalY + 10;

      // Section 2: Current Active Shipment
      if (overview?.activeShipment) {
        const act = overview.activeShipment;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('2. CURRENT ACTIVE SHIPMENT IN TRANSIT', 14, nextY);

        const activeTableData = [
          ['Shipment ID', act.shipmentId || 'N/A', 'Status', act.status || 'N/A'],
          ['Cargo Details', `${act.goodsType || 'Supplies'} (${act.quantity || 0})`, 'Selected Route', act.selectedRoute?.name || 'Pending'],
          ['Origin Location', act.pickup?.locationName || 'N/A', 'Destination Location', act.destination?.locationName || 'N/A'],
          ['Assigned Driver', act.assignedDriver?.name || 'Unassigned', 'Assigned Vehicle', act.assignedVehicle?.registrationNumber || act.vehicleNumber || 'NOT SPECIFIED']
        ];

        doc.autoTable({
          startY: nextY + 4,
          head: [['Attribute', 'Value', 'Attribute', 'Value']],
          body: activeTableData,
          theme: 'grid',
          headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8.5, cellPadding: 2 }
        });
      }

      doc.save(`SmartLogistics_Admin_Audit_Report_${datePreset}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF report.');
    }
  };

  const handleCSVExport = () => {
    const records = activeTab === 'orders' ? finalFilteredOrders : filteredCategoryRecords;
    if (records.length === 0 && !overview) {
      alert('No records available to export.');
      return;
    }

    let csvContent = '';
    let headers = [];

    if (activeTab === 'overview') {
      csvContent += "SMART LOGISTICS SYSTEM OVERVIEW REPORT\n";
      csvContent += `Generated Date: ${new Date().toLocaleString()}\n\n`;
      csvContent += `Total Shipments,${overview?.totalShipments || 0}\n`;
      csvContent += `Active Shipments,${overview?.activeShipments || 0}\n`;
      csvContent += `Delivered Shipments,${overview?.deliveredShipments || 0}\n`;
      csvContent += `Delivery Completion Rate,${overview?.deliveryCompletionRate || 0}%\n`;
      csvContent += `Total Orders,${allDbOrders.length || overview?.totalOrders || 0}\n`;
      csvContent += `Order Conversion Rate,${overview?.orderConversionRate || 0}%\n`;
      csvContent += `Total Vehicles,${overview?.totalVehicles || 0}\n`;
      csvContent += `Fleet Utilization Rate,${overview?.vehicleUtilizationRate || 0}%\n`;
      csvContent += `Unresolved Alerts,${overview?.unresolvedAlerts || 0}\n`;
    } else {
      switch (activeTab) {
        case 'shipments':
          headers = [t('shipmentId', 'Shipment ID'), t('status', 'Status'), t('goodsType', 'Goods Type'), t('originLocation', 'Origin'), t('destinationLocation', 'Destination'), t('dateLogged', 'Date Logged')];
          csvContent += headers.join(',') + '\n';
          records.forEach(r => {
            const row = [
              r.shipmentId,
              r.status,
              r.goodsType,
              `"${r.pickup?.locationName || ''}"`,
              `"${r.destination?.locationName || ''}"`,
              new Date(r.createdAt).toLocaleString()
            ];
            csvContent += row.join(',') + '\n';
          });
          break;
        case 'orders':
          headers = [t('orderId', 'Order ID'), t('cargo', 'Cargo'), t('quantity', 'Quantity'), t('pickupLocation', 'Pickup Location'), t('destination', 'Destination'), t('status', 'Status'), t('assignedShipment', 'Assigned Shipment'), t('createdDate', 'Created Date')];
          csvContent += headers.join(',') + '\n';
          records.forEach(r => {
            const linked = shipmentsMap[r._id] || shipmentsMap[r.orderId] || r.assignedShipment;
            const shpStr = linked?.shipmentId || 'Not Assigned';
            const row = [
              r.orderId || ('ORD-' + r._id.toString().slice(-6).toUpperCase()),
              `"${r.cargoDescription || r.itemDescription || r.goodsType || 'Supplies'}"`,
              `"${r.quantity ? `${r.quantity} ${r.unit || ''}` : 'N/A'}"`,
              `"${r.pickupLocation?.locationName || r.pickupLocation?.address || 'N/A'}"`,
              `"${r.deliveryLocation?.locationName || r.deliveryLocation?.address || 'N/A'}"`,
              r.status,
              `"${shpStr}"`,
              new Date(r.createdAt).toLocaleString()
            ];
            csvContent += row.join(',') + '\n';
          });
          break;
        case 'vehicles':
          headers = [t('regNumber', 'Reg Number'), t('vehicleType', 'Type'), t('status', 'Status'), t('fuelType', 'Fuel Type')];
          csvContent += headers.join(',') + '\n';
          records.forEach(r => {
            const row = [
              r.registrationNumber,
              r.vehicleType,
              r.currentStatus,
              r.fuelType
            ];
            csvContent += row.join(',') + '\n';
          });
          break;
        case 'routes':
          headers = [t('routeName', 'Corridor Name'), t('totalDistance', 'Distance Km'), t('duration', 'Duration Mins'), t('status', 'Status')];
          csvContent += headers.join(',') + '\n';
          records.forEach(r => {
            const row = [
              `"${r.name || r.corridorId}"`,
              r.distance,
              r.estimatedDuration,
              r.routeStatus
            ];
            csvContent += row.join(',') + '\n';
          });
          break;
        case 'alerts':
          headers = [t('alertId', 'Alert ID'), t('incidentTitle', 'Incident Title'), t('severity', 'Severity'), t('status', 'Status'), t('alertType', 'Type'), t('dateLogged', 'Date Logged')];
          csvContent += headers.join(',') + '\n';
          records.forEach(r => {
            const row = [
              r.alertId,
              `"${r.title}"`,
              r.severity,
              r.status,
              r.alertType,
              new Date(r.createdAt).toLocaleString()
            ];
            csvContent += row.join(',') + '\n';
          });
          break;
        default:
          return;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartLogistics_Report_${activeTab}_${datePreset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusOptions = () => {
    switch (activeTab) {
      case 'shipments':
        return [
          { label: t('allStatuses', 'All Statuses'), value: '' },
          { label: translateStatus('CREATED'), value: 'CREATED' },
          { label: translateStatus('IN_TRANSIT'), value: 'IN_TRANSIT' },
          { label: translateStatus('DELIVERED'), value: 'DELIVERED' },
          { label: translateStatus('DELAYED'), value: 'DELAYED' }
        ];
      case 'orders':
        return [
          { label: t('allStatuses', 'All Statuses'), value: '' },
          { label: translateStatus('PENDING'), value: 'PENDING' },
          { label: translateStatus('CONFIRMED'), value: 'CONFIRMED' },
          { label: translateStatus('PROCESSING'), value: 'PROCESSING' },
          { label: translateStatus('ASSIGNED'), value: 'ASSIGNED' },
          { label: translateStatus('DELIVERED'), value: 'DELIVERED' }
        ];
      case 'vehicles':
        return [
          { label: t('allStatuses', 'All Statuses'), value: '' },
          { label: translateStatus('AVAILABLE'), value: 'AVAILABLE' },
          { label: translateStatus('ASSIGNED'), value: 'ASSIGNED' },
          { label: translateStatus('IN_TRANSIT'), value: 'IN_TRANSIT' },
          { label: translateStatus('MAINTENANCE'), value: 'MAINTENANCE' }
        ];
      case 'routes':
        return [
          { label: t('allStatuses', 'All Statuses'), value: '' },
          { label: translateStatus('ACTIVE'), value: 'ACTIVE' },
          { label: translateStatus('COMPLETED'), value: 'COMPLETED' },
          { label: translateStatus('INACTIVE'), value: 'INACTIVE' }
        ];
      case 'alerts':
        return [
          { label: t('allStatuses', 'All Statuses'), value: '' },
          { label: translateStatus('ACTIVE'), value: 'ACTIVE' },
          { label: translateStatus('RESOLVED'), value: 'RESOLVED' },
          { label: translateSeverity('LOW'), value: 'LOW' },
          { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
          { label: translateSeverity('HIGH'), value: 'HIGH' },
          { label: translateSeverity('CRITICAL'), value: 'CRITICAL' }
        ];
      default:
        return [];
    }
  };

  if (user && user.role === 'DRIVER') {
    return <DriverReports />;
  }

  const currentTabRecords = activeTab === 'orders' ? finalFilteredOrders : filteredCategoryRecords;
  const isTabLoading = activeTab === 'orders' ? ordersLoading : loading;

  return (
    <div className="space-y-6 text-xs text-customText max-w-[1600px] mx-auto p-1">
      <PageHeader
        title={t('reports', 'Reports & Audits')}
        description={t('reportsAuditsSub', 'Verify system audit logs, export operational records, and check status summaries.')}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOverviewReportData();
                fetchOrdersData();
                if (activeTab !== 'overview' && activeTab !== 'orders') fetchCategoryReportData();
              }}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {t('syncReport', 'Sync Report')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCSVExport}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePDFExport}
              className="font-bold uppercase tracking-wider text-[10px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
              <span>{t('downloadPdfReport', 'Download PDF Report')}</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-darkCard border border-darkBorder p-4 rounded-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="w-4 h-4 text-customPrimary mr-1" />
          <span className="font-bold uppercase tracking-wider text-[10px] mr-2">{t('reportingPeriod', 'Reporting Period')}:</span>
          {['today', '7days', '30days', 'thisMonth', 'custom'].map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                datePreset === preset 
                  ? 'bg-customPrimary text-white' 
                  : 'bg-darkBgSecondary hover:bg-darkBorder/40 text-customMuted hover:text-customText border border-darkBorder'
              }`}
            >
              {preset === 'today' ? t('today', 'Today') :
               preset === '7days' ? t('last7Days', 'Last 7 Days') :
               preset === '30days' ? t('last30Days', 'Last 30 Days') :
               preset === 'thisMonth' ? t('thisMonth', 'This Month') :
               t('custom', 'Custom')}
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
              {t('filter', 'Filter')}
            </Button>
          </form>
        )}
      </div>

      {(error || (activeTab === 'orders' && ordersError)) && (
        <div className="p-4 bg-customDanger/10 border border-customDanger/25 text-customDanger rounded-xl font-bold">
          {error || ordersError}
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title={t('totalShipments', 'Total Shipments')}
            value={overview.totalShipments || 0}
            status="info"
            subtitle={t('operationsLogged', 'Operations logged')}
          />
          <StatCard
            title={t('activeShipments', 'Active Shipments')}
            value={overview.activeShipments || 0}
            status="warning"
            subtitle={t('inTransitDispatched', 'In transit / dispatched')}
          />
          <StatCard
            title={t('deliveryCompletion', 'DELIVERY COMPLETION')}
            value={`${overview.deliveryCompletionRate || 0}%`}
            status="success"
            subtitle={`${overview.deliveredShipments || 0} ${t('delivered', 'delivered')}`}
          />
          <StatCard
            title={t('totalOrders', 'Total Orders')}
            value={allDbOrders.length || overview.totalOrders || 0}
            status="info"
            subtitle={`${overview.convertedOrders || 0} ${t('converted', 'converted')}`}
          />
          <StatCard
            title={t('fleetUtilization', 'Fleet Utilization')}
            value={`${overview.vehicleUtilizationRate || 0}%`}
            status="info"
            subtitle={`${overview.activeVehicles || 0} ${t('activeTrucks', 'active trucks')}`}
          />
          <StatCard
            title={t('unresolvedAlerts', 'UNRESOLVED ALERTS')}
            value={overview.unresolvedAlerts || 0}
            status={overview.unresolvedAlerts > 0 ? 'danger' : 'success'}
            subtitle={`${overview.criticalAlerts || 0} ${t('criticalThreats', 'critical threats')}`}
          />
        </div>
      )}

      {/* CURRENT ACTIVE SHIPMENT CARD */}
      <Card className="bg-darkCard border border-darkBorder shadow-lg">
        <CardHeader className="pb-3 border-b border-darkBorder flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-2">
            <Navigation className="w-4 h-4 text-customPrimary animate-pulse" />
            {t('currentActiveShipment', 'Current Active Shipment')}
          </CardTitle>
          {overview?.activeShipment && (
            <Badge variant={overview.activeShipment.status === 'DELIVERED' ? 'success' : overview.activeShipment.status === 'DELAYED' ? 'danger' : 'warning'}>
              {translateStatus(overview.activeShipment.status)}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {overview?.activeShipment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-darkBgSecondary/40 p-3 rounded-xl border border-darkBorder/40">
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('shipmentId', 'Shipment ID')}</span>
                  <strong className="text-sm font-mono font-bold text-customPrimary">{overview.activeShipment.shipmentId}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('cargo', 'Cargo')}</span>
                  <strong className="text-xs font-bold text-customText">{overview.activeShipment.goodsType || 'Cargo'} ({overview.activeShipment.quantity} {overview.activeShipment.unit || ''})</strong>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('assignedDriver', 'Assigned Driver')}</span>
                  <strong className="text-xs font-bold text-customText">{overview.activeShipment.assignedDriver?.name || t('unassigned', 'Unassigned')}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('assignedVehicle', 'Assigned Vehicle')}</span>
                  <strong className="text-xs font-bold font-mono text-cyan-400">{overview.activeShipment.assignedVehicle?.registrationNumber || overview.activeShipment.vehicleNumber || t('notSpecified', 'NOT SPECIFIED')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-darkBgSecondary/30 p-3 rounded-xl border border-darkBorder/40">
                  <div className="flex items-center gap-1.5 text-customMuted font-bold uppercase text-[9px] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('originLocation', 'Pickup Location / Origin')}</span>
                  </div>
                  <strong className="text-xs text-customText font-semibold block">{overview.activeShipment.pickup?.locationName || overview.activeShipment.pickup?.address || 'N/A'}</strong>
                </div>

                <div className="bg-darkBgSecondary/30 p-3 rounded-xl border border-darkBorder/40">
                  <div className="flex items-center gap-1.5 text-customMuted font-bold uppercase text-[9px] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-customDanger" />
                    <span>{t('destinationLocation', 'Destination')}</span>
                  </div>
                  <strong className="text-xs text-customText font-semibold block">{overview.activeShipment.destination?.locationName || overview.activeShipment.destination?.address || 'N/A'}</strong>
                </div>

                <div className="bg-darkBgSecondary/30 p-3 rounded-xl border border-darkBorder/40">
                  <div className="flex items-center gap-1.5 text-customMuted font-bold uppercase text-[9px] mb-1">
                    <Route className="w-3.5 h-3.5 text-customSecondary" />
                    <span>{t('adminSelectedRoute', 'Admin Selected Route')}</span>
                  </div>
                  <strong className="text-xs text-customText font-semibold block">{overview.activeShipment.selectedRoute?.name || t('pendingSelection', 'Pending Selection')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/30">
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('totalDistance', 'Total Distance')}</span>
                  <strong className="text-xs font-mono text-customText">{overview.activeShipment.selectedRoute?.distanceKm || 0} km</strong>
                </div>

                <div className="bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/30">
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('remainingDistance', 'Remaining Distance')}</span>
                  <strong className="text-xs font-mono text-customWarning">
                    {overview.activeShipment.status === 'DELIVERED' ? '0 km' : `${Math.max(0, Math.round((overview.activeShipment.selectedRoute?.distanceKm || 0) - (overview.activeShipment.actualDistanceTravelled || 0)))} km`}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/30">
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('eta', 'ETA')}</span>
                  <strong className="text-xs font-mono text-customSuccess">
                    {overview.activeShipment.status === 'DELIVERED' ? 'Delivered (0 mins)' : (overview.activeShipment.selectedRoute?.estimatedDurationMinutes ? `${Math.round(overview.activeShipment.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A')}
                  </strong>
                </div>

                <div className="bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/30">
                  <span className="text-[9px] text-customMuted block uppercase font-bold">{t('liveGpsStatus', 'Live GPS Status')}</span>
                  {overview.activeShipment.liveLocation?.latitude ? (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      {overview.activeShipment.liveLocation.latitude.toFixed(4)}, {overview.activeShipment.liveLocation.longitude.toFixed(4)} ({overview.activeShipment.liveLocation.speed || 0} km/h)
                    </span>
                  ) : (
                    <span className="text-[10px] text-customMuted italic block font-semibold">
                      Live GPS Signal: No data available
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-customMuted font-semibold italic">
              {t('noActiveShipment', 'No active shipment')}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap border-b border-darkBorder/60 select-none">
        {['overview', 'shipments', 'orders', 'vehicles', 'routes', 'alerts'].map((tab) => {
          let tabCount = null;
          if (tab === 'orders') {
            tabCount = finalFilteredOrders.length;
          } else if (tab !== 'overview') {
            tabCount = activeTab === tab ? filteredCategoryRecords.length : (reportData.records?.length || 0);
          }
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setFilterStatus('');
                setFilterSeverity('');
                setSearchTerm('');
              }}
              className={`px-5 py-3 font-bold uppercase tracking-wider text-[10px] border-b-2 cursor-pointer transition-all duration-200 ${
                activeTab === tab
                  ? 'border-customPrimary text-customPrimary bg-darkBgSecondary/10'
                  : 'border-transparent text-customMuted hover:text-customText'
              }`}
            >
              {t(tab, tab)} {tabCount !== null ? `(${tabCount})` : ''}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* SECTION 1: SHIPMENT PERFORMANCE & ORDER CONVERSION FUNNEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-customPrimary" />
                  {t('shipmentStatusDeliveryPerformance', 'Shipment Status & Delivery Performance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {overview ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('deliveredShipments', 'Delivered Shipments')}</span>
                      <strong className="text-customSuccess font-bold">{overview.deliveredShipments || 0} ({overview.deliveryCompletionRate || 0}%)</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('activeInTransit', 'Active In Transit')}</span>
                      <strong className="text-customWarning font-bold">{overview.activeShipments || 0}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('delayedShipments', 'Delayed Shipments')}</span>
                      <strong className="text-customDanger font-bold">{overview.delayedShipments || 0}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">{t('atRiskShipments', 'At-Risk Shipments')}</span>
                      <strong className="text-orange-400 font-bold">{overview.atRiskShipments || 0}</strong>
                    </div>
                  </div>
                ) : (
                  <LoadingSpinner size="sm" text={t('loading', 'Calculating performance metrics...')} />
                )}
              </CardContent>
            </Card>

            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-customSecondary" />
                  {t('logisticsOperationsFunnel', 'Logistics Operations Funnel (Order → Shipment)')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {overview ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">1. {t('totalOrdersLogged', 'Total Orders Logged')}</span>
                      <strong className="text-customText font-bold">{allDbOrders.length || overview.totalOrders || 0}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">2. {t('convertedToShipment', 'Converted to Logistics Shipment')}</span>
                      <strong className="text-customPrimary font-bold">{overview.convertedOrders || 0} ({overview.orderConversionRate || 0}%)</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">3. {t('dispatchedEnRoute', 'Dispatched En Route')}</span>
                      <strong className="text-customWarning font-bold">{overview.activeShipments || 0}</strong>
                    </div>
                    <div className="flex justify-between items-center bg-darkBgSecondary/40 p-2.5 rounded-lg border border-darkBorder/40">
                      <span className="text-customMuted font-semibold">4. {t('successfullyDelivered', 'Successfully Delivered')}</span>
                      <strong className="text-customSuccess font-bold">{overview.deliveredShipments || 0}</strong>
                    </div>
                  </div>
                ) : (
                  <LoadingSpinner size="sm" text={t('loading', 'Evaluating order funnel...')} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: ROUTE SAFETY & ENVIRONMENTAL HAZARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  {t('routeSafetyRiskProfile', 'Route Safety & AI Risk Profile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {overview ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-darkBgSecondary/50 p-3 rounded-lg border border-darkBorder/40">
                      <span className="text-[10px] text-customMuted block uppercase font-bold">{t('avgSafetyScore', 'Avg Safety Score')}</span>
                      <strong className="text-base text-customSuccess font-black">{overview.averageSafetyScore || 85}/100</strong>
                    </div>
                    <div className="bg-darkBgSecondary/50 p-3 rounded-lg border border-darkBorder/40">
                      <span className="text-[10px] text-customMuted block uppercase font-bold">{t('lowRisk', 'Low Risk')}</span>
                      <strong className="text-base text-customSuccess font-bold">{overview.lowRiskRoutes || 0}</strong>
                    </div>
                    <div className="bg-darkBgSecondary/50 p-3 rounded-lg border border-darkBorder/40">
                      <span className="text-[10px] text-customMuted block uppercase font-bold">{t('moderateRisk', 'Moderate Risk')}</span>
                      <strong className="text-base text-customWarning font-bold">{overview.moderateRiskRoutes || 0}</strong>
                    </div>
                    <div className="bg-darkBgSecondary/50 p-3 rounded-lg border border-darkBorder/40">
                      <span className="text-[10px] text-customMuted block uppercase font-bold">{t('highCritical', 'High / Critical')}</span>
                      <strong className="text-base text-customDanger font-bold">{(overview.highRiskRoutes || 0) + (overview.criticalRiskRoutes || 0)}</strong>
                    </div>
                  </div>
                ) : (
                  <LoadingSpinner size="sm" text={t('loading', 'Gathering route safety metrics...')} />
                )}
              </CardContent>
            </Card>

            <Card className="bg-darkCard border border-darkBorder">
              <CardHeader className="pb-3 border-b border-darkBorder flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-cyan-400" />
                  {t('environmentalHazardsBreakdown', 'Live Environmental Hazards Breakdown')}
                </CardTitle>
                {overview?.environmentalImpact?.lastUpdated && (
                  <span className="text-[10px] font-mono text-customMuted">
                    {t('lastUpdated', 'Last Updated')}: {new Date(overview.environmentalImpact.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {overview?.environmentalImpact ? (
                  overview.environmentalImpact.status === 'UNAVAILABLE' ? (
                    <div className="p-6 text-center text-customDanger/80 font-semibold italic">
                      {t('weatherUnavailable', 'Weather data temporarily unavailable')}
                      {overview.environmentalImpact.lastUpdated && (
                        <div className="text-[10px] text-customMuted font-normal mt-1">
                          {t('lastUpdated', 'Last Updated')}: {new Date(overview.environmentalImpact.lastUpdated).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : overview.environmentalImpact.totalEvaluatedShipments === 0 ? (
                    <div className="p-6 text-center text-customMuted italic font-medium">
                      {t('noDataAvailable', 'No environmental hazard data available')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('heavyRain', 'Heavy Rain')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.heavyRain || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('floodRisk', 'Flood Risk')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.floodRisk || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('stormRisk', 'Storm Risk')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.stormRisk || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('landslideRisk', 'Landslide Risk')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.landslideRisk || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('highWind', 'High Wind')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.highWind || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                      <div className="bg-darkBgSecondary/50 p-2.5 rounded-lg border border-darkBorder/40">
                        <span className="text-[10px] text-customMuted block font-medium">{t('poorVisibility', 'Poor Visibility')}</span>
                        <strong className="text-customText font-bold text-sm">{overview.environmentalImpact.poorVisibility || 0} {t('shipments', 'shipments')}</strong>
                      </div>
                    </div>
                  )
                ) : (
                  <LoadingSpinner size="sm" text={t('loading', 'Sampling weather telemetry...')} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: SYSTEM AUDIT LOGS TABLE */}
          <Card className="bg-darkCard border border-darkBorder">
            <CardHeader className="pb-3 border-b border-darkBorder">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-customPrimary" />
                {t('operationalAuditLogs', 'Operational System Audit Logs')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {overview?.auditLogs && overview.auditLogs.length > 0 ? (
                <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/20">
                      <th className="px-4 py-2.5">{t('timestamp', 'Timestamp')}</th>
                      <th className="px-4 py-2.5">{t('user', 'User')}</th>
                      <th className="px-4 py-2.5">{t('role', 'Role')}</th>
                      <th className="px-4 py-2.5">{t('action', 'Action')}</th>
                      <th className="px-4 py-2.5">{t('module', 'Module')}</th>
                      <th className="px-4 py-2.5">{t('referenceId', 'Reference ID')}</th>
                      <th className="px-4 py-2.5">{t('description', 'Description')}</th>
                      <th className="px-4 py-2.5 text-right">{t('status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/30">
                    {overview.auditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-darkBgSecondary/10 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-customMuted whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-bold text-customText whitespace-nowrap">{log.user}</td>
                        <td className="px-4 py-2.5 text-customMuted font-bold uppercase text-[9px] whitespace-nowrap">{log.role}</td>
                        <td className="px-4 py-2.5 font-semibold text-customPrimary whitespace-nowrap">{log.action}</td>
                        <td className="px-4 py-2.5 uppercase text-[9px] font-bold whitespace-nowrap">{log.module}</td>
                        <td className="px-4 py-2.5 font-mono text-customMuted select-all whitespace-nowrap">{log.reference}</td>
                        <td className="px-4 py-2.5 text-customText max-w-xs truncate">{log.description || '-'}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <Badge variant={log.status === 'FAILED' ? 'danger' : log.status === 'WARNING' ? 'warning' : 'success'}>
                            {translateStatus(log.status) || 'SUCCESS'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-customMuted italic font-medium">
                  No audit activity recorded for this reporting period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-darkCard border border-darkBorder p-3 rounded-xl">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-customMuted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder', 'Search shipments, vehicles...')}
                  className="w-full bg-darkBgSecondary border border-darkBorder text-customText placeholder-customMuted rounded-lg pl-9 pr-8 py-1.5 text-xs outline-none focus:border-customPrimary"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-customMuted hover:text-customText text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {activeTab === 'alerts' ? (
                <Select
                  label=""
                  placeholder=""
                  value={filterStatus || filterSeverity || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ACTIVE' || val === 'RESOLVED') {
                      setFilterStatus(val);
                      setFilterSeverity('');
                    } else if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(val)) {
                      setFilterStatus('');
                      setFilterSeverity(val);
                    } else {
                      setFilterStatus('');
                      setFilterSeverity('');
                    }
                  }}
                  options={getStatusOptions()}
                  className="w-44 text-[10px]"
                />
              ) : (
                <Select
                  label=""
                  placeholder=""
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={getStatusOptions()}
                  className="w-44 text-[10px]"
                />
              )}
            </div>

            <Button
              variant="primary"
              size="xs"
              onClick={handleCSVExport}
              disabled={isTabLoading || currentTabRecords.length === 0}
              className="font-bold uppercase tracking-wider text-[9px] py-1.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>

          <Card className="bg-darkCard border border-darkBorder">
            <CardContent className="p-0 overflow-x-auto min-h-[300px]">
              {isTabLoading ? (
                <div className="py-24 flex items-center justify-center">
                  <LoadingSpinner size="sm" text={activeTab === 'orders' ? t('loadingOrders', 'Loading Orders...') : `Syncing ${activeTab} audits database...`} />
                </div>
              ) : currentTabRecords.length === 0 ? (
                <div className="py-20 text-center text-customMuted font-semibold select-none">
                  <FileText className="w-8 h-8 text-customMuted mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">
                    {activeTab === 'orders' ? t('noOrdersFound', 'No Orders Found') : 'No records matching selected filters.'}
                  </p>
                  <p className="text-xs text-customMuted font-normal mt-1">
                    {activeTab === 'orders' ? t('noOrdersForPeriod', 'No orders available for this reporting period.') : 'Try adjusting search keywords or reporting period dates.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-darkBorder/40 text-customMuted font-bold bg-darkBgSecondary/15 select-none">
                      {activeTab === 'shipments' && (
                        <>
                          <th className="px-6 py-3">{t('shipmentId', 'Shipment ID')}</th>
                          <th className="px-4 py-3">{t('cargoDetails', 'Cargo Details')}</th>
                          <th className="px-4 py-3">{t('originLocation', 'Origin Location')}</th>
                          <th className="px-4 py-3">{t('destinationLocation', 'Destination Location')}</th>
                          <th className="px-4 py-3">{t('status', 'Status')}</th>
                          <th className="px-6 py-3 text-right">{t('dateLogged', 'Date Logged')}</th>
                        </>
                      )}
                      {activeTab === 'orders' && (
                        <>
                          <th className="px-6 py-3">{t('orderId', 'Order ID')}</th>
                          <th className="px-4 py-3">{t('cargo', 'Cargo')}</th>
                          <th className="px-4 py-3">{t('quantity', 'Quantity')}</th>
                          <th className="px-4 py-3">{t('pickupLocation', 'Pickup Location')}</th>
                          <th className="px-4 py-3">{t('destination', 'Destination')}</th>
                          <th className="px-4 py-3">{t('status', 'Status')}</th>
                          <th className="px-4 py-3">{t('assignedShipment', 'Assigned Shipment')}</th>
                          <th className="px-6 py-3 text-right">{t('createdDate', 'Created Date')}</th>
                        </>
                      )}
                      {activeTab === 'vehicles' && (
                        <>
                          <th className="px-6 py-3">{t('regNumber', 'Reg Number')}</th>
                          <th className="px-4 py-3">{t('vehicleType', 'Vehicle Type')}</th>
                          <th className="px-4 py-3">{t('status', 'Status')}</th>
                          <th className="px-4 py-3">{t('fuelType', 'Fuel Type')}</th>
                          <th className="px-6 py-3 text-right">{t('cargoCapacity', 'Cargo Capacity')}</th>
                        </>
                      )}
                      {activeTab === 'routes' && (
                        <>
                          <th className="px-6 py-3">{t('routeId', 'Route ID')}</th>
                          <th className="px-4 py-3">{t('routeName', 'Route Name')}</th>
                          <th className="px-4 py-3">{t('pickupLocation', 'Pickup Location')}</th>
                          <th className="px-4 py-3">{t('destinationLocation', 'Destination Location')}</th>
                          <th className="px-4 py-3">{t('totalDistance', 'Distance')}</th>
                          <th className="px-4 py-3">{t('eta', 'ETA')}</th>
                          <th className="px-4 py-3">{t('safetyScore', 'Safety Score')}</th>
                          <th className="px-4 py-3">{t('riskLevel', 'Risk Level')}</th>
                          <th className="px-6 py-3 text-right">{t('status', 'Status')}</th>
                        </>
                      )}
                      {activeTab === 'alerts' && (
                        <>
                          <th className="px-6 py-3">{t('alertId', 'Alert ID')}</th>
                          <th className="px-4 py-3">{t('shipmentRef', 'Shipment Ref')}</th>
                          <th className="px-4 py-3">{t('alertType', 'Alert Type')}</th>
                          <th className="px-4 py-3">{t('incidentTitle', 'Incident Title')}</th>
                          <th className="px-4 py-3">{t('severity', 'Severity')}</th>
                          <th className="px-4 py-3">{t('riskScore', 'Risk Score')}</th>
                          <th className="px-4 py-3">{t('corridorLocation', 'Corridor Location')}</th>
                          <th className="px-4 py-3">{t('status', 'Status')}</th>
                          <th className="px-6 py-3 text-right">{t('dateLogged', 'Date Logged')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkBorder/30">
                    {activeTab === 'orders' ? (
                      finalFilteredOrders.map((r) => {
                        const linkedShp = shipmentsMap[r._id] || shipmentsMap[r.orderId] || r.assignedShipment;
                        const shpDisplay = linkedShp?.shipmentId || (typeof r.assignedShipment === 'string' ? r.assignedShipment : null);

                        return (
                          <tr key={r._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                            <td className="px-6 py-3.5 font-mono font-bold text-customText select-all">
                              {r.orderId || ('ORD-' + r._id.toString().slice(-6).toUpperCase())}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-customText">
                              {r.cargoDescription || r.itemDescription || r.goodsType || 'Supplies'}
                            </td>
                            <td className="px-4 py-3.5 font-mono">
                              {r.quantity ? `${r.quantity} ${r.unit || ''}` : 'N/A'}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-customText">
                              {r.pickupLocation?.locationName || r.pickupLocation?.address || (typeof r.pickupLocation === 'string' ? r.pickupLocation : 'N/A')}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-customText">
                              {r.deliveryLocation?.locationName || r.deliveryLocation?.address || (typeof r.deliveryLocation === 'string' ? r.deliveryLocation : 'N/A')}
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant={r.status === 'DELIVERED' || r.status === 'COMPLETED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : r.status === 'ASSIGNED' ? 'info' : 'warning'}>
                                {translateStatus(r.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-customPrimary select-all">
                              {shpDisplay ? (
                                <span>{shpDisplay}</span>
                              ) : (
                                <span className="text-customMuted font-normal">{t('notAssigned', 'Not Assigned')}</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-customMuted whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      filteredCategoryRecords.map((r) => (
                        <tr key={r._id} className="hover:bg-darkBgSecondary/10 transition-colors">
                          {activeTab === 'shipments' && (
                            <>
                              <td className="px-6 py-3.5 font-mono font-bold text-customText select-all">{r.shipmentId}</td>
                              <td className="px-4 py-3.5 font-bold uppercase">{r.goodsType}</td>
                              <td className="px-4 py-3.5 font-semibold text-customText">{r.pickup?.locationName || r.pickup?.address || t('pickupLocation', 'Pickup Location')}</td>
                              <td className="px-4 py-3.5 font-semibold text-customText">{r.destination?.locationName || r.destination?.address || t('destinationLocation', 'Destination Location')}</td>
                              <td className="px-4 py-3.5">
                                <Badge variant={r.status === 'DELIVERED' ? 'success' : r.status === 'DELAYED' ? 'danger' : 'warning'}>
                                  {translateStatus(r.status)}
                                </Badge>
                              </td>
                              <td className="px-6 py-3.5 text-right font-mono text-customMuted select-none">
                                {new Date(r.createdAt).toLocaleString()}
                              </td>
                            </>
                          )}
                          {activeTab === 'vehicles' && (
                            <>
                              <td className="px-6 py-3.5 font-bold text-customText select-all">{r.registrationNumber}</td>
                              <td className="px-4 py-3.5 font-semibold uppercase">{r.vehicleType}</td>
                              <td className="px-4 py-3.5">
                                <Badge variant={r.currentStatus === 'AVAILABLE' ? 'success' : r.currentStatus === 'MAINTENANCE' ? 'danger' : 'warning'}>
                                  {translateStatus(r.currentStatus)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5 text-customMuted font-bold">{r.fuelType}</td>
                              <td className="px-6 py-3.5 text-right font-mono">{r.capacityWeight || r.capacity} {r.capacityUnit || 'kg'}</td>
                            </>
                          )}
                          {activeTab === 'routes' && (
                            <>
                              <td className="px-6 py-3.5 font-mono text-customMuted select-all">{r.corridorId || r.routeId}</td>
                              <td className="px-4 py-3.5 font-bold text-customText">{r.name || r.routeName}</td>
                              <td className="px-4 py-3.5 font-semibold text-customText">{typeof r.origin === 'object' ? (r.origin.locationName || r.origin.address) : (r.origin || t('pickupLocation', 'Pickup Location'))}</td>
                              <td className="px-4 py-3.5 font-semibold text-customText">{typeof r.destination === 'object' ? (r.destination.locationName || r.destination.address) : (r.destination || t('destinationLocation', 'Destination Location'))}</td>
                              <td className="px-4 py-3.5 font-mono">{r.distanceKm || r.distance} km</td>
                              <td className="px-4 py-3.5 font-mono">{r.durationMinutes || r.estimatedDuration} mins</td>
                              <td className="px-4 py-3.5 font-bold text-customSuccess">{r.safetyScore || 85}/100</td>
                              <td className="px-4 py-3.5"><Badge variant={r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH' ? 'danger' : r.riskLevel === 'MEDIUM' ? 'warning' : 'success'}>{translateSeverity(r.riskLevel || 'LOW')}</Badge></td>
                              <td className="px-6 py-3.5 text-right font-semibold">
                                <Badge variant={r.routeStatus === 'ACTIVE' ? 'success' : 'muted'}>
                                  {translateStatus(r.routeStatus || 'SELECTED')}
                                </Badge>
                              </td>
                            </>
                          )}
                          {activeTab === 'alerts' && (
                            <>
                              <td className="px-6 py-3.5 font-mono font-bold text-customText select-all">{r.alertId}</td>
                              <td className="px-4 py-3.5 font-mono font-bold text-customPrimary select-all">{r.relatedShipment?.shipmentId || t('shipments', 'Shipment')}</td>
                              <td className="px-4 py-3.5 uppercase font-bold text-[9px]">{translateAlertType(r.alertType)}</td>
                              <td className="px-4 py-3.5 font-semibold text-customText">{r.title}</td>
                              <td className="px-4 py-3.5">
                                <Badge variant={r.severity === 'CRITICAL' ? 'danger' : r.severity === 'HIGH' ? 'warning' : 'info'}>
                                  {translateSeverity(r.severity)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-customWarning">{(r.metadata?.riskScore || (r.metadata?.get ? r.metadata.get('riskScore') : null)) || (r.severity === 'CRITICAL' ? 85 : r.severity === 'HIGH' ? 65 : 45)}/100</td>
                              <td className="px-4 py-3.5 text-customMuted">{r.location?.region || r.location?.address || 'Corridor Region'}</td>
                              <td className="px-4 py-3.5">
                                <Badge variant={r.status === 'RESOLVED' ? 'success' : r.status === 'ACKNOWLEDGED' ? 'info' : 'danger'}>
                                  {translateStatus(r.status)}
                                </Badge>
                              </td>
                              <td className="px-6 py-3.5 text-right font-mono text-customMuted">
                                {new Date(r.createdAt).toLocaleString()}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Reports;
