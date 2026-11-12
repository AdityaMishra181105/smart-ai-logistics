import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getDrivers, assignDriverToShipment } from '../../services/shipmentService';

const AssignDriverModal = ({
  isOpen,
  onClose,
  shipmentId,
  currentDriverId,
  onDriverAssigned
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState(currentDriverId || '');
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentDriverId) {
      setSelectedDriverId(currentDriverId);
    } else {
      setSelectedDriverId('');
    }
  }, [currentDriverId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchDriversList = async () => {
        setLoadingDrivers(true);
        setErrorMsg('');
        try {
          const res = await getDrivers();
          if (res.data && res.data.success) {
            setDrivers(res.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch drivers list:', err);
          setErrorMsg('Failed to load drivers list.');
        } finally {
          setLoadingDrivers(false);
        }
      };
      fetchDriversList();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setUpdating(true);
    setErrorMsg('');
    try {
      const res = await assignDriverToShipment(shipmentId, selectedDriverId || null);
      if (res.data && res.data.success) {
        onDriverAssigned(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error('Failed to assign driver:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to assign driver.');
    } finally {
      setUpdating(false);
    }
  };

  const footerActions = (
    <>
      <Button variant="outline" size="sm" onClick={onClose} disabled={updating}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} loading={updating} disabled={updating}>
        Save Assignment
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Driver to Shipment"
      footer={footerActions}
      size="sm"
    >
      <div className="space-y-4 text-xs">
        <p className="text-customMuted">
          Select a registered fleet driver from the database to assign to this shipment corridor.
        </p>

        {errorMsg && (
          <div className="p-2.5 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-customText uppercase tracking-wider">
            Select Driver
          </label>
          {loadingDrivers ? (
            <div className="p-2.5 bg-darkBgSecondary border border-darkBorder rounded text-customMuted">
              Loading available drivers...
            </div>
          ) : (
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-darkBgSecondary border border-darkBorder rounded-lg px-3 py-2 text-xs text-customText focus:outline-none focus:border-customPrimary transition-colors"
            >
              <option value="">-- Select Driver (Unassigned) --</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AssignDriverModal;
