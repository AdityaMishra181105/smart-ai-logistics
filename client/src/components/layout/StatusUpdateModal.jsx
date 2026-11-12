import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Button from '../ui/Button';

const StatusUpdateModal = ({
  isOpen,
  onClose,
  currentStatus,
  onUpdate,
  loading = false
}) => {
  const [status, setStatus] = useState(currentStatus || 'ROUTE_PENDING');

  // Sync status if currentStatus changes
  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(status);
  };

  const statusOptions = [
    { label: 'Route Pending', value: 'ROUTE_PENDING' },
    { label: 'Route Selected', value: 'ROUTE_SELECTED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'At Risk', value: 'AT_RISK' },
    { label: 'Delayed', value: 'DELAYED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  const footerActions = (
    <>
      <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading} disabled={loading}>
        Update Status
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Shipment Status"
      footer={footerActions}
      size="sm"
    >
      <div className="space-y-4">
        <div className="text-xs text-customMuted">
          Select the new operational status for this shipment. Changing this will update the monitoring console immediately.
        </div>
        <div className="bg-darkBgSecondary border border-darkBorder rounded-lg p-3 text-xs flex justify-between items-center mb-2">
          <span className="text-customMuted">Current Status:</span>
          <span className="font-semibold text-customText uppercase">{currentStatus}</span>
        </div>
        <Select
          label="Select New Status"
          options={statusOptions}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder=""
        />
      </div>
    </Modal>
  );
};

export default StatusUpdateModal;
