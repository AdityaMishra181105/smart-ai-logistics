import api from './api';

export const createShipment = async (data) => {
  return await api.post('/shipments', data);
};

export const getShipments = async (params = {}) => {
  return await api.get('/shipments', { params });
};

export const getShipmentById = async (id) => {
  return await api.get(`/shipments/${id}`);
};

export const updateShipmentStatus = async (id, status) => {
  return await api.patch(`/shipments/${id}/status`, { status });
};

export const updateShipment = async (id, data) => {
  return await api.patch(`/shipments/${id}`, data);
};

export const deleteShipment = async (id) => {
  return await api.delete(`/shipments/${id}`);
};

export const putShipment = async (id, data) => {
  return await api.put(`/shipments/${id}`, data);
};

export const createShipmentFromOrder = async (orderId, data = {}) => {
  return await api.post(`/shipments/from-order/${orderId}`, data);
};

export const assignDriverToShipment = async (id, driverId) => {
  return await api.patch(`/shipments/${id}/assign-driver`, { driverId });
};

export const getDrivers = async () => {
  return await api.get('/users?role=DRIVER');
};

const shipmentService = {
  createShipment,
  createShipmentFromOrder,
  getShipments,
  getShipmentById,
  updateShipmentStatus,
  updateShipment,
  deleteShipment,
  putShipment,
  assignDriverToShipment,
  getDrivers,
};

export default shipmentService;
