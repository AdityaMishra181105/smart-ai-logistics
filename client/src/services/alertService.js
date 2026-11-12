import api from './api';

export const getAlerts = async (params = {}) => {
  return await api.get('/alerts', { params });
};

export const getAlertById = async (id) => {
  return await api.get(`/alerts/${id}`);
};

export const createAlert = async (data) => {
  return await api.post('/alerts', data);
};

export const updateAlert = async (id, data) => {
  return await api.put(`/alerts/${id}`, data);
};

export const updateAlertStatus = async (id, status, resolutionNotes) => {
  return await api.patch(`/alerts/${id}/status`, { status, resolutionNotes });
};

export const updateAlertSeverity = async (id, severity) => {
  return await api.patch(`/alerts/${id}/severity`, { severity });
};

export const assignAlert = async (id, assignedTo) => {
  return await api.patch(`/alerts/${id}/assign`, { assignedTo });
};

export const getAlertHistory = async (id) => {
  return await api.get(`/alerts/${id}/history`);
};

export const deleteAlert = async (id) => {
  return await api.delete(`/alerts/${id}`);
};

export const getShipmentAlerts = async (shipmentId) => {
  return await api.get(`/alerts/shipment/${shipmentId}`);
};

export const getAlertStats = async () => {
  return await api.get('/alerts/stats');
};

const alertService = {
  getAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  updateAlertStatus,
  updateAlertSeverity,
  assignAlert,
  getAlertHistory,
  deleteAlert,
  getShipmentAlerts,
};

export default alertService;
