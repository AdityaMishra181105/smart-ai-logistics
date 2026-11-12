import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Eye, AlertCircle, FileText, Truck, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Trash2, Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../services/orderService';
import { getShipments, createShipmentFromOrder } from '../services/shipmentService';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, translateStatus, translateSeverity, isHindi } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shipments, setShipments] = useState([]);

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

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Create Order Form State
  const [formData, setFormData] = useState({
    customerName: '',
    contactInfo: '',
    pickupLocationName: '',
    pickupAddress: '',
    pickupLat: '',
    pickupLng: '',
    deliveryLocationName: '',
    deliveryAddress: '',
    deliveryLat: '',
    deliveryLng: '',
    cargoDescription: '',
    quantity: '',
    weight: '',
    priority: 'MEDIUM',
    requestedDeliveryDate: ''
  });

  // Details Modal Action States
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create Shipment from Order Modal States
  const [isCreateShipmentModalOpen, setIsCreateShipmentModalOpen] = useState(false);
  const [shipmentOrderTarget, setShipmentOrderTarget] = useState(null);
  const [shipmentFormData, setShipmentFormData] = useState({
    goodsType: 'FOOD',
    quantity: '',
    unit: 'KG',
    vehicleNumber: '',
    notes: ''
  });

  const handleOpenCreateShipment = (order) => {
    setShipmentOrderTarget(order);
    setShipmentFormData({
      goodsType: 'FOOD',
      quantity: order.quantity || '',
      unit: 'KG',
      vehicleNumber: '',
      notes: order.cargoDescription || ''
    });
    setFormError('');
    setSuccessMsg('');
    setIsCreateShipmentModalOpen(true);
  };

  const handleCreateShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!shipmentOrderTarget) return;
    setSubmitLoading(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const res = await createShipmentFromOrder(shipmentOrderTarget._id, shipmentFormData);
      if (res.data && res.data.success) {
        setSuccessMsg('Shipment created and linked to order successfully.');
        setTimeout(() => {
          setIsCreateShipmentModalOpen(false);
          setIsDetailsOpen(false);
          setSuccessMsg('');
          fetchOrdersList();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to create shipment from order:', err);
      setFormError(err.response?.data?.message || 'Failed to create shipment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Permissions helper
  const isOperatorOrAdmin = user && ['ADMIN', 'LOGISTICS_OPERATOR'].includes(user.role);
  const canCreateOrder = user && ['ADMIN', 'LOGISTICS_OPERATOR', 'NGO_SUPPLIER', 'NGO'].includes(user.role);

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

  // Synchronize dropdown changes
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setSearchParams({});
  };

  // Fetch active shipments list for dropdown selection (Operators only)
  useEffect(() => {
    const fetchShipmentsDropdown = async () => {
      if (isOperatorOrAdmin) {
        try {
          const res = await getShipments({ limit: 100 });
          if (res.data && res.data.success) {
            setShipments(res.data.data.shipments || []);
          }
        } catch (err) {
          console.error('Failed to load shipments registry:', err);
        }
      }
    };
    fetchShipmentsDropdown();
  }, [isOperatorOrAdmin, isCreateOpen, isDetailsOpen]);

  // Fetch orders from API
  const fetchOrdersList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: searchParams.get('page') || 1,
        limit: 10,
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
      };

      const res = await getOrders(params);
      if (res.data && res.data.success) {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      if (!err.response) {
        setError('Unable to load order data. Check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to retrieve orders registry data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersList();
  }, [searchParams]);

  // Open Details Modal and sync values
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setSelectedShipmentId(order.assignedShipment?._id || '');
    setIsDetailsOpen(true);
  };

  // Create Order Submit handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const orderPayload = {
        customerName: formData.customerName || user?.name || 'NGO Request',
        contactInfo: formData.contactInfo,
        pickupLocation: {
          locationName: formData.pickupLocationName,
          address: formData.pickupAddress || formData.pickupLocationName,
          latitude: formData.pickupLat ? parseFloat(formData.pickupLat) : 0,
          longitude: formData.pickupLng ? parseFloat(formData.pickupLng) : 0
        },
        deliveryLocation: {
          locationName: formData.deliveryLocationName,
          address: formData.deliveryAddress || formData.deliveryLocationName,
          latitude: formData.deliveryLat ? parseFloat(formData.deliveryLat) : 0,
          longitude: formData.deliveryLng ? parseFloat(formData.deliveryLng) : 0
        },
        cargoDescription: formData.cargoDescription,
        quantity: parseFloat(formData.quantity),
        weight: formData.weight ? parseFloat(formData.weight) : (parseFloat(formData.quantity) || 1),
        priority: formData.priority || 'MEDIUM',
        requestedDeliveryDate: formData.requestedDeliveryDate
      };

      const res = await createOrder(orderPayload);
      if (res.data && res.data.success) {
        setSuccessMsg('Order request submitted successfully.');
        // Reset form
        setFormData({
          customerName: user?.role === 'NGO' ? (user?.name || '') : '',
          contactInfo: '',
          pickupLocationName: '',
          pickupAddress: '',
          pickupLat: '',
          pickupLng: '',
          deliveryLocationName: '',
          deliveryAddress: '',
          deliveryLat: '',
          deliveryLng: '',
          cargoDescription: '',
          quantity: '',
          weight: '',
          priority: 'MEDIUM',
          requestedDeliveryDate: ''
        });
        setTimeout(() => {
          setIsCreateOpen(false);
          setSuccessMsg('');
          fetchOrdersList();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      setFormError(err.response?.data?.message || 'Failed to submit order request. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update Order settings / Status / Shipment Assignment
  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;
    setSubmitLoading(true);
    try {
      const updatePayload = {
        status: selectedStatus,
        assignedShipment: selectedShipmentId || null
      };

      const res = await updateOrder(selectedOrder._id, updatePayload);
      if (res.data && res.data.success) {
        setSuccessMsg('Order updated successfully.');
        // Refresh details order view
        setSelectedOrder(res.data.data);
        setTimeout(() => {
          setIsDetailsOpen(false);
          setSuccessMsg('');
          fetchOrdersList();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to update order details:', err);
      alert(err.response?.data?.message || 'Failed to apply order updates.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Order submit handler
  const handleDeleteSubmit = async (id, refId) => {
    const confirmed = window.confirm(`Are you sure you want to delete order ${refId}? This action is irreversible.`);
    if (!confirmed) return;

    setSubmitLoading(true);
    try {
      const res = await deleteOrder(id);
      if (res.data && res.data.success) {
        alert(`Order ${refId} deleted successfully.`);
        setIsDetailsOpen(false);
        fetchOrdersList();
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert(err.response?.data?.message || 'Failed to delete order.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Badges Resolvers
  const getPriorityBadge = (p) => {
    switch (p) {
      case 'LOW':
        return <Badge variant="neutral">{translateSeverity('LOW')}</Badge>;
      case 'MEDIUM':
        return <Badge variant="info">{translateSeverity('MEDIUM')}</Badge>;
      case 'HIGH':
        return <Badge variant="warning">{translateSeverity('HIGH')}</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">{translateSeverity('CRITICAL')}</Badge>;
      default:
        return <Badge variant="neutral">{p}</Badge>;
    }
  };

  const getStatusBadge = (s) => {
    const text = translateStatus(s);
    switch (s) {
      case 'PENDING':
        return <Badge variant="neutral" className="border-slate-500/40 text-slate-400 bg-slate-500/10">{text}</Badge>;
      case 'CONFIRMED':
        return <Badge variant="primary" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10">{text}</Badge>;
      case 'PROCESSING':
        return <Badge variant="info" className="border-blue-500/40 text-blue-400 bg-blue-500/10">{text}</Badge>;
      case 'ASSIGNED':
        return <Badge variant="info" className="border-purple-500/40 text-purple-400 bg-purple-500/10">{text}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10">{text}</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">{text}</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" className="border-red-500/30 text-red-400 bg-red-500/5">{text}</Badge>;
      default:
        return <Badge variant="neutral">{text}</Badge>;
    }
  };

  // Stats calculators
  const stats = {
    total: pagination.total || orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    inTransit: orders.filter(o => o.status === 'IN_TRANSIT').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length
  };

  const statusOptions = [
    { label: t('allStatuses', 'All Statuses'), value: '' },
    { label: translateStatus('PENDING'), value: 'PENDING' },
    { label: translateStatus('CONFIRMED'), value: 'CONFIRMED' },
    { label: translateStatus('PROCESSING'), value: 'PROCESSING' },
    { label: translateStatus('ASSIGNED'), value: 'ASSIGNED' },
    { label: translateStatus('IN_TRANSIT'), value: 'IN_TRANSIT' },
    { label: translateStatus('DELIVERED'), value: 'DELIVERED' },
    { label: translateStatus('CANCELLED'), value: 'CANCELLED' }
  ];

  const priorityOptions = [
    { label: t('allPriorities', 'All Priorities'), value: '' },
    { label: translateSeverity('LOW'), value: 'LOW' },
    { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
    { label: translateSeverity('HIGH'), value: 'HIGH' },
    { label: translateSeverity('CRITICAL'), value: 'CRITICAL' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={user?.role === 'NGO' ? t('ngoOrdersTitle', 'NGO Order Requests') : t('orders', 'Orders Registry')}
        description={user?.role === 'NGO' ? t('ngoOrdersSub', 'Submit and track relief cargo order requests.') : t('ordersRegistrySub', 'Monitor cargo orders and shipment dispatches.')}
        actions={
          canCreateOrder && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs"
              onClick={() => {
                if (user?.role === 'NGO' && !formData.customerName) {
                  setFormData(prev => ({ ...prev, customerName: user.name || '' }));
                }
                setIsCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>{t('createOrder', 'Create Order')}</span>
            </Button>
          )
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('totalOrders', 'Total Orders')} value={stats.total} icon={FileText} description={t('inDatabase', 'in database')} />
        <StatCard title={t('pendingReview', 'PENDING REVIEW')} value={stats.pending} icon={RefreshCw} description={t('awaitingDispatch', 'awaiting dispatch')} trendType="warning" />
        <StatCard title={t('activeShipments', 'In Transit')} value={stats.inTransit} icon={Truck} description={t('onTheRoad', 'on the road')} trendType="success" />
        <StatCard title={t('delivered', 'Delivered')} value={stats.delivered} icon={CheckCircle2} description={t('completedOrders', 'completed orders')} trendType="success" />
      </div>

      {/* Search and Filters */}
      <Card className="p-4 bg-darkCard/80 border border-darkBorder">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <div className="relative">
            <Search className="w-4 h-4 text-customMuted absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchOrdersPlaceholder', 'Search order reference, customer, cargo...')}
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

          <Button variant="outline" size="sm" className="h-9.5 justify-center" onClick={handleClearFilters}>
            {t('reset', 'Clear Filters')}
          </Button>
        </div>
      </Card>

      {/* Orders Grid Table */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" text="Loading orders registry..." />
        </div>
      ) : error ? (
        <Card className="border border-customDanger/20 bg-customDanger/5 p-6 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-customDanger" />
          <span className="text-xs font-semibold text-customText">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchOrdersList}>
            Retry Load
          </Button>
        </Card>
      ) : orders.length === 0 ? (
        <EmptyState
          title={t('noOrdersFound', 'No Orders Found')}
          description={t('noOrdersFoundSub', 'The active orders registry is empty. Clear search filters or create a new order dispatch.')}
          action={
            canCreateOrder ? (
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                {t('createOrder', 'Initiate First Order')}
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden border border-darkBorder bg-darkCard/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-darkBorder bg-darkBgSecondary/45 text-customMuted uppercase font-bold tracking-wider select-none">
                  <th className="p-4">{t('orderId', 'Order ID')}</th>
                  <th className="p-4">{t('customerName', 'Customer Name')}</th>
                  <th className="p-4">{t('pickupLocation', 'Pickup')}</th>
                  <th className="p-4">{t('destination', 'Delivery Target')}</th>
                  <th className="p-4">{t('priority', 'Priority')}</th>
                  <th className="p-4">{t('status', 'Status')}</th>
                  <th className="p-4">{t('assignedShipment', 'Linked Shipment')}</th>
                  <th className="p-4">{t('eta', 'ETA Target')}</th>
                  <th className="p-4 text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/40">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-darkBgSecondary/20 transition-colors">
                    <td className="p-4 font-bold text-customPrimary">{order.orderId}</td>
                    <td className="p-4 font-semibold text-customText">{order.customerName}</td>
                    <td className="p-4 text-customMuted max-w-[120px] truncate">{order.pickupLocation?.locationName}</td>
                    <td className="p-4 text-customMuted max-w-[120px] truncate">{order.deliveryLocation?.locationName}</td>
                    <td className="p-4">{getPriorityBadge(order.priority)}</td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-xs font-bold">
                      {order.assignedShipment ? (
                        <span className="text-customSecondary">{order.assignedShipment.shipmentId}</span>
                      ) : (
                        <span className="text-customMuted italic text-[10px]">{t('unassigned', 'Unassigned')}</span>
                      )}
                    </td>
                    <td className="p-4 text-customMuted">{new Date(order.requestedDeliveryDate).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!order.assignedShipment && isOperatorOrAdmin ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 bg-customPrimary hover:bg-customPrimary/90 text-darkBg"
                            onClick={() => handleOpenCreateShipment(order)}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{t('createShipment', 'Create Shipment')}</span>
                          </Button>
                        ) : order.assignedShipment ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-customSecondary border-customSecondary/30 hover:bg-customSecondary/10"
                            onClick={() => navigate(`/shipments/${order.assignedShipment._id || order.assignedShipment}`)}
                          >
                            <Link className="w-3.5 h-3.5" />
                            <span>{t('viewDetails', 'View Shipment')}</span>
                          </Button>
                        ) : null}

                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider"
                          onClick={() => handleOpenDetails(order)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('inspect', 'INSPECT')}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-t border-darkBorder bg-darkBgSecondary/15 select-none">
            <span className="text-xs text-customMuted">
              {isHindi ? (
                <>
                  पृष्ठ <span className="font-bold text-customText">{pagination.page}</span> का <span className="font-bold text-customText">{pagination.totalPages}</span>
                </>
              ) : (
                <>
                  Showing page <span className="font-bold text-customText">{pagination.page}</span> of{' '}
                  <span className="font-bold text-customText">{pagination.totalPages}</span>
                </>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="p-2"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={user?.role === 'NGO' ? t('createOrderRequestTitle', 'Create Order Request') : t('initiateNewOrderTitle', 'Initiate New Order Request')}
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('customerNameOrgLabel', 'Customer Name / NGO Organization')}
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
            <Input
              label={t('contactInfoLabel', 'Contact Info')}
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              placeholder="+91-XXXXX-XXXXX"
            />
          </div>

          <div className="border-t border-darkBorder/40 pt-3">
            <h4 className="font-semibold text-customSecondary uppercase tracking-wider mb-2">{t('pickupDetails', 'Pickup Details')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('pickupLocationName', 'Pickup Location Name')}
                value={formData.pickupLocationName}
                onChange={(e) => setFormData({ ...formData, pickupLocationName: e.target.value })}
                required
              />
              <Input
                label={t('pickupAddress', 'Pickup Address')}
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-darkBorder/40 pt-3">
            <h4 className="font-semibold text-customSecondary uppercase tracking-wider mb-2">{t('deliveryDetails', 'Delivery Details')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('destinationLocationName', 'Destination Location Name')}
                value={formData.deliveryLocationName}
                onChange={(e) => setFormData({ ...formData, deliveryLocationName: e.target.value })}
                required
              />
              <Input
                label={t('destinationAddress', 'Destination Address')}
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-darkBorder/40 pt-3">
            <h4 className="font-semibold text-customSecondary uppercase tracking-wider mb-2">{t('cargoSpecifications', 'Cargo Specifications')}</h4>
            <Input
              label={t('cargoDescriptionLabel', 'Cargo Description')}
              value={formData.cargoDescription}
              onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <Input
                label={t('quantityUnits', 'Quantity / Units')}
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
              <Input
                label={t('weightKg', 'Weight (KG)')}
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder={t('optional', 'Optional')}
              />
              <Select
                label={t('priorityRank', 'Priority Rank')}
                options={[
                  { label: translateSeverity('LOW'), value: 'LOW' },
                  { label: translateSeverity('MEDIUM'), value: 'MEDIUM' },
                  { label: translateSeverity('HIGH'), value: 'HIGH' },
                  { label: translateSeverity('CRITICAL'), value: 'CRITICAL' }
                ]}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <Input
                label={t('requestedDeliveryDateEta', 'Requested Delivery Date (ETA)')}
                type="date"
                value={formData.requestedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, requestedDeliveryDate: e.target.value })}
                required
              />
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold">
              {successMsg}
            </div>
          )}

          <div className="border-t border-darkBorder/40 pt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)} disabled={submitLoading}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitLoading} disabled={submitLoading}>
              {user?.role === 'NGO' ? t('submitOrderRequest', 'SUBMIT ORDER REQUEST') : t('initiateOrder', 'Initiate Order')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`${t('orderInspection', 'Order Inspection')}: ${selectedOrder.orderId}`}
          size="md"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {successMsg && (
              <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold">
                {successMsg}
              </div>
            )}

            {/* Core details */}
            <div className="grid grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted block mb-0.5">{t('customerOrg', 'Customer / Organization')}</span>
                <span className="font-bold text-customText text-sm block">{selectedOrder.customerName}</span>
                {selectedOrder.contactInfo && (
                  <span className="text-customMuted block mt-0.5">{selectedOrder.contactInfo}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-customMuted block mb-1">{t('statusPriority', 'Status / Priority')}</span>
                <div className="flex justify-end gap-1.5">
                  {getPriorityBadge(selectedOrder.priority)}
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1.5 text-customSecondary">
                  {t('pickupPoint', 'Pickup point')}
                </span>
                <span className="font-bold text-customText block">{selectedOrder.pickupLocation?.locationName}</span>
                <span className="text-customMuted block mt-0.5">{selectedOrder.pickupLocation?.address || t('addressUnlisted', 'Address unlisted')}</span>
              </div>
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1.5 text-customSecondary">
                  {t('deliveryPoint', 'Delivery point')}
                </span>
                <span className="font-bold text-customText block">{selectedOrder.deliveryLocation?.locationName}</span>
                <span className="text-customMuted block mt-0.5">{selectedOrder.deliveryLocation?.address || t('addressUnlisted', 'Address unlisted')}</span>
              </div>
            </div>

            {/* Cargo Parameters */}
            <div className="bg-darkBgSecondary/60 border border-darkBorder p-3 rounded-lg grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-customMuted block">{t('cargoSpecification', 'Cargo Specification')}</span>
                <span className="font-semibold text-customText mt-0.5 block truncate" title={selectedOrder.cargoDescription}>
                  {selectedOrder.cargoDescription}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-customMuted block">{t('totalLoad', 'Total Load')}</span>
                <span className="font-semibold text-customText mt-0.5 block">{selectedOrder.weight} KG</span>
              </div>
              <div>
                <span className="text-[10px] text-customMuted block">{t('unitsQuantity', 'Units / Quantity')}</span>
                <span className="font-semibold text-customText mt-0.5 block">{selectedOrder.quantity} Units</span>
              </div>
            </div>

            {/* Assigned Shipment Information */}
            <div className="border-t border-darkBorder/40 pt-4">
              <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px] mb-2.5 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                {t('linkedShipmentAssignment', 'Linked Shipment Assignment')}
              </h4>
              {selectedOrder.assignedShipment ? (
                <div className="bg-darkBgSecondary border border-darkBorder rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-customText text-xs block">{selectedOrder.assignedShipment.shipmentId}</span>
                    <span className="text-[10px] text-customMuted block mt-0.5">{t('status', 'Status')}: {translateStatus(selectedOrder.assignedShipment.status)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                    onClick={() => navigate(`/shipments/${selectedOrder.assignedShipment._id || selectedOrder.assignedShipment}`)}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>{t('viewShipment', 'View Shipment')}</span>
                  </Button>
                </div>
              ) : (
                <div className="bg-darkBgSecondary/30 border border-dashed border-darkBorder rounded-lg p-3.5 text-center text-customMuted space-y-2">
                  <span>{t('noActiveShipmentAssigned', 'No active shipment assigned yet.')}</span>
                  {isOperatorOrAdmin && (
                    <div className="pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        className="mx-auto flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs bg-customPrimary text-darkBg"
                        onClick={() => handleOpenCreateShipment(selectedOrder)}
                      >
                        <Truck className="w-4 h-4" />
                        <span>{t('createShipment', 'Create Shipment')}</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operator Actions Card (Status and Shipment updates) */}
            {isOperatorOrAdmin && (
              <div className="border-t border-darkBorder/40 pt-4 space-y-4">
                <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px]">
                  Operator Controls
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Update Status Option"
                    options={[
                      { label: 'Pending', value: 'PENDING' },
                      { label: 'Confirmed', value: 'CONFIRMED' },
                      { label: 'Processing', value: 'PROCESSING' },
                      { label: 'Assigned', value: 'ASSIGNED' },
                      { label: 'In Transit', value: 'IN_TRANSIT' },
                      { label: 'Delivered', value: 'DELIVERED' },
                      { label: 'Cancelled', value: 'CANCELLED' }
                    ]}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    placeholder=""
                  />
                  <Select
                    label="Assign to Shipment"
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...shipments.map(s => ({
                        label: `${s.shipmentId} (${s.goodsType} - ${s.status})`,
                        value: s._id
                      }))
                    ]}
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    placeholder="Select active shipment"
                  />
                </div>
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-darkBorder/40">
                  <Button
                    variant="outline"
                    className="hover:bg-customDanger/10 hover:border-customDanger/30 hover:text-customDanger text-xs font-semibold uppercase tracking-wider flex items-center gap-1 border-darkBorder"
                    onClick={() => handleDeleteSubmit(selectedOrder._id, selectedOrder.orderId)}
                    disabled={submitLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold uppercase tracking-wider"
                    onClick={handleUpdateSubmit}
                    loading={submitLoading}
                    disabled={submitLoading}
                  >
                    Apply Controls
                  </Button>
                </div>
              </div>
            )}

            {/* Status History Timeline */}
            <div className="border-t border-darkBorder/40 pt-4">
              <h4 className="font-semibold text-customSecondary uppercase tracking-wider text-[10px] mb-3">
                {t('trackingHistoryLog', 'Tracking History Log')}
              </h4>
              <div className="relative border-l border-darkBorder/60 ml-2.5 pl-4.5 space-y-4">
                {selectedOrder.statusHistory?.map((history, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-7 top-0.5 w-3 h-3 bg-customPrimary border-2 border-darkCard rounded-full" />
                    <div>
                      <span className="font-bold text-customText">{history.status}</span>
                      <span className="text-[10px] text-customMuted block mt-0.5">
                        {new Date(history.timestamp).toLocaleString()}
                        {history.changedBy && ` by ${history.changedBy.name || history.changedBy.email}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE SHIPMENT FROM ORDER MODAL */}
      {shipmentOrderTarget && (
        <Modal
          isOpen={isCreateShipmentModalOpen}
          onClose={() => setIsCreateShipmentModalOpen(false)}
          title={`Create Shipment for Order ${shipmentOrderTarget.orderId}`}
          size="md"
        >
          <form onSubmit={handleCreateShipmentSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {formError && (
              <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg font-semibold">
                {formError}
              </div>
            )}

            {/* Pre-filled Order Info Banner */}
            <div className="p-3 bg-darkBgSecondary/60 border border-darkBorder rounded-lg space-y-1">
              <span className="text-[10px] text-customSecondary uppercase font-bold tracking-wider block">Auto-populated Order Data</span>
              <div className="grid grid-cols-2 gap-2 text-customMuted">
                <div>Customer: <strong className="text-customText">{shipmentOrderTarget.customerName}</strong></div>
                <div>Priority: <strong className="text-customText">{shipmentOrderTarget.priority}</strong></div>
                <div>Pickup: <strong className="text-customText">{shipmentOrderTarget.pickupLocation?.locationName}</strong></div>
                <div>Destination: <strong className="text-customText">{shipmentOrderTarget.deliveryLocation?.locationName}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Goods Type Specification"
                options={[
                  { label: 'Food & Emergency Rations', value: 'FOOD' },
                  { label: 'Medical Supplies', value: 'MEDICINE' },
                  { label: 'Agricultural Produce', value: 'AGRICULTURAL_PRODUCE' },
                  { label: 'Construction & Shelter Materials', value: 'CONSTRUCTION_MATERIAL' }
                ]}
                value={shipmentFormData.goodsType}
                onChange={(e) => setShipmentFormData({ ...shipmentFormData, goodsType: e.target.value })}
                required
              />
              <Select
                label="Unit Measurement"
                options={[
                  { label: 'Kilograms (KG)', value: 'KG' },
                  { label: 'Metric Tons (TON)', value: 'TON' },
                  { label: 'Boxes (BOX)', value: 'BOX' },
                  { label: 'Packets (PACKET)', value: 'PACKET' },
                  { label: 'Litres (LITRE)', value: 'LITRE' },
                  { label: 'Units (UNIT)', value: 'UNIT' }
                ]}
                value={shipmentFormData.unit}
                onChange={(e) => setShipmentFormData({ ...shipmentFormData, unit: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                value={shipmentFormData.quantity}
                onChange={(e) => setShipmentFormData({ ...shipmentFormData, quantity: e.target.value })}
                required
              />
              <Input
                label="Assigned Vehicle Registration #"
                placeholder="e.g. MH-12-AB-1234"
                value={shipmentFormData.vehicleNumber}
                onChange={(e) => setShipmentFormData({ ...shipmentFormData, vehicleNumber: e.target.value })}
              />
            </div>

            <Input
              label="Shipment Notes / Dispatch Instructions"
              value={shipmentFormData.notes}
              onChange={(e) => setShipmentFormData({ ...shipmentFormData, notes: e.target.value })}
            />

            {successMsg && (
              <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold">
                {successMsg}
              </div>
            )}

            <div className="border-t border-darkBorder/40 pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateShipmentModalOpen(false)} disabled={submitLoading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={submitLoading} disabled={submitLoading} className="bg-customPrimary text-darkBg font-bold">
                Generate Shipment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
