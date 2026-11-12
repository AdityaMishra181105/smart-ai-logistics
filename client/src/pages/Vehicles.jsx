import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, AlertCircle, Shield, Truck, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Trash2, Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getVehicles, createVehicle, deleteVehicle, getVehicleStats, updateVehicleStatus, assignShipmentToVehicle } from '../services/vehicleService';
import { getShipments } from '../services/shipmentService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';

const Vehicles = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, translateStatus } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Core State
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    inTransit: 0,
    maintenance: 0,
    inactive: 0
  });
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
  const [typeFilter, setTypeFilter] = useState(searchParams.get('vehicleType') || '');
  const [availableFilter, setAvailableFilter] = useState(searchParams.get('available') || '');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    registrationNumber: '',
    vehicleType: 'TRUCK',
    capacity: '',
    capacityUnit: 'TON',
    currentStatus: 'AVAILABLE',
    locationName: 'Guwahati Depot',
    locationAddress: '',
    fuelType: 'DIESEL',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    notes: ''
  });

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const isOperatorOrAdmin = user && user.role === 'ADMIN';

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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setAvailableFilter('');
    setSearchParams({});
  };

  useEffect(() => {
    const fetchRelations = async () => {
      if (isOperatorOrAdmin) {
        try {
          const shipmentsRes = await getShipments({ limit: 100 });
          if (shipmentsRes.data?.success) setShipments(shipmentsRes.data.data.shipments || []);
        } catch (err) {
          console.error('Failed to load active shipments:', err);
        }
      }
    };
    fetchRelations();
  }, [isOperatorOrAdmin, isCreateOpen, isDetailsOpen]);

  const fetchVehiclesList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: searchParams.get('page') || 1,
        limit: 10,
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || '',
        vehicleType: searchParams.get('vehicleType') || '',
        available: searchParams.get('available') || ''
      };

      const [listRes, statsRes] = await Promise.all([
        getVehicles(params),
        getVehicleStats()
      ]);

      if (listRes.data?.success) {
        setVehicles(listRes.data.data);
        setPagination(listRes.data.pagination);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load vehicles list:', err);
      if (!err.response) {
        setError('Unable to load vehicle data. Check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to retrieve vehicles database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesList();
  }, [searchParams]);

  const handleOpenDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedStatus(vehicle.currentStatus);
    setSelectedShipmentId(vehicle.assignedShipment?._id || '');
    setIsDetailsOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const payload = {
        registrationNumber: formData.registrationNumber,
        vehicleType: formData.vehicleType,
        capacity: parseFloat(formData.capacity),
        capacityUnit: formData.capacityUnit,
        currentStatus: formData.currentStatus,
        currentLocation: {
          locationName: formData.locationName,
          address: formData.locationAddress,
        },
        fuelType: formData.fuelType,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        nextMaintenanceDate: formData.nextMaintenanceDate || null,
        notes: formData.notes
      };

      const res = await createVehicle(payload);
      if (res.data && res.data.success) {
        setSuccessMsg('Vehicle registered successfully.');
        setFormData({
          registrationNumber: '',
          vehicleType: 'TRUCK',
          capacity: '',
          capacityUnit: 'TON',
          currentStatus: 'AVAILABLE',
          locationName: 'Guwahati Depot',
          locationAddress: '',
          fuelType: 'DIESEL',
          lastMaintenanceDate: '',
          nextMaintenanceDate: '',
          notes: ''
        });
        setTimeout(() => {
          setIsCreateOpen(false);
          setSuccessMsg('');
          fetchVehiclesList();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to register vehicle:', err);
      setFormError(err.response?.data?.message || 'Failed to submit vehicle details. Check inputs.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedVehicle) return;
    setSubmitLoading(true);
    try {
      const updates = [];

      if (selectedStatus && selectedStatus !== selectedVehicle.currentStatus) {
        const statusRes = await updateVehicleStatus(selectedVehicle._id, selectedStatus);
        if (statusRes.data && statusRes.data.success) {
          updates.push('status');
        }
      }

      const currentShipmentId = selectedVehicle.assignedShipment?._id || '';
      if (selectedShipmentId !== currentShipmentId) {
        const shipmentRes = await assignShipmentToVehicle(selectedVehicle._id, selectedShipmentId || null);
        if (shipmentRes.data && shipmentRes.data.success) {
          updates.push('shipment');
        }
      }

      if (updates.length > 0) {
        setSuccessMsg('Vehicle updated successfully.');
        setTimeout(() => {
          setIsDetailsOpen(false);
          setSuccessMsg('');
          fetchVehiclesList();
        }, 1500);
      } else {
        setSuccessMsg('No changes detected.');
        setTimeout(() => {
          setSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to update vehicle:', err);
      alert(err.response?.data?.message || 'Failed to update vehicle parameters.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async (id, regNum) => {
    const confirmed = window.confirm(`Are you sure you want to delete vehicle registry record ${regNum}?`);
    if (!confirmed) return;

    setSubmitLoading(true);
    try {
      const res = await deleteVehicle(id);
      if (res.data && res.data.success) {
        alert(`Vehicle ${regNum} deleted successfully.`);
        setIsDetailsOpen(false);
        fetchVehiclesList();
      }
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      alert(err.response?.data?.message || 'Failed to delete vehicle.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (s) => {
    const text = translateStatus(s);
    switch (s) {
      case 'AVAILABLE':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">{text}</Badge>;
      case 'ASSIGNED':
        return <Badge variant="info" className="border-blue-500/40 text-blue-400 bg-blue-500/10">{text}</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10">{text}</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="danger" className="border-red-500/40 text-red-400 bg-red-500/10">{text}</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral" className="border-gray-500/40 text-gray-500 bg-gray-500/10">{text}</Badge>;
      default:
        return <Badge variant="neutral">{text}</Badge>;
    }
  };

  const statusOptions = [
    { label: t('allStatuses', 'All Statuses'), value: '' },
    { label: translateStatus('AVAILABLE'), value: 'AVAILABLE' },
    { label: translateStatus('ASSIGNED'), value: 'ASSIGNED' },
    { label: translateStatus('IN_TRANSIT'), value: 'IN_TRANSIT' },
    { label: translateStatus('MAINTENANCE'), value: 'MAINTENANCE' },
    { label: translateStatus('INACTIVE'), value: 'INACTIVE' }
  ];

  const typeOptions = [
    { label: t('allTypes', 'All Types'), value: '' },
    { label: t('truck', 'Truck'), value: 'TRUCK' },
    { label: t('van', 'Van'), value: 'VAN' },
    { label: t('pickup', 'Pickup'), value: 'PICKUP' },
    { label: t('motorcycle', 'Motorcycle'), value: 'MOTORCYCLE' },
    { label: t('other', 'Other'), value: 'OTHER' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('vehicles', 'Vehicles Registry')}
        description={t('vehiclesDatabaseSub', 'Monitor vehicle states and fleet details.')}
        actions={
          isOperatorOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>{t('addVehicle', 'Add Vehicle')}</span>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title={t('totalVehicles', 'Total Fleet')} value={stats.total} icon={Shield} description={t('registeredUnits', 'registered units')} />
        <StatCard title={t('available', 'Available Units')} value={stats.available} icon={CheckCircle2} description={t('readyToDispatch', 'ready to dispatch')} trendType="success" />
        <StatCard title={t('activeVehicles', 'Assigned / Active')} value={stats.assigned + stats.inTransit} icon={Truck} description={t('fleetEnRoute', 'fleet en route')} trendType="success" />
        <StatCard title={t('maintenance', 'In Maintenance')} value={stats.maintenance} icon={AlertTriangle} description={t('repairWorkshop', 'repair workshop')} trendType="warning" />
        <StatCard title={t('inactiveStatus', 'Inactive status')} value={stats.inactive} icon={AlertCircle} description={t('stagedInactive', 'staged inactive')} trendType="danger" />
      </div>

      <Card className="p-4 bg-darkCard/80 border border-darkBorder">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-end">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-customMuted absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Search registration, ID...')}
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
            label={t('vehicleType', 'Filter Vehicle Type')}
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              handleFilterChange('vehicleType', e.target.value);
            }}
            placeholder=""
          />

          <Select
            label={t('available', 'Availability')}
            options={[
              { label: t('allUnits', 'All Units'), value: '' },
              { label: t('availableUnassigned', 'Available (Unassigned)'), value: 'true' }
            ]}
            value={availableFilter}
            onChange={(e) => {
              setAvailableFilter(e.target.value);
              handleFilterChange('available', e.target.value);
            }}
            placeholder=""
          />

          <Button variant="outline" size="sm" className="h-9.5 justify-center" onClick={handleClearFilters}>
            {t('reset', 'Clear Filters')}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" text={t('loading', 'Loading vehicle data...')} />
        </div>
      ) : error ? (
        <Card className="border border-customDanger/20 bg-customDanger/5 p-6 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-customDanger" />
          <span className="text-xs font-semibold text-customText">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchVehiclesList}>
            {t('refresh', 'Retry Load')}
          </Button>
        </Card>
      ) : vehicles.length === 0 ? (
        <EmptyState
          title={t('noVehiclesFound', 'No Vehicles Registered')}
          description={t('noVehiclesSub', 'The active vehicles registry is empty.')}
          action={
            isOperatorOrAdmin ? (
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                {t('addVehicle', 'Add First Vehicle')}
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
                  <th className="p-4">{t('vehicleId', 'Vehicle ID')}</th>
                  <th className="p-4">{t('registrationNumber', 'Reg Number')}</th>
                  <th className="p-4">{t('vehicleType', 'Type')}</th>
                  <th className="p-4">{t('capacity', 'Capacity')}</th>
                  <th className="p-4">{t('status', 'Status')}</th>
                  <th className="p-4">{t('assignedShipment', 'Linked Shipment')}</th>
                  <th className="p-4">{t('currentDepot', 'Current Depot')}</th>
                  <th className="p-4 text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/40">
                {vehicles.map((v) => (
                  <tr key={v._id} className="hover:bg-darkBgSecondary/20 transition-colors">
                    <td className="p-4 font-bold text-customPrimary">{v.vehicleId}</td>
                    <td className="p-4 font-black text-customText uppercase">{v.registrationNumber}</td>
                    <td className="p-4 text-customText">{v.vehicleType}</td>
                    <td className="p-4 text-customMuted font-semibold">{v.capacity} {v.capacityUnit}</td>
                    <td className="p-4">{getStatusBadge(v.currentStatus)}</td>
                    <td className="p-4 font-bold">
                      {v.assignedShipment ? (
                        <span className="text-customSecondary">{v.assignedShipment.shipmentId}</span>
                      ) : (
                        <span className="text-customMuted italic text-[10px]">{t('unassigned', 'Unassigned')}</span>
                      )}
                    </td>
                    <td className="p-4 text-customMuted truncate max-w-[120px]">{v.currentLocation?.locationName || t('unassigned', 'Unassigned')}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider"
                        onClick={() => handleOpenDetails(v)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('inspect', 'INSPECT')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-darkBorder bg-darkBgSecondary/15 select-none">
            <span className="text-xs text-customMuted">
              Showing page <span className="font-bold text-customText">{pagination.page}</span> of{' '}
              <span className="font-bold text-customText">{pagination.totalPages}</span>
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

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Fleet Vehicle"
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
              label="Registration License Plate"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              placeholder="e.g. AS-01-EB-1234"
              required
            />
            <Select
              label="Vehicle Model Type"
              options={[
                { label: 'Truck', value: 'TRUCK' },
                { label: 'Van', value: 'VAN' },
                { label: 'Pickup', value: 'PICKUP' },
                { label: 'Motorcycle', value: 'MOTORCYCLE' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-darkBorder/40 pt-3">
            <Input
              label="Load Capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
            <Select
              label="Capacity Unit"
              options={[
                { label: 'KG', value: 'KG' },
                { label: 'TON', value: 'TON' }
              ]}
              value={formData.capacityUnit}
              onChange={(e) => setFormData({ ...formData, capacityUnit: e.target.value })}
            />
            <Select
              label="Fuel Source type"
              options={[
                { label: 'Diesel', value: 'DIESEL' },
                { label: 'Petrol', value: 'PETROL' },
                { label: 'Electric', value: 'ELECTRIC' },
                { label: 'CNG', value: 'CNG' },
                { label: 'Hybrid', value: 'HYBRID' }
              ]}
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
            />
          </div>

          <div className="border-t border-darkBorder/40 pt-3">
            <Input
              label="Hub Depot Name"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            />
          </div>

          <div className="border-t border-darkBorder/40 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Last Maintenance Inspection"
              type="date"
              value={formData.lastMaintenanceDate}
              onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
            />
            <Input
              label="Next Scheduled Inspection"
              type="date"
              value={formData.nextMaintenanceDate}
              onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
            />
          </div>

          <Input
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Log notes, fleet classifications..."
          />

          {successMsg && (
            <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold">
              {successMsg}
            </div>
          )}

          <div className="border-t border-darkBorder/40 pt-4 flex justify-end gap-2 text-xs">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitLoading} disabled={submitLoading}>
              Register Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* VEHICLE DETAILS MODAL */}
      {selectedVehicle && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Fleet Unit Inspection: ${selectedVehicle.vehicleId}`}
          size="md"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {successMsg && (
              <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted block mb-0.5">Registration Plate</span>
                <span className="font-black text-customText text-base block uppercase tracking-wider">{selectedVehicle.registrationNumber}</span>
                <span className="text-[10px] text-customMuted block mt-0.5">{selectedVehicle.vehicleType} unit • Fuel: {selectedVehicle.fuelType}</span>
              </div>
              <div className="text-right">
                <span className="text-customMuted block mb-1">Status / Capacity</span>
                <div className="flex justify-end gap-1.5 items-center">
                  {getStatusBadge(selectedVehicle.currentStatus)}
                  <Badge variant="neutral" className="border-darkBorder bg-darkBgSecondary">{selectedVehicle.capacity} {selectedVehicle.capacityUnit}</Badge>
                </div>
              </div>
            </div>

            <div className="border-b border-darkBorder/40 pb-4 grid grid-cols-2 gap-2">
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customSecondary">Depot location</span>
                <span className="font-bold text-customText block">{selectedVehicle.currentLocation?.locationName || 'Depot unlisted'}</span>
              </div>
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customSecondary">GPS tracking status</span>
                <span className="font-semibold text-customText block">ONLINE</span>
              </div>
            </div>

            <div className="border-b border-darkBorder/40 pb-4">
              <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                <Truck className="w-4 h-4" />
                Active Assigned Shipment
              </h4>
              {selectedVehicle.assignedShipment ? (
                <div className="bg-darkBgSecondary border border-darkBorder rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-customText block">{selectedVehicle.assignedShipment.shipmentId}</span>
                    <span className="text-[10px] text-customMuted block mt-0.5">Status: {selectedVehicle.assignedShipment.status}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                    onClick={() => navigate(`/shipments/${selectedVehicle.assignedShipment._id || selectedVehicle.assignedShipment}`)}
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>View Shipment</span>
                  </Button>
                </div>
              ) : (
                <div className="bg-darkBgSecondary/30 border border-dashed border-darkBorder rounded-lg p-3 text-center text-customMuted">
                  No active shipment assigned.
                </div>
              )}
            </div>

            <div className="border-b border-darkBorder/40 pb-4">
              <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customSecondary">Maintenance Target</span>
              <span className="text-customText block">Last check: {selectedVehicle.lastMaintenanceDate ? new Date(selectedVehicle.lastMaintenanceDate).toLocaleDateString() : 'None'}</span>
              <span className="text-customMuted block mt-0.5">Next review: {selectedVehicle.nextMaintenanceDate ? new Date(selectedVehicle.nextMaintenanceDate).toLocaleDateString() : 'Unscheduled'}</span>
            </div>

            {selectedVehicle.notes && (
              <div className="bg-darkBgSecondary/65 border border-darkBorder p-2.5 rounded-lg text-customMuted text-[11px] leading-relaxed">
                <span className="font-semibold text-customText block mb-1">Fleet Notes:</span>
                {selectedVehicle.notes}
              </div>
            )}

            {isOperatorOrAdmin && (
              <div className="border-t border-darkBorder/40 pt-4 space-y-4">
                <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px]">Operator Controls</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Update Status"
                    options={[
                      { label: 'Available', value: 'AVAILABLE' },
                      { label: 'Assigned', value: 'ASSIGNED' },
                      { label: 'In Transit', value: 'IN_TRANSIT' },
                      { label: 'Maintenance', value: 'MAINTENANCE' },
                      { label: 'Inactive', value: 'INACTIVE' }
                    ]}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    placeholder=""
                  />
                  <Select
                    label="Link Shipment"
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...shipments.map(s => ({ label: `${s.shipmentId} (${s.status})`, value: s._id }))
                    ]}
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    placeholder="Select shipment"
                  />
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-darkBorder/40">
                  <Button
                    variant="outline"
                    className="hover:bg-customDanger/10 hover:border-customDanger/30 hover:text-customDanger text-xs font-semibold uppercase tracking-wider flex items-center gap-1 border-darkBorder animate-fadeIn"
                    onClick={() => handleDeleteSubmit(selectedVehicle._id, selectedVehicle.registrationNumber)}
                    disabled={submitLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete vehicle</span>
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
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Vehicles;
