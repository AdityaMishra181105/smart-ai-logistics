import api from './api';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  return await api.get('/dashboard/stats');
};

/**
 * Get active vehicles with GPS locations
 */
export const getActiveVehicles = async () => {
  return await api.get('/dashboard/vehicles/active');
};

/**
 * Get recent incidents
 */
export const getRecentIncidents = async () => {
  return await api.get('/dashboard/incidents/recent');
};

/**
 * Get weather summary
 */
export const getWeatherSummary = async () => {
  return await api.get('/dashboard/weather/summary');
};

export default {
  getDashboardStats,
  getActiveVehicles,
  getRecentIncidents,
  getWeatherSummary,
};
