const axios = require('axios');

/**
 * Multi-Stage Geocoding Service
 * Converts location names/landmarks/addresses into exact latitude/longitude coordinates.
 * 
 * Strategy:
 * 1. Landmark & Major Hub Dictionary lookup
 * 2. Nominatim Exact Search
 * 3. Typo Normalization & City Context Search
 * 4. Photon API (OpenStreetMap Komoot) Fallback
 * 
 * NO fake/random data. Returns null if location is genuinely unresolvable.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io/api';

const geocodeCache = new Map();

// Known Indian Landmarks, Educational Institutes, Hospitals & Logistics Hubs Dictionary
const LANDMARK_DICTIONARY = {
  // Lucknow
  'hazartganj, lucknow': { latitude: 26.8500, longitude: 80.9499, name: 'Hazratganj, Lucknow, UP' },
  'hazratganj, lucknow': { latitude: 26.8500, longitude: 80.9499, name: 'Hazratganj, Lucknow, UP' },
  'kgmu, lucknow': { latitude: 26.8687, longitude: 80.9167, name: 'King George Medical University, Lucknow' },
  'king george medical university, lucknow': { latitude: 26.8687, longitude: 80.9167, name: 'King George Medical University, Lucknow' },
  'lucknow': { latitude: 26.8467, longitude: 80.9462, name: 'Lucknow, Uttar Pradesh' },

  // Ghaziabad
  'rkgit, ghaziabad': { latitude: 28.6946, longitude: 77.4475, name: 'Raj Kumar Goel Institute of Technology, Ghaziabad' },
  'rkgit ghaziabad': { latitude: 28.6946, longitude: 77.4475, name: 'Raj Kumar Goel Institute of Technology, Ghaziabad' },
  'ghaziabad': { latitude: 28.6692, longitude: 77.4538, name: 'Ghaziabad, Uttar Pradesh' },

  // Delhi / NCR
  'delhi, medical hub': { latitude: 28.5672, longitude: 77.2100, name: 'AIIMS Medical Hub, New Delhi' },
  'delhi medical hub': { latitude: 28.5672, longitude: 77.2100, name: 'AIIMS Medical Hub, New Delhi' },
  'delhi': { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi, India' },
  'aiims delhi': { latitude: 28.5672, longitude: 77.2100, name: 'AIIMS, New Delhi' },

  // Other major cities
  'kanpur': { latitude: 26.4499, longitude: 80.3319, name: 'Kanpur, Uttar Pradesh' },
  'varanasi': { latitude: 25.3176, longitude: 82.9739, name: 'Varanasi, Uttar Pradesh' },
  'agra': { latitude: 27.1767, longitude: 78.0081, name: 'Agra, Uttar Pradesh' },
  'guwahati': { latitude: 26.1445, longitude: 91.7362, name: 'Guwahati, Assam' },
  'shillong': { latitude: 25.5788, longitude: 91.8933, name: 'Shillong, Meghalaya' }
};

/**
 * Sanitize and fix common typos in location names
 */
const sanitizeQuery = (query) => {
  if (!query) return '';
  let cleaned = query.trim().toLowerCase();
  cleaned = cleaned.replace(/hazartganj/g, 'hazratganj');
  return cleaned;
};

/**
 * Geocode a location string into coordinates
 * 
 * @param {string} locationName 
 * @param {string} address 
 * @returns {Promise<{latitude: number, longitude: number, formatted: string} | null>}
 */
