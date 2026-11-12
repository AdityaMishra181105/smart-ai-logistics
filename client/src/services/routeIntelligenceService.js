import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Route Intelligence Service
 * Frontend service for AI-driven route analysis
 */

/**
 * Analyze route with AI intelligence
 * Generates alternatives, analyzes risk, gets AI recommendation
 * 
 * @param {string} routeId - Route ID to analyze
 * @returns {Promise} Analysis results
 */
export const analyzeRoute = async (routeId, routeData = {}) => {
  const token = localStorage.getItem('token');
  const targetId = routeId || routeData?._id || routeData?.routeId || routeData?.id || 'route_1';
  return axios.post(
    `${API_BASE_URL}/routes/${encodeURIComponent(targetId)}/analyze`,
    {
      routeId: targetId,
      routeName: routeData.routeName,
      origin: routeData.origin,
      destination: routeData.destination,
      originName: routeData.origin?.locationName || routeData.originName,
      destinationName: routeData.destination?.locationName || routeData.destinationName,
      originCoordinates: routeData.origin?.coordinates || routeData.originCoordinates,
      destinationCoordinates: routeData.destination?.coordinates || routeData.destinationCoordinates,
      distance: routeData.distance,
      estimatedDuration: routeData.estimatedDuration || routeData.duration,
      assignedVehicle: routeData.assignedVehicle,
      shipments: routeData.shipments,
      status: routeData.routeStatus || routeData.status,
      selectedRouteData: routeData.selectedRouteData
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

/**
 * Get route alternatives (cached)
 * 
 * @param {string} routeId - Route ID
 * @returns {Promise} Route alternatives
 */
export const getRouteAlternatives = async (routeId) => {
  const token = localStorage.getItem('token');
  return axios.get(
    `${API_BASE_URL}/routes/${routeId}/alternatives`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
};

/**
 * Select and confirm a route alternative
 * 
 * @param {string} routeId - Route ID
 * @param {string} selectedRouteId - Selected alternative route ID
 * @param {object} routeData - Full route data
 * @returns {Promise} Updated route
 */
export const selectRouteAlternative = async (routeId, selectedRouteId, routeData) => {
  const token = localStorage.getItem('token');
  return axios.post(
    `${API_BASE_URL}/routes/${routeId}/select`,
    {
      routeId: selectedRouteId,
      routeData
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

/**
 * Get current risk analysis for a route
 * 
 * @param {string} routeId - Route ID
 * @returns {Promise} Risk analysis
 */
export const getRouteRisk = async (routeId) => {
  const token = localStorage.getItem('token');
  return axios.get(
    `${API_BASE_URL}/routes/${routeId}/risk`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
};

export default {
  analyzeRoute,
  getRouteAlternatives,
  selectRouteAlternative,
  getRouteRisk
};
