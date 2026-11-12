import api from './api';

export const createRoute = async (data) => {
  return await api.post('/routes', data);
};

export const getRoutes = async (params = {}) => {
  return await api.get('/routes', { params });
};

export const getRouteById = async (id) => {
  return await api.get(`/routes/${id}`);
};

export const updateRoute = async (id, data) => {
  return await api.put(`/routes/${id}`, data);
};

export const updateRouteStatus = async (id, status) => {
  return await api.patch(`/routes/${id}/status`, { status });
};

export const assignVehicleToRoute = async (id, vehicleId) => {
  return await api.post(`/routes/${id}/assign-vehicle`, { vehicleId });
};

export const addShipmentToRoute = async (id, shipmentId) => {
  return await api.post(`/routes/${id}/shipments`, { shipmentId });
};

export const removeShipmentFromRoute = async (id, shipmentId) => {
  return await api.delete(`/routes/${id}/shipments/${shipmentId}`);
};

export const getRouteStats = async () => {
  return await api.get('/routes/stats');
};

export const deleteRoute = async (id) => {
  return await api.delete(`/routes/${id}`);
};

export const getDriverRoutes = async () => {
  return await api.get('/routes/driver');
};

const routeMgmtService = {
  createRoute,
  getRoutes,
  getDriverRoutes,
  getRouteById,
  updateRoute,
  updateRouteStatus,
  assignVehicleToRoute,
  addShipmentToRoute,
  removeShipmentFromRoute,
  getRouteStats,
  deleteRoute,
};

export default routeMgmtService;
