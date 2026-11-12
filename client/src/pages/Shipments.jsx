import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, AlertCircle, FileText, Truck, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getShipments } from '../services/shipmentService';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';

const Shipments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity, translateGoodsType } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // State values
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination details
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Filter input states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [goodsTypeFilter, setGoodsTypeFilter] = useState(searchParams.get('goodsType') || '');

  // CENTRAL NAVIGATION PERMISSION CHECK
  const canCreateShipment = user && user.role === 'ADMIN';

  // Debounced search input trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchTerm) {
        newParams.set('search', searchTerm);
      } else {
        newParams.delete('search');
      }
      newParams.set('page', '1');
      setSearchParams(newParams);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleFilterChange = (key, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
  };

  // Fetch data
  useEffect(() => {
    const fetchShipmentsList = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: searchParams.get('page') || 1,
          limit: 10,
          search: searchParams.get('search') || '',
          status: searchParams.get('status') || '',
          priority: searchParams.get('priority') || '',
          goodsType: searchParams.get('goodsType') || '',
        };

        const res = await getShipments(params);
        if (res.data && res.data.success) {
          setShipments(res.data.data.shipments);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        console.error('Failed to load shipments:', err);
        if (!err.response) {
          setError('Unable to load shipment data. Check your connection and try again.');
        } else {
          setError(err.response?.data?.message || 'Failed to retrieve shipments registry data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentsList();
  }, [searchParams]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="neutral">{translateSeverity('LOW')}</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">{translateSeverity('MEDIUM')}</Badge>;
      case 'HIGH':
        return <Badge variant="warning">{translateSeverity('HIGH')}</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">{translateSeverity('CRITICAL')}</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    const text = translateStatus(status);
    switch (status) {
      case 'ROUTE_PENDING':
        return <Badge variant="neutral" className="border-slate-500/40 text-slate-400 bg-slate-500/10">{text}</Badge>;
      case 'ROUTE_SELECTED':
        return <Badge variant="primary" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10">{text}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info" className="border-blue-500/40 text-blue-400 bg-blue-500/10">{text}</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10">{text}</Badge>;
      case 'DELAYED':
        return <Badge variant="danger" className="border-red-500/40 text-red-400 bg-red-500/10">{text}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">{text}</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" className="border-gray-500/40 text-gray-500 bg-gray-500/10">{text}</Badge>;
      default:
        return <Badge variant="neutral">{text}</Badge>;
    }
  };

  const stats = {
    total: pagination.total || shipments.length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    atRisk: shipments.filter(s => s.status === 'AT_RISK').length,
    delivered: shipments.filter(s => s.status === 'DELIVERED').length
  };

  const goodsOptions = [
    { label: t('allCargoTypes', 'All Cargo Types'), value: '' },
    { label: t('medicines', 'Medicines'), value: 'MEDICINE' },
    { label: t('foodSupplies', 'Food Supplies'), value: 'FOOD' },
    { label: t('constructionMaterials', 'Construction Materials'), value: 'CONSTRUCTION_MATERIAL' },
    { label: t('agriculturalProduce', 'Agricultural Produce'), value: 'AGRICULTURAL_PRODUCE' }
  ];

  const priorityOptions = [
    { label: t('allPriorities', 'All Priorities'), value: '' },
    { label: translateSeverity('LOW'), value: 'LOW' },
    { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
    { label: translateSeverity('HIGH'), value: 'HIGH' },
    { label: translateSeverity('CRITICAL'), value: 'CRITICAL' }
  ];

  const statusOptions = [
    { label: t('allStatuses', 'All Statuses'), value: '' },
    { label: translateStatus('ROUTE_PENDING'), value: 'ROUTE_PENDING' },
    { label: translateStatus('ROUTE_SELECTED'), value: 'ROUTE_SELECTED' },
    { label: translateStatus('IN_TRANSIT'), value: 'IN_TRANSIT' },
    { label: translateStatus('AT_RISK'), value: 'AT_RISK' },
    { label: translateStatus('DELAYED'), value: 'DELAYED' },
    { label: translateStatus('DELIVERED'), value: 'DELIVERED' },
    { label: translateStatus('CANCELLED'), value: 'CANCELLED' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('shipments', 'Shipments')}
        description={t('shipmentRegistrySub', 'Manage logistics dispatches, assigned drivers, and live transit.')}
        actions={
          canCreateShipment && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs"
              onClick={() => navigate('/shipments/create')}
            >
              <Plus className="w-4 h-4" />
              <span>{t('createShipment', 'Create Shipment')}</span>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('totalShipments', 'Total Shipments')} value={stats.total} icon={FileText} description={t('inRegistry', 'total in registry')} />
        <StatCard title={t('activeShipments', 'In Transit')} value={stats.inTransit} icon={Truck} description={t('onTheRoad', 'cargo en route')} trendType="success" />
        <StatCard title={t('atRisk', 'At Risk')} value={stats.atRisk} icon={AlertTriangle} description={t('activeAlerts', 'active alerts')} trendType="danger" />
        <StatCard title={t('delivered', 'Delivered')} value={stats.delivered} icon={CheckCircle2} description={t('completedOrders', 'successful runs')} trendType="success" />
      </div>

      <Card className="p-4 bg-darkCard/80 border border-darkBorder">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-customMuted absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Search shipment ID, pickup or destination...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-darkBgSecondary text-xs text-customText placeholder-customMuted border border-darkBorder rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-customPrimary transition-colors"
            />
          </div>

          <Select
            label={t('alertStatus', 'Filter Status')}
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleFilterChange('status', e.target.value);
            }}
            placeholder=""
          />

          <Select
            label={t('priority', 'Filter Priority')}
            options={priorityOptions}
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              handleFilterChange('priority', e.target.value);
            }}
            placeholder=""
          />

          <Select
            label={t('cargo', 'Filter Goods Type')}
            options={goodsOptions}
            value={goodsTypeFilter}
            onChange={(e) => {
              setGoodsTypeFilter(e.target.value);
              handleFilterChange('goodsType', e.target.value);
            }}
            placeholder=""
          />
        </div>
      </Card>

      {loading ? (
        <Card className="min-h-[250px] flex items-center justify-center">
          <LoadingSpinner size="lg" text={t('loading', 'Retrieving shipments registry...')} />
        </Card>
      ) : error ? (
        <Card className="p-8 border border-customDanger/30 bg-customDanger/5 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-customDanger mx-auto" />
          <h3 className="font-bold text-customText text-base">{t('error', 'Retrieval Failure')}</h3>
          <p className="text-xs text-customMuted max-w-sm mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t('refresh', 'Retry Query')}
          </Button>
        </Card>
      ) : shipments.length === 0 ? (
        <EmptyState
          title={t('noActiveShipments', 'No Active Shipments')}
          description={
            searchTerm || statusFilter || priorityFilter || goodsTypeFilter
              ? t('noShipmentsMatchFilter', 'No shipments match your current query filters. Try resetting the dropdowns.')
              : t('noShipmentsRecorded', 'There are no shipment dispatches recorded.')
          }
          actionText={searchTerm || statusFilter || priorityFilter || goodsTypeFilter ? t('reset', 'Reset Query Filters') : null}
          onAction={
            searchTerm || statusFilter || priorityFilter || goodsTypeFilter
              ? () => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setGoodsTypeFilter('');
                  setSearchParams(new URLSearchParams());
                }
              : null
          }
        />
      ) : (
        <Card className="overflow-hidden p-0 border border-darkBorder">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-darkBorder text-customMuted font-bold uppercase tracking-wider bg-darkBgSecondary/30">
                  <th className="p-4">{t('shipmentId', 'Shipment ID')}</th>
                  <th className="p-4">{t('cargo', 'Goods Type')}</th>
                  <th className="p-4">{t('pickupLocation', 'Pickup Location')}</th>
                  <th className="p-4">{t('destination', 'Destination Target')}</th>
                  <th className="p-4 text-center">{t('priority', 'Priority')}</th>
                  <th className="p-4 text-center">{t('status', 'Status')}</th>
                  <th className="p-4">{t('date', 'Created Date')}</th>
                  <th className="p-4 text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder">
                {shipments.map((shipment) => (
                  <tr key={shipment._id} className="hover:bg-darkBgSecondary/20 transition-colors">
                    <td className="p-4 font-semibold text-customPrimary">{shipment.shipmentId}</td>
                    <td className="p-4 font-medium text-customText">
                      {translateGoodsType(shipment.goodsType)}
                    </td>
                    <td className="p-4 text-customMuted" title={shipment.pickup?.address}>
                      {shipment.pickup?.locationName}
                    </td>
                    <td className="p-4 text-customMuted" title={shipment.destination?.address}>
                      {shipment.destination?.locationName}
                    </td>
                    <td className="p-4 text-center">{getPriorityBadge(shipment.priority)}</td>
                    <td className="p-4 text-center">{getStatusBadge(shipment.status)}</td>
                    <td className="p-4 text-customMuted">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider"
                        onClick={() => navigate(`/shipments/${shipment._id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('viewDetails', 'Details')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-darkBorder p-4 flex items-center justify-between bg-darkBgSecondary/10 text-xs text-customMuted">
              <span>
                {t('showing', 'Showing page')} <strong className="text-customText">{pagination.page}</strong> {t('of', 'of')}{' '}
                <strong className="text-customText">{pagination.totalPages}</strong> ({pagination.total} {t('records', 'records')})
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1.5"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1.5"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Shipments;
