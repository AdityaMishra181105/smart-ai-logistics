import api from './api';

export const createVehicle = async (data) => {
  return await api.post('/vehicles', data);
};

export const getVehicles = async (params = {}) => {
  return await api.get('/vehicles', { params });
};

export const getVehicleById = async (id) => {
  return await api.get(`/vehicles/${id}`);
};

export const updateVehicle = async (id, data) => {
  return await api.put(`/vehicles/${id}`, data);
};

export const updateVehicleStatus = async (id, status) => {
  return await api.patch(`/vehicles/${id}/status`, { status });
};

export const assignShipmentToVehicle = async (id, shipmentId) => {
  return await api.patch(`/vehicles/${id}/assign-shipment`, { shipmentId });
};

export const getVehicleStats = async () => {
  return await api.get('/vehicles/stats');
};

export const deleteVehicle = async (id) => {
  return await api.delete(`/vehicles/${id}`);
};

const vehicleService = {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  updateVehicleStatus,
  assignShipmentToVehicle,
  getVehicleStats,
  deleteVehicle,
};

export default vehicleService;
