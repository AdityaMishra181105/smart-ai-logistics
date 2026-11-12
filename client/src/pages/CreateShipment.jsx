import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';
import { createShipment, getDrivers } from '../services/shipmentService';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { nerLocations } from '../constants/nerLocations';

const CreateShipment = () => {
  const navigate = useNavigate();

  // Form states
  const [goodsType, setGoodsType] = useState('MEDICINE');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('BOX');
  const [priority, setPriority] = useState('MEDIUM');
  
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  
  const [destName, setDestName] = useState('');
  const [destAddress, setDestAddress] = useState('');
  
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [driversList, setDriversList] = useState([]);

  useEffect(() => {
    const fetchDriversList = async () => {
      try {
        const res = await getDrivers();
        if (res.data && res.data.success) {
          setDriversList(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching drivers list:', err);
      }
    };
    fetchDriversList();
  }, []);

  // Suggestions state
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickupName(val);
    if (errors.pickupName) setErrors({ ...errors, pickupName: '' });

    if (val.trim().length >= 1) {
      const matched = nerLocations.filter(loc =>
        loc.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setPickupSuggestions(matched);
    } else {
      setPickupSuggestions([]);
    }
  };

  const handleSelectPickup = (loc) => {
    setPickupName(loc.name);
    setPickupAddress(`${loc.name}, ${loc.state}`);
    setPickupSuggestions([]);
  };

  const handleDestChange = (e) => {
    const val = e.target.value;
    setDestName(val);
    if (errors.destName) setErrors({ ...errors, destName: '' });

    if (val.trim().length >= 1) {
      const matched = nerLocations.filter(loc =>
        loc.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setDestSuggestions(matched);
    } else {
      setDestSuggestions([]);
    }
  };

  const handleSelectDest = (loc) => {
    setDestName(loc.name);
    setDestAddress(`${loc.name}, ${loc.state}`);
    setDestSuggestions([]);
  };

  // Validation/Error states
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid positive quantity';
    } else if (parseFloat(quantity) > 1000000) {
      newErrors.quantity = 'Quantity cannot exceed 1,000,000 for MVP';
    }

    if (!pickupName) {
      newErrors.pickupName = 'Pickup hub location is required';
    }

    if (!destName) {
      newErrors.destName = 'Destination hub location is required';
    }

    if (vehicleNo && vehicleNo.length > 30) {
      newErrors.vehicleNo = 'Vehicle number cannot exceed 30 characters';
    }

    if (notes && notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        goodsType,
        quantity: parseFloat(quantity),
        unit,
        priority,
        pickup: {
          locationName: pickupName,
          address: pickupAddress || ''
        },
        destination: {
          locationName: destName,
          address: destAddress || ''
        },
        vehicleNumber: vehicleNo || '',
        notes: notes || '',
        assignedDriver: assignedDriver || null
      };

      const res = await createShipment(payload);
      if (res.data && res.data.success) {
        const newShipment = res.data.data.shipment;
        navigate(`/shipments/${newShipment._id}`);
      }
    } catch (err) {
      console.error('Failed to create shipment:', err);
      setApiError(err.response?.data?.message || 'Failed to dispatch shipment due to a server error.');
    } finally {
      setLoading(false);
    }
  };

  const goodsOptions = [
    { label: 'Medicines & Vaccines', value: 'MEDICINE' },
    { label: 'Food & Relief supplies', value: 'FOOD' },
    { label: 'Construction materials', value: 'CONSTRUCTION_MATERIAL' },
    { label: 'Agricultural produce', value: 'AGRICULTURAL_PRODUCE' }
  ];

  const unitOptions = [
    { label: 'Boxes (BOX)', value: 'BOX' },
    { label: 'Kilograms (KG)', value: 'KG' },
    { label: 'Tons (TON)', value: 'TON' },
    { label: 'Packets (PACKET)', value: 'PACKET' },
    { label: 'Litres (LITRE)', value: 'LITRE' },
    { label: 'Units (UNIT)', value: 'UNIT' }
  ];

  const priorityOptions = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];

  return (
    <div className="space-y-6">
      {/* Back navigation header */}
      <div className="flex items-center gap-3 pb-3 border-b border-darkBorder">
        <Button
          variant="outline"
          size="sm"
          className="p-2"
          onClick={() => navigate('/shipments')}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-customText">Initiate New Shipment</h1>
          <p className="text-xs text-customMuted mt-0.5">Register a dispatch cargo and calculate safety profiles</p>
        </div>
      </div>

      {apiError && (
        <div className="p-3.5 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: GOODS INFORMATION */}
          <Card>
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Section 1: Cargo Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Goods Type"
                  options={goodsOptions}
                  value={goodsType}
                  onChange={(e) => setGoodsType(e.target.value)}
                  placeholder=""
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Quantity"
                    type="number"
                    step="any"
                    placeholder="250"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errors.quantity) setErrors({ ...errors, quantity: '' });
                    }}
                    error={errors.quantity}
                    required
                  />
                  <Select
                    label="Measurement Unit"
                    options={unitOptions}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>

              <Select
                label="Cargo Delivery Priority"
                options={priorityOptions}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder=""
              />
            </CardContent>
          </Card>

           {/* SECTION 2: PICKUP LOCATION */}
          <Card>
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Section 2: Pickup Origin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  label="Origin Location Name"
                  placeholder="e.g. Guwahati Central Transport Hub"
                  value={pickupName}
                  onChange={handlePickupChange}
                  error={errors.pickupName}
                  required
                />
                {pickupSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-darkCard border border-darkBorder rounded-md shadow-2xl z-50 text-xs divide-y divide-darkBorder/40 max-h-48 overflow-y-auto">
                    {pickupSuggestions.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectPickup(loc)}
                        className="w-full text-left px-3 py-2.5 hover:bg-darkBgSecondary text-customMuted hover:text-customText transition-colors flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-semibold">{loc.name}</span>
                        <span className="text-[10px] text-customMuted font-medium uppercase">{loc.state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="Physical Address / Landmark"
                placeholder="Guwahati, Assam"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* SECTION 3: DESTINATION */}
          <Card>
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Section 3: Destination Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  label="Destination Location Name"
                  placeholder="e.g. Shillong Civil Hospital"
                  value={destName}
                  onChange={handleDestChange}
                  error={errors.destName}
                  required
                />
                {destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-darkCard border border-darkBorder rounded-md shadow-2xl z-50 text-xs divide-y divide-darkBorder/40 max-h-48 overflow-y-auto">
                    {destSuggestions.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectDest(loc)}
                        className="w-full text-left px-3 py-2.5 hover:bg-darkBgSecondary text-customMuted hover:text-customText transition-colors flex justify-between items-center cursor-pointer"
                      >
                        <span className="font-semibold">{loc.name}</span>
                        <span className="text-[10px] text-customMuted font-medium uppercase">{loc.state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="Physical Address / Landmark"
                placeholder="Shillong, Meghalaya"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* SECTION 4: TRANSPORT DETAILS */}
          <Card>
            <CardHeader className="pb-3 border-b border-darkBorder mb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customPrimary">
                Section 4: Transport Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Vehicle Registration Number"
                placeholder="e.g. AS-01-AB-1234"
                value={vehicleNo}
                onChange={(e) => {
                  setVehicleNo(e.target.value);
                  if (errors.vehicleNo) setErrors({ ...errors, vehicleNo: '' });
                }}
                error={errors.vehicleNo}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-customMuted uppercase tracking-wider">
                  Assigned Driver
                </label>
                <select
                  value={assignedDriver}
                  onChange={(e) => setAssignedDriver(e.target.value)}
                  className="w-full bg-darkBgSecondary border border-darkBorder rounded-lg px-3 py-2 text-xs text-customText focus:outline-none focus:border-customPrimary transition-colors"
                >
                  <option value="">-- Select Driver (Optional) --</option>
                  {driversList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-customMuted tracking-wider uppercase">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Include temperature sensitivity limits, cargo handling constraints, etc..."
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (errors.notes) setErrors({ ...errors, notes: '' });
                  }}
                  className={`w-full bg-darkBgSecondary text-customText placeholder-customMuted border rounded-input px-3.5 py-2 text-sm transition-colors duration-200 outline-none focus:border-customPrimary h-24 resize-none ${
                    errors.notes ? 'border-customDanger' : 'border-darkBorder'
                  }`}
                />
                <div className="flex justify-between items-center text-[10px] text-customMuted mt-0.5">
                  {errors.notes ? (
                    <span className="text-customDanger">{errors.notes}</span>
                  ) : (
                    <span />
                  )}
                  <span>{notes.length} / 500 characters</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Actions Sidebar */}
        <div className="space-y-6">
          <Card className="flex flex-col border border-customPrimary/20 relative overflow-hidden bg-darkBgSecondary/20">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-customPrimary" />
                <span className="text-xs font-semibold text-customPrimary uppercase tracking-wider">
                  AI Dispatch Analysis
                </span>
              </div>
              <h3 className="text-sm font-semibold text-customText">Status: Pending Save</h3>
              <p className="text-xs text-customMuted leading-relaxed">
                Save this shipment to begin terrain hazard calculation, weather disruption analysis, and optimal corridor weight routing.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-darkBorder/40 space-y-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full flex items-center justify-center gap-2 py-2.5 font-bold uppercase tracking-wider text-xs"
                disabled={loading}
                loading={loading}
              >
                <Send className="w-4 h-4" />
                <span>Create Shipment</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full text-xs"
                onClick={() => navigate('/shipments')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateShipment;
