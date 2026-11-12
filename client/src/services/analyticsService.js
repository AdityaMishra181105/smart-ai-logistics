import api from './api';

export const getOverview = async (params = {}) => {
  return await api.get('/analytics/overview', { params });
};

export const getShipmentAnalytics = async (params = {}) => {
  return await api.get('/analytics/shipments', { params });
};

export const getDeliveryPerformance = async (params = {}) => {
  return await api.get('/analytics/delivery-performance', { params });
};

export const getVehicleAnalytics = async (params = {}) => {
  return await api.get('/analytics/vehicles', { params });
};

export const getRouteAnalytics = async (params = {}) => {
  return await api.get('/analytics/routes', { params });
};

export const getAlertAnalytics = async (params = {}) => {
  return await api.get('/analytics/alerts', { params });
};

const analyticsService = {
  getOverview,
  getShipmentAnalytics,
  getDeliveryPerformance,
  getVehicleAnalytics,
  getRouteAnalytics,
  getAlertAnalytics
};

export default analyticsService;
