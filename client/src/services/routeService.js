import api from './api';

export const generateRoutes = async (shipmentId) => {
  return await api.post(`/shipments/${shipmentId}/routes/generate`);
};

export const getRoutes = async (shipmentId) => {
  return await api.get(`/shipments/${shipmentId}/routes`);
};

export const selectRoute = async (shipmentId, routeId, routeData) => {
  return await api.patch(`/shipments/${shipmentId}/routes/${routeId}/select`, { routeData });
};

const routeService = {
  generateRoutes,
  getRoutes,
  selectRoute
};

export default routeService;
