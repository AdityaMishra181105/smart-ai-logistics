import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, AlertCircle, Shield, Truck, Activity, ChevronLeft, ChevronRight, Trash2, Navigation, FileText, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import axios from 'axios';

const MapAutoFit = ({ bounds }) => {
  const map = useMap();
  React.useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
};
import { useAuth } from '../context/AuthContext';
import { getRoutes, createRoute, updateRoute, deleteRoute, getRouteStats, updateRouteStatus, getDriverRoutes } from '../services/routeMgmtService';
import { getShipments } from '../services/shipmentService';
import { getVehicles } from '../services/vehicleService';
import { selectRouteAlternative } from '../services/routeIntelligenceService';
import { getMapIcon } from '../components/map/mapIcons';
import { resolveNERLocation } from '../utils/locationResolver';
import RouteIntelligencePanel from '../components/routes/RouteIntelligencePanel';
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

const Routes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, translateStatus, translateRouteName } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOperatorOrAdmin = user && user.role === 'ADMIN';

  // Core States
  const [routesList, setRoutesList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    planned: 0,
    active: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState([]);
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

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [dynamicRouteCoords, setDynamicRouteCoords] = useState([]);
  const [loadingMapRoute, setLoadingMapRoute] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Dynamically resolve real road geometry for selectedRoute when Inspect modal is open
  useEffect(() => {
    if (!isDetailsOpen || !selectedRoute) {
      setDynamicRouteCoords([]);
      setLoadingMapRoute(false);
      return;
    }

    const preSavedCoords = (selectedRoute.selectedRouteData?.coordinates && Array.isArray(selectedRoute.selectedRouteData.coordinates) && selectedRoute.selectedRouteData.coordinates.length > 2)
      ? selectedRoute.selectedRouteData.coordinates
      : (selectedRoute.shipment?.selectedRoute?.coordinates && Array.isArray(selectedRoute.shipment.selectedRoute.coordinates) && selectedRoute.shipment.selectedRoute.coordinates.length > 2)
      ? selectedRoute.shipment.selectedRoute.coordinates
      : (selectedRoute.coordinates && Array.isArray(selectedRoute.coordinates) && selectedRoute.coordinates.length > 2)
      ? selectedRoute.coordinates
      : [];

    if (preSavedCoords.length > 2) {
      setDynamicRouteCoords(preSavedCoords);
      setLoadingMapRoute(false);
      return;
    }

    // Resolve Origin Coordinates
    let originLat = selectedRoute.origin?.latitude || selectedRoute.origin?.coordinates?.latitude || selectedRoute.shipment?.pickup?.latitude;
    let originLon = selectedRoute.origin?.longitude || selectedRoute.origin?.coordinates?.longitude || selectedRoute.shipment?.pickup?.longitude;

    if (!originLat || !originLon) {
      const resolved = resolveNERLocation(selectedRoute.origin?.locationName || selectedRoute.originName || '');
      if (resolved) {
        originLat = resolved.latitude;
        originLon = resolved.longitude;
      } else {
        originLat = 26.8467;
        originLon = 80.9462;
      }
    }

    // Resolve Destination Coordinates
    let destLat = selectedRoute.destination?.latitude || selectedRoute.destination?.coordinates?.latitude || selectedRoute.shipment?.destination?.latitude;
    let destLon = selectedRoute.destination?.longitude || selectedRoute.destination?.coordinates?.longitude || selectedRoute.shipment?.destination?.longitude;

    if (!destLat || !destLon) {
      const resolved = resolveNERLocation(selectedRoute.destination?.locationName || selectedRoute.destinationName || '');
      if (resolved) {
        destLat = resolved.latitude;
        destLon = resolved.longitude;
      } else {
        destLat = 28.6692;
        destLon = 77.4538;
      }
    }

    let isMounted = true;
    setLoadingMapRoute(true);

    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
        const res = await axios.get(url, { timeout: 6000 });

        if (isMounted && res.data?.routes?.[0]?.geometry?.coordinates) {
          const rawCoords = res.data.routes[0].geometry.coordinates; // [[lon, lat], ...]
          const latLngCoords = rawCoords.map(c => [c[1], c[0]]);
          setDynamicRouteCoords(latLngCoords);
        }
      } catch (err) {
        console.warn('OSRM road route calculation error:', err);
        if (isMounted) {
          setDynamicRouteCoords([]);
        }
      } finally {
        if (isMounted) setLoadingMapRoute(false);
      }
    };

    fetchRoadRoute();

    return () => {
      isMounted = false;
    };
  }, [isDetailsOpen, selectedRoute]);

  // Create Form State
  const [formData, setFormData] = useState({
    routeName: '',
    originName: 'Guwahati Depot',
    originAddress: 'Guwahati, Assam',
    destinationName: 'Shillong Depot',
    destinationAddress: 'Shillong, Meghalaya',
    distance: '',
    estimatedDuration: '',
    assignedVehicle: '',
    shipments: []
  });

  // Update states inside details modal
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

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
    setSearchParams({});
  };

  useEffect(() => {
    const fetchRelations = async () => {
      if (isOperatorOrAdmin) {
        try {
          const [vehiclesRes, shipmentsRes] = await Promise.all([
            getVehicles(),
            getShipments({ limit: 100 })
          ]);
          
          if (vehiclesRes.data?.success) {
            setVehicles(vehiclesRes.data.data.vehicles || vehiclesRes.data.data);
          }
          if (shipmentsRes.data?.success) {
            setShipments(shipmentsRes.data.data.shipments || []);
          }
        } catch (err) {
          console.error('Failed to load relations database:', err);
        }
      }
    };
    fetchRelations();
  }, [isOperatorOrAdmin, isCreateOpen, isDetailsOpen]);

  const fetchRoutesList = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.role === 'DRIVER' || user?.role === 'NGO') {
        const driverRes = await getDriverRoutes();
        if (driverRes.data?.success) {
          setRoutesList(driverRes.data.data);
          setPagination({ page: 1, limit: 10, total: driverRes.data.data.length, totalPages: 1 });
        }
      } else {
        const params = {
          page: searchParams.get('page') || 1,
          limit: 10,
          search: searchParams.get('search') || '',
          status: searchParams.get('status') || ''
        };

        const [listRes, statsRes] = await Promise.all([
          getRoutes(params),
          getRouteStats()
        ]);

        if (listRes.data?.success) {
          setRoutesList(listRes.data.data);
          if (listRes.data.pagination) {
            setPagination(listRes.data.pagination);
          }
        }
        if (statsRes.data?.success) {
          setStats(statsRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load routes list:', err);
      if (!err.response) {
        setError('Unable to load route data. Check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to retrieve routes database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesList();
  }, [searchParams]);

  const handleOpenDetails = async (route) => {
    setSelectedRoute(route);
    setSelectedStatus(route.routeStatus);
    setSelectedVehicleId(route.assignedVehicle?._id || '');
    setIsDetailsOpen(true);

    try {
      const res = await getRouteById(route._id || route.routeId);
      if (res.data && res.data.success && res.data.data) {
        const fullRoute = res.data.data;
        const coords = fullRoute.selectedRouteData?.coordinates
          || fullRoute.coordinates
          || fullRoute.shipment?.selectedRoute?.coordinates
          || route.coordinates
          || route.selectedRouteData?.coordinates;

        setSelectedRoute(prev => ({
          ...prev,
          ...fullRoute,
          coordinates: coords,
          selectedRouteData: fullRoute.selectedRouteData || prev?.selectedRouteData,
          shipment: fullRoute.shipments?.[0] || prev?.shipment
        }));
      }
    } catch (err) {
      console.warn('Could not fetch single route details:', err);
    }
  };

  const handleOpenIntelligence = (route) => {
    setSelectedRoute(route);
    setIsDetailsOpen(false);
    setIsIntelligenceOpen(true);
  };

  const handleRouteSelected = async (selectedRouteData) => {
    if (!selectedRoute) return;

    setSubmitLoading(true);
    try {
      await selectRouteAlternative(
        selectedRoute._id,
        selectedRouteData.routeId,
        selectedRouteData
      );

      setSuccessMsg('Route alternative selected and confirmed successfully.');
      setTimeout(() => {
        setIsIntelligenceOpen(false);
        setSuccessMsg('');
        fetchRoutesList();
      }, 2000);
    } catch (err) {
      console.error('Failed to select route:', err);
      alert(err.response?.data?.message || 'Failed to confirm route selection.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const originCoords = resolveNERLocation(formData.originName) || { latitude: 26.2, longitude: 92.9 };
      const destCoords = resolveNERLocation(formData.destinationName) || { latitude: 26.2, longitude: 92.9 };

      const payload = {
        routeName: formData.routeName,
        origin: {
          locationName: formData.originName,
          address: formData.originAddress,
          coordinates: { latitude: originCoords.latitude, longitude: originCoords.longitude }
        },
        destination: {
          locationName: formData.destinationName,
          address: formData.destinationAddress,
          coordinates: { latitude: destCoords.latitude, longitude: destCoords.longitude }
        },
        distance: parseFloat(formData.distance),
        estimatedDuration: parseFloat(formData.estimatedDuration),
        assignedVehicle: formData.assignedVehicle || null,
        shipments: formData.shipments
      };

      const res = await createRoute(payload);
      if (res.data && res.data.success) {
        setSuccessMsg('Route created successfully.');
        setFormData({
          routeName: '',
          originName: 'Guwahati Depot',
          originAddress: 'Guwahati, Assam',
          destinationName: 'Shillong Depot',
          destinationAddress: 'Shillong, Meghalaya',
          distance: '',
          estimatedDuration: '',
          assignedVehicle: '',
          shipments: []
        });
        setTimeout(() => {
          setIsCreateOpen(false);
          setSuccessMsg('');
          fetchRoutesList();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to create route:', err);
      setFormError(err.response?.data?.message || 'Failed to submit route details. Check inputs.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedRoute) return;
    setSubmitLoading(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const payload = {
        assignedVehicle: selectedVehicleId || null
      };
      await updateRoute(selectedRoute._id, payload);

      if (selectedStatus !== selectedRoute.routeStatus) {
        await updateRouteStatus(selectedRoute._id, selectedStatus);
      }

      setSuccessMsg('Route updated successfully.');
      setTimeout(() => {
        setIsDetailsOpen(false);
        setSuccessMsg('');
        fetchRoutesList();
      }, 1200);
    } catch (err) {
      console.error('Failed to update route:', err);
      setFormError(err.response?.data?.message || 'Failed to update route parameters.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSubmit = async (id, name) => {
    const confirmed = window.confirm(`Are you sure you want to delete route "${name}"?`);
    if (!confirmed) return;

    setSubmitLoading(true);
    try {
      const res = await deleteRoute(id);
      if (res.data && res.data.success) {
        alert(`Route "${name}" deleted successfully.`);
        setIsDetailsOpen(false);
        fetchRoutesList();
      }
    } catch (err) {
      console.error('Failed to delete route:', err);
      alert(err.response?.data?.message || 'Failed to delete route.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (s) => {
    const text = translateStatus(s);
    switch (s) {
      case 'PLANNED':
        return <Badge variant="neutral" className="border-gray-500/40 text-gray-400 bg-gray-500/10">{text}</Badge>;
      case 'ACTIVE':
        return <Badge variant="info" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10">{text}</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning" className="border-amber-500/40 text-amber-400 bg-amber-500/10 animate-pulse">{text}</Badge>;
      case 'COMPLETED':
        return <Badge variant="success" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">{text}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" className="border-red-500/40 text-red-400 bg-red-500/10">{text}</Badge>;
      default:
        return <Badge variant="neutral">{text}</Badge>;
    }
  };

  const renderLeafletMap = (route) => {
    if (!route) return null;

    const routeCoordinates = (route.selectedRouteData?.coordinates && Array.isArray(route.selectedRouteData.coordinates) && route.selectedRouteData.coordinates.length > 2)
      ? route.selectedRouteData.coordinates
      : (route.shipment?.selectedRoute?.coordinates && Array.isArray(route.shipment.selectedRoute.coordinates) && route.shipment.selectedRoute.coordinates.length > 2)
      ? route.shipment.selectedRoute.coordinates
      : (route.coordinates && Array.isArray(route.coordinates) && route.coordinates.length > 2)
      ? route.coordinates
      : (dynamicRouteCoords && Array.isArray(dynamicRouteCoords) && dynamicRouteCoords.length > 2)
      ? dynamicRouteCoords
      : [];

    const originCoords = route.origin?.latitude && route.origin?.longitude
      ? [route.origin.latitude, route.origin.longitude]
      : route.origin?.coordinates?.latitude && route.origin?.coordinates?.longitude
      ? [route.origin.coordinates.latitude, route.origin.coordinates.longitude]
      : routeCoordinates.length > 0
      ? routeCoordinates[0]
      : [26.8467, 80.9462];

    const destCoords = route.destination?.latitude && route.destination?.longitude
      ? [route.destination.latitude, route.destination.longitude]
      : route.destination?.coordinates?.latitude && route.destination?.coordinates?.longitude
      ? [route.destination.coordinates.latitude, route.destination.coordinates.longitude]
      : routeCoordinates.length > 0
      ? routeCoordinates[routeCoordinates.length - 1]
      : [28.6692, 77.4538];

    const polylinePath = routeCoordinates.length > 2 ? routeCoordinates : null;

    const mapBounds = [];
    if (routeCoordinates.length > 0) {
      routeCoordinates.forEach(c => mapBounds.push(c));
    } else {
      mapBounds.push(originCoords);
      mapBounds.push(destCoords);
    }

    const routeDisplayName = route.selectedRouteData?.routeName || route.shipment?.selectedRoute?.name || route.routeName || 'Selected Transit Corridor';

    return (
      <div className="h-[260px] w-full rounded-lg overflow-hidden border border-darkBorder bg-darkBgSecondary/40 relative">
        {loadingMapRoute && !polylinePath && (
          <div className="absolute inset-0 bg-darkBg/60 backdrop-blur-xs z-10 flex items-center justify-center gap-2 text-xs font-semibold text-customPrimary">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{t('loading', 'Calculating real road path...')}</span>
          </div>
        )}
        <MapContainer
          center={originCoords}
          zoom={8}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapAutoFit bounds={mapBounds} />

          <Marker position={originCoords} icon={getMapIcon('PICKUP')}>
            <Popup>
              <span className="text-xs font-bold text-slate-800">📍 {t('origin', 'Origin')}: {route.origin?.locationName || 'Origin'}</span>
            </Popup>
          </Marker>

          <Marker position={destCoords} icon={getMapIcon('DESTINATION')}>
            <Popup>
              <span className="text-xs font-bold text-slate-800">🏁 {t('destination', 'Destination')}: {route.destination?.locationName || 'Destination'}</span>
            </Popup>
          </Marker>
          
          {route.waypoints?.map((wp, idx) => (
            <Marker key={idx} position={[wp.coordinates?.latitude || wp.latitude || 26.2, wp.coordinates?.longitude || wp.longitude || 92.9]} icon={getMapIcon('SUPPLY_DEPOT')}>
              <Popup>
                <span className="text-xs font-bold text-slate-800">Waypoint: {wp.locationName}</span>
              </Popup>
            </Marker>
          ))}

          {polylinePath && (
            <Polyline
              positions={polylinePath}
              pathOptions={{ color: '#a855f7', weight: 5, opacity: 0.95 }}
            >
              <Popup>
                <div className="text-xs font-bold text-slate-800 space-y-1">
                  <p className="font-bold">{routeDisplayName}</p>
                  <p>{t('distance', 'Distance')}: {route.distance} km</p>
                  <p>{t('eta', 'ETA')}: {route.estimatedDuration} mins</p>
                </div>
              </Popup>
            </Polyline>
          )}
        </MapContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('routesTransitPlanner', 'Routes Planner')}
        description={t('routesPlannerSub', 'Plan transit corridors, optimize waypoints, and monitor active route corridors.')}
        actions={
          isOperatorOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>{t('createRoute', 'CREATE ROUTE')}</span>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title={t('totalRoutes', 'ROUTES')} value={stats.total} icon={Shield} description={t('registeredCorridors', 'registered corridors')} />
        <StatCard title={t('plannedRoutes', 'PLANNED ROUTES')} value={stats.planned} icon={CheckCircle2} description={t('pipelineSchedules', 'pipeline schedules')} trendType="success" />
        <StatCard title={t('activeProgress', 'ACTIVE / PROGRESS')} value={stats.active} icon={Truck} description={t('transitEnRoute', 'transit en route')} trendType="success" />
        <StatCard title={t('completedCard', 'COMPLETED')} value={stats.completed} icon={Activity} description={t('deliverySuccessLogs', 'delivery success logs')} trendType="success" />
        <StatCard title={t('cancelledCard', 'CANCELLED')} value={stats.cancelled} icon={AlertCircle} description={t('cancelledCorridors', 'cancelled corridors')} trendType="danger" />
      </div>

      <Card className="p-4 bg-darkCard/80 border border-darkBorder">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-customMuted absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Search shipments, vehicles...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-darkBgSecondary text-xs text-customText placeholder-customMuted border border-darkBorder rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-customPrimary transition-colors"
            />
          </div>

          <Select
            label={t('alertStatus', 'Alert Status')}
            options={[
              { label: t('allStatuses', 'All Statuses'), value: '' },
              { label: translateStatus('PLANNED'), value: 'PLANNED' },
              { label: translateStatus('ACTIVE'), value: 'ACTIVE' },
              { label: translateStatus('IN_PROGRESS'), value: 'IN_PROGRESS' },
              { label: translateStatus('COMPLETED'), value: 'COMPLETED' },
              { label: translateStatus('CANCELLED'), value: 'CANCELLED' }
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              handleFilterChange('status', e.target.value);
            }}
            placeholder=""
          />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9.5 justify-center flex-1" onClick={handleClearFilters}>
              {t('reset', 'Reset')}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" text={t('loading', 'Loading route corridors...')} />
        </div>
      ) : error ? (
        <Card className="border border-customDanger/20 bg-customDanger/5 p-6 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-customDanger" />
          <span className="text-xs font-semibold text-customText">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchRoutesList}>
            {t('refresh', 'Retry Load')}
          </Button>
        </Card>
      ) : routesList.length === 0 ? (
        <EmptyState
          title={t('noRoutesFound', 'No Routes Found')}
          description={t('noRoutesSub', 'Corridor planner registry is currently empty. Define a new transport corridor route.')}
        />
      ) : (
        <Card className="overflow-hidden border border-darkBorder bg-darkCard/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-darkBorder bg-darkBgSecondary/45 text-customMuted uppercase font-bold tracking-wider select-none">
                  <th className="p-4">{t('routeId', 'ROUTE ID')}</th>
                  <th className="p-4">{t('routeName', 'ROUTE NAME')}</th>
                  <th className="p-4">{t('origin', 'ORIGIN')}</th>
                  <th className="p-4">{t('destination', 'DESTINATION')}</th>
                  <th className="p-4">{t('assignedVehicle', 'ASSIGNED VEHICLE')}</th>
                  <th className="p-4">{t('shipment', 'SHIPMENT')}</th>
                  <th className="p-4">{t('distance', 'DISTANCE')}</th>
                  <th className="p-4">{t('status', 'STATUS')}</th>
                  <th className="p-4 text-right">{t('actions', 'ACTION')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/40">
                {routesList.map((r) => (
                  <tr key={r._id} className="hover:bg-darkBgSecondary/20 transition-colors">
                    <td className="p-4 font-bold text-customPrimary">{r.routeId}</td>
                    <td className="p-4 font-bold text-customText">{translateRouteName ? translateRouteName(r.routeName) : r.routeName}</td>
                    <td className="p-4 text-customText">{r.origin?.locationName}</td>
                    <td className="p-4 text-customText">{r.destination?.locationName}</td>
                    <td className="p-4 text-customText font-bold uppercase">
                      {r.assignedVehicle ? r.assignedVehicle.registrationNumber : <span className="text-customMuted italic text-[10px]">{t('noVehicleAssigned', 'NO VEHICLE ASSIGNED')}</span>}
                    </td>
                    <td className="p-4 text-customMuted font-bold">{r.shipments?.length || 0}</td>
                    <td className="p-4 text-customMuted">{r.distance} km</td>
                    <td className="p-4">{getStatusBadge(r.routeStatus)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider"
                        onClick={() => handleOpenDetails(r)}
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
        title="Define New Transit Corridor Route"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg font-semibold animate-shake">
              {formError}
            </div>
          )}

          <Input
            label="Route Name / Reference"
            value={formData.routeName}
            onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
            placeholder="e.g. Guwahati-Shillong Medical Express"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-darkBorder/40 pt-3">
            <Input
              label="Origin Location Name"
              value={formData.originName}
              onChange={(e) => setFormData({ ...formData, originName: e.target.value })}
              required
            />
            <Input
              label="Origin Full Address"
              value={formData.originAddress}
              onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-darkBorder/40 pt-3">
            <Input
              label="Destination Location Name"
              value={formData.destinationName}
              onChange={(e) => setFormData({ ...formData, destinationName: e.target.value })}
              required
            />
            <Input
              label="Destination Full Address"
              value={formData.destinationAddress}
              onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-darkBorder/40 pt-3">
            <Input
              label="Total Distance (km)"
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
              required
            />
            <Input
              label="Est Duration (minutes)"
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
              required
            />
          </div>

          <div className="border-t border-darkBorder/40 pt-3">
            <Select
              label="Assign Vehicle Transponder"
              options={[
                { label: 'Unassigned', value: '' },
                ...vehicles.map(v => ({ label: v.registrationNumber, value: v._id }))
              ]}
              value={formData.assignedVehicle}
              onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
            />
          </div>

          {successMsg && (
            <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold animate-fadeIn">
              {successMsg}
            </div>
          )}

          <div className="border-t border-darkBorder/40 pt-4 flex justify-end gap-2 text-xs">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitLoading} disabled={submitLoading}>
              Create Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* INSPECT DETAILS MODAL */}
      {selectedRoute && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Transit Corridor: ${selectedRoute.routeId}`}
          size="md"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {formError && (
              <div className="p-3 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg font-semibold animate-shake">
                {formError}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-customSuccess/10 border border-customSuccess/30 text-customSuccess rounded-lg font-semibold animate-fadeIn">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted block mb-0.5">Corridor Name</span>
                <span className="font-bold text-customText text-base block">{selectedRoute.routeName}</span>
                <span className="text-[10px] text-customMuted block mt-0.5">Distance: {selectedRoute.distance} km • Duration: {selectedRoute.estimatedDuration} mins</span>
              </div>
              <div className="text-right">
                <span className="text-customMuted block mb-1">Status</span>
                <div className="flex justify-end gap-1.5 items-center">
                  {getStatusBadge(selectedRoute.routeStatus)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-customSecondary flex items-center gap-1">
                <Navigation className="w-4 h-4 text-customPrimary" />
                GIS Route Visualization
              </h4>
              {renderLeafletMap(selectedRoute)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customPrimary">Origin point</span>
                <span className="font-bold text-customText block">{selectedRoute.origin?.locationName}</span>
                <span className="text-[10px] text-customMuted block mt-0.5">{selectedRoute.origin?.address || 'Address unlisted'}</span>
              </div>
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customPrimary">Destination point</span>
                <span className="font-bold text-customText block">{selectedRoute.destination?.locationName}</span>
                <span className="text-[10px] text-customMuted block mt-0.5">{selectedRoute.destination?.address || 'Address unlisted'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-darkBorder/40 pb-4">
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customSecondary">Safety Index</span>
                <span className="font-bold text-emerald-400 text-sm block">{selectedRoute.safetyScore !== undefined ? selectedRoute.safetyScore : 80}/100</span>
              </div>
              <div>
                <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1 text-customSecondary">Risk Level</span>
                <span className={`font-bold text-[11px] uppercase px-2 py-0.5 rounded border inline-block ${
                  (selectedRoute.riskLevel || 'LOW').toUpperCase() === 'LOW'
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : (selectedRoute.riskLevel || '').toUpperCase() === 'HIGH'
                    ? 'border-red-500/40 text-red-400 bg-red-500/10'
                    : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                }`}>
                  {selectedRoute.riskLevel || 'LOW'} Risk
                </span>
              </div>
            </div>

            <div className="border-b border-darkBorder/40 pb-4">
              <span className="text-customMuted font-bold uppercase text-[9px] tracking-wider block mb-1.5 text-customSecondary">Assigned Vehicle</span>
              {selectedRoute.assignedVehicle ? (
                <div className="bg-darkBgSecondary border border-darkBorder p-2 rounded-lg flex items-center gap-2">
                  <Truck className="w-4 h-4 text-customSecondary" />
                  <div>
                    <span className="font-semibold text-customText block uppercase">{selectedRoute.assignedVehicle.registrationNumber}</span>
                    <span className="text-[9px] text-customMuted block">{selectedRoute.assignedVehicle.vehicleType}</span>
                  </div>
                </div>
              ) : (
                <span className="text-customMuted font-medium italic pl-1 block">Unassigned</span>
              )}
            </div>

            <div className="border-b border-darkBorder/40 pb-4">
              <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                <FileText className="w-4 h-4 text-customPrimary" />
                Linked Shipments ({selectedRoute.shipments?.length || 0})
              </h4>
              {selectedRoute.shipments && selectedRoute.shipments.length > 0 ? (
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {selectedRoute.shipments.map(s => (
                    <div key={s._id} className="bg-darkBgSecondary border border-darkBorder rounded p-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-customText block">{s.shipmentId}</span>
                        <span className="text-[10px] text-customMuted block">{s.destination?.locationName} • {s.status}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold"
                        onClick={() => {
                          setIsDetailsOpen(false);
                          navigate(`/shipments/${s._id}`);
                        }}
                      >
                        Inspect
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-customMuted italic text-[10px]">No shipments linked to this corridor</span>
              )}
            </div>

            {isOperatorOrAdmin && (
              <div className="border-t border-darkBorder/40 pt-4 space-y-4">
                <h4 className="font-semibold text-customPrimary uppercase tracking-wider text-[10px]">Operator Controls</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Update Status"
                    options={[
                      { label: 'Planned', value: 'PLANNED' },
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'In Progress', value: 'IN_PROGRESS' },
                      { label: 'Completed', value: 'COMPLETED' },
                      { label: 'Cancelled', value: 'CANCELLED' }
                    ]}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    placeholder=""
                  />
                  <Select
                    label="Assign Vehicle Transponder"
                    options={[
                      { label: 'Unassigned', value: '' },
                      ...vehicles.map(v => ({ label: v.registrationNumber, value: v._id }))
                    ]}
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    placeholder="Select vehicle"
                  />
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t border-darkBorder/40">
                  <Button
                    variant="outline"
                    className="hover:bg-customDanger/10 hover:border-customDanger/30 hover:text-customDanger text-xs font-semibold uppercase tracking-wider flex items-center gap-1 border-darkBorder"
                    onClick={() => handleDeleteSubmit(selectedRoute._id, selectedRoute.routeName)}
                    disabled={submitLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete route</span>
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

      {/* ROUTE INTELLIGENCE MODAL */}
      {selectedRoute && (
        <Modal
          isOpen={isIntelligenceOpen}
          onClose={() => setIsIntelligenceOpen(false)}
          title=""
          size="xl"
        >
          <RouteIntelligencePanel
            route={selectedRoute}
            onRouteSelected={handleRouteSelected}
            onClose={() => setIsIntelligenceOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Routes;