const geocodeLocation = async (locationName, address = '') => {
  if (!locationName && !address) return null;

  const rawQuery = address ? `${locationName}, ${address}` : locationName;
  const cleanKey = sanitizeQuery(rawQuery);

  // Check memory cache
  if (geocodeCache.has(cleanKey)) {
    const cached = geocodeCache.get(cleanKey);
    if (cached) console.log(`[Geocoding] Cache hit: "${rawQuery}" -> [${cached.latitude}, ${cached.longitude}]`);
    return cached;
  }

  // 1. Stage 1: Dictionary Lookup
  if (LANDMARK_DICTIONARY[cleanKey]) {
    const res = LANDMARK_DICTIONARY[cleanKey];
    console.log(`[Geocoding] Dictionary match: "${rawQuery}" -> [${res.latitude}, ${res.longitude}]`);
    geocodeCache.set(cleanKey, res);
    return res;
  }

  // Try dictionary by partial substring matching
  for (const [key, val] of Object.entries(LANDMARK_DICTIONARY)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      console.log(`[Geocoding] Dictionary partial match: "${rawQuery}" (${key}) -> [${val.latitude}, ${val.longitude}]`);
      geocodeCache.set(cleanKey, val);
      return val;
    }
  }

  // Build candidate queries to try sequentially
  const queriesToTry = [];
  
  // Exact query
  queriesToTry.push(rawQuery);

  // Sanitized query with India appended
  const sanitized = sanitizeQuery(rawQuery);
  if (!sanitized.includes('india')) {
    queriesToTry.push(`${sanitized}, India`);
  }

  // If comma separated, try last segment (e.g. "Hazartganj, Lucknow" -> "Lucknow, Uttar Pradesh, India")
  if (rawQuery.includes(',')) {
    const parts = rawQuery.split(',').map(p => p.trim());
    const cityPart = parts[parts.length - 1];
    if (cityPart) {
      queriesToTry.push(`${cityPart}, Uttar Pradesh, India`);
      queriesToTry.push(`${cityPart}, India`);
    }
  }

  // 2. Stage 2: Nominatim API Search
  for (const q of queriesToTry) {
    try {
      console.log(`[Geocoding] Requesting Nominatim for: "${q}"`);
      const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q,
          format: 'json',
          limit: 1,
          countrycodes: 'in',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'SmartLogisticsApp/2.0 (logistics@smartapp.com)'
        },
        timeout: 4000
      });

      if (response.data && response.data.length > 0) {
        const item = response.data[0];
        const coords = {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          formatted: item.display_name
        };
        console.log(`[Geocoding] Nominatim Success: "${q}" -> [${coords.latitude}, ${coords.longitude}]`);
        geocodeCache.set(cleanKey, coords);
        return coords;
      }
    } catch (err) {
      console.warn(`[Geocoding] Nominatim request failed for "${q}":`, err.message);
    }
  }

  // 3. Stage 3: Photon API Fallback (OpenStreetMap Komoot)
  try {
    const photonQuery = sanitizeQuery(rawQuery);
    console.log(`[Geocoding] Requesting Photon API for: "${photonQuery}"`);
    const photonRes = await axios.get(PHOTON_BASE_URL, {
      params: {
        q: photonQuery,
        limit: 1
      },
      timeout: 4000
    });

    if (photonRes.data && photonRes.data.features && photonRes.data.features.length > 0) {
      const feat = photonRes.data.features[0];
      const coords = {
        latitude: feat.geometry.coordinates[1],
        longitude: feat.geometry.coordinates[0],
        formatted: feat.properties.name || photonQuery
      };
      console.log(`[Geocoding] Photon Success: "${photonQuery}" -> [${coords.latitude}, ${coords.longitude}]`);
      geocodeCache.set(cleanKey, coords);
      return coords;
    }
  } catch (err) {
    console.warn(`[Geocoding] Photon API request failed for "${rawQuery}":`, err.message);
  }

  console.error(`[Geocoding] CRITICAL: Could not resolve coordinates for "${rawQuery}" after trying all stages.`);
  return null;
};

/**
 * Batch Geocoding Helper
 */
const geocodeLocations = async (locations) => {
  const results = [];
  for (const loc of locations) {
    const coords = await geocodeLocation(loc.locationName, loc.address);
    results.push({ ...loc, coordinates: coords });
  }
  return results;
};

const clearCache = () => {
  geocodeCache.clear();
  console.log('[Geocoding] Cache cleared');
};

module.exports = {
  geocodeLocation,
  geocodeLocations,
  clearCache,
  LANDMARK_DICTIONARY
};
