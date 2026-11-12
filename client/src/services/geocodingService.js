import api from './api';

/**
 * Geocode all shipments that are missing coordinates
 * This will update the shipments in the database with real coordinates
 * 
 * @returns {Promise} Geocoding results
 */
export const geocodeShipments = async () => {
  try {
    const response = await api.post('/geocoding/shipments');
    return response;
  } catch (error) {
    console.error('Failed to geocode shipments:', error);
    throw error;
  }
};

/**
 * Geocode a single location
 * 
 * @param {string} locationName - Location name
 * @param {string} address - Optional address
 * @returns {Promise} Coordinates result
 */
export const geocodeLocation = async (locationName, address = '') => {
  try {
    const response = await api.post('/geocoding/location', {
      locationName,
      address
    });
    return response;
  } catch (error) {
    console.error('Failed to geocode location:', error);
    throw error;
  }
};

export default {
  geocodeShipments,
  geocodeLocation
};
