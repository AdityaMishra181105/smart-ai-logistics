import api from './api';

export const getLocationRisk = async (location) => {
  return await api.get('/environment/location', { params: { location } });
};

export const getRouteRisk = async (shipmentId, routeId) => {
  return await api.get(`/environment/route/${shipmentId}/${routeId}`);
};

export const getShipmentRouteRisks = async (shipmentId) => {
  return await api.get(`/environment/route/${shipmentId}`);
};

const environmentService = {
  getLocationRisk,
  getRouteRisk,
  getShipmentRouteRisks
};

export default environmentService;
