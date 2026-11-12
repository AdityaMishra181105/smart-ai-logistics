import axios from 'axios';
import api from './api';

/**
 * Routing Service - Uses OSRM Driving Engine API
 */

/**
 * Calculate real road route between two coordinates
 * 
 * @param {Array} start - [longitude, latitude] of start point
 * @param {Array} end - [longitude, latitude] of end point
 * @returns {Promise} Route data with coordinates following real roads
 */
export const calculateRoadRoute = async (start, end) => {
  try {
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      throw new Error('Invalid start or end coordinates');
    }

    const lon1 = start[0];
    const lat1 = start[1];
    const lon2 = end[0];
    const lat2 = end[1];

    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&alternatives=true`;
    const response = await axios.get(url, { timeout: 8000 });

    if (response.data?.routes && response.data.routes.length > 0) {
      const primaryRoute = response.data.routes[0];
      const rawCoordinates = primaryRoute.geometry.coordinates; // [[lon, lat], ...]
      const latLngCoords = rawCoordinates.map(c => [c[1], c[0]]);
      const distance = primaryRoute.distance; // meters
      const duration = primaryRoute.duration; // seconds

      return {
        success: true,
        coordinates: latLngCoords,
        distance,
        duration,
        distanceKm: (distance / 1000).toFixed(1),
        durationMinutes: Math.round(duration / 60),
        fallback: false
      };
    }

    throw new Error('Unable to calculate a real road route.');
  } catch (error) {
    console.error('Route calculation error:', error);
    return {
      success: false,
      error: error.message || 'Unable to calculate a real road route.',
      coordinates: [],
      distance: 0,
      duration: 0,
      distanceKm: 0,
      durationMinutes: 0,
      fallback: true
    };
  }
};

/**
 * Geocode an address to coordinates
 * Uses backend geocoding service (Nominatim - no API key needed)
 * 
 * @param {string} address - Address string to geocode
 * @returns {Promise} Coordinates [latitude, longitude]
 */
export const geocodeAddress = async (address) => {
  try {
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address');
    }

    const response = await api.post('/geocoding/location', { locationName: address });

    if (response.data && response.data.success && response.data.data) {
      const coords = response.data.data;
      return {
        success: true,
        latitude: coords.latitude,
        longitude: coords.longitude,
        formatted: coords.formatted
      };
    }

    throw new Error('Address not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Reverse geocode coordinates to address
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise} Address information
 */
export const reverseGeocode = async (lat, lon) => {
  try {
    // Backend doesn't have reverse geocoding yet
    // Return basic info
    return {
      success: true,
      name: `Location [${lat.toFixed(4)}, ${lon.toFixed(4)}]`,
      formatted: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  calculateRoadRoute,
  geocodeAddress,
  reverseGeocode
};
