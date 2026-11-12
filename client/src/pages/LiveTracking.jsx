import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Truck, MapPin, AlertTriangle, Shield, CheckCircle2, Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { getShipments } from '../services/shipmentService';
import { nerLocations } from '../constants/nerLocations';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import LogisticsMap from '../components/map/LogisticsMap';
import MapLegend from '../components/map/MapLegend';

const LiveTracking = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // API states
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Local filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [goodsFilter, setGoodsFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Fetch all accessible shipments (No pagination limits for tracking map, load max 100)
  const fetchShipmentsForMap = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: 100,
        status: statusFilter,
        goodsType: goodsFilter,
        priority: priorityFilter
      };
      const res = await getShipments(params);
      if (res.data && res.data.success) {
        setShipments(res.data.data.shipments || []);
      }
    } catch (err) {
      console.error('Failed to load map shipments:', err);
      setError(err.response?.data?.message || 'Failed to retrieve active shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentsForMap();
  }, [statusFilter, goodsFilter, priorityFilter]);

  const handleClearFilters = () => {
    setStatusFilter('');
    setGoodsFilter('');
    setPriorityFilter('');
  };

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Route Pending', value: 'ROUTE_PENDING' },
    { label: 'Route Selected', value: 'ROUTE_SELECTED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'At Risk', value: 'AT_RISK' },
    { label: 'Delayed', value: 'DELAYED' },
    { label: 'Delivered', value: 'DELIVERED' }
  ];

  const goodsOptions = [
    { label: 'All Cargo Types', value: '' },
    { label: 'Medicines', value: 'MEDICINE' },
    { label: 'Food Supplies', value: 'FOOD' },
    { label: 'Construction Materials', value: 'CONSTRUCTION_MATERIAL' },
    { label: 'Agricultural Produce', value: 'AGRICULTURAL_PRODUCE' }
  ];

  const priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];

  const getPriorityBadgeColor = (prio) => {
    switch (prio) {
      case 'CRITICAL': return 'border-red-500/30 text-red-400 bg-red-500/10';
      case 'HIGH': return 'border-amber-500/30 text-amber-400 bg-amber-500/10';
      case 'MEDIUM': return 'border-blue-500/30 text-blue-400 bg-blue-500/10';
      default: return 'border-slate-500/30 text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Live Logistics Map"
        description="Monitor essential goods movement and safety zones across the North Eastern Region."
      />

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Side: Map Centric (70% on Desktop / 7 columns) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {loading ? (
            <div className="w-full bg-darkCard border border-darkBorder rounded-lg flex items-center justify-center" style={{ height: '500px' }}>
              <LoadingSpinner size="lg" text="Positioning GIS telemetry coordinates..." />
            </div>
          ) : (
            <LogisticsMap
              shipments={shipments}
              mode="tracking"
              height="500px"
            />
          )}

          {/* Quick Filters card */}
          <Card className="p-4 bg-darkCard/80 border border-darkBorder">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Select
                label="Cargo Status"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder=""
              />
              <Select
                label="Cargo Type"
                options={goodsOptions}
                value={goodsFilter}
                onChange={(e) => setGoodsFilter(e.target.value)}
                placeholder=""
              />
              <Select
                label="Cargo Priority"
                options={priorityOptions}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                placeholder=""
              />
            </div>
            {(statusFilter || goodsFilter || priorityFilter) && (
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset Map Filters
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Information Panels (30% on Desktop / 3 columns) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          {/* Active Shipments Panel */}
          <Card className="flex flex-col flex-1 max-h-[350px]">
            <CardHeader className="pb-2 border-b border-darkBorder mb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText">
                Active Shipments ({shipments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-2 flex-1 pr-1.5 text-xs">
              {shipments.length === 0 ? (
                <div className="text-center text-customMuted py-8">
                  {statusFilter || goodsFilter || priorityFilter ? (
                    <span>No active shipments match filters.</span>
                  ) : (
                    <span>No accessible shipments available for map visualization.</span>
                  )}
                </div>
              ) : (
                shipments.map((shp) => (
                  <div
                    key={shp._id}
                    className="p-3 bg-darkBgSecondary border border-darkBorder hover:border-customPrimary/30 rounded-lg flex justify-between items-start transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-customPrimary text-xs">{shp.shipmentId}</span>
                        <span className={`text-[8px] px-1 rounded border uppercase font-semibold ${getPriorityBadgeColor(shp.priority)}`}>
                          {shp.priority}
                        </span>
                      </div>
                      <div className="text-[10px] text-customText truncate">
                        {shp.pickup?.locationName} <span className="text-customMuted">→</span> {shp.destination?.locationName}
                      </div>
                      <span className="text-[9px] text-customMuted block">
                        Status: <strong className="text-customText uppercase">{shp.status?.replace('_', ' ')}</strong>
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-1.5 ml-2"
                      onClick={() => navigate(`/shipments/${shp._id}`)}
                      title="Inspect Shipment"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Seeded Location Nodes Panel */}
          <Card className="flex flex-col max-h-[250px]">
            <CardHeader className="pb-2 border-b border-darkBorder mb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText">
                Seeded NER Hubs ({nerLocations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-2 flex-1 pr-1.5 text-xs">
              {nerLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-2.5 bg-darkCard border border-darkBorder rounded-lg space-y-0.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-customText">{loc.name}</span>
                    <span className="text-[9px] text-customMuted uppercase font-medium">{loc.state}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-customMuted">{loc.description.slice(0, 48)}...</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Map Legend */}
          <MapLegend />
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
