import api from './api';

export const getOverviewReport = async (params = {}) => {
  return await api.get('/reports/overview', { params });
};

export const getShipmentReport = async (params = {}) => {
  return await api.get('/reports/shipments', { params });
};

export const getOrderReport = async (params = {}) => {
  return await api.get('/reports/orders', { params });
};

export const getVehicleReport = async (params = {}) => {
  return await api.get('/reports/vehicles', { params });
};

export const getRouteReport = async (params = {}) => {
  return await api.get('/reports/routes', { params });
};

export const getAlertReport = async (params = {}) => {
  return await api.get('/reports/alerts', { params });
};

export const getDriverReport = async (params = {}) => {
  return await api.get('/reports/driver', { params });
};

const reportService = {
  getOverviewReport,
  getShipmentReport,
  getOrderReport,
  getVehicleReport,
  getRouteReport,
  getAlertReport,
  getDriverReport
};

export default reportService;
