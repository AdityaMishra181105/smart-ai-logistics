const axios = require('axios');

/**
 * Weather Service using OpenWeatherMap API with Open-Meteo Fallback
 * Provides real-time weather sampling for route risk analysis
 * 
 * NO API KEY REQUIRED for Open-Meteo fallback
 */

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

const weatherCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get weather via Open-Meteo API (Keyless Real Weather)
 */
const getWeatherByOpenMeteo = async (lat, lon) => {
  try {
    const res = await axios.get(`${OPEN_METEO_BASE}/forecast`, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
        hourly: 'temperature_2m,relativehumidity_2m,precipitation,rain,windspeed_10m,visibility'
      },
      timeout: 4000
    });

    if (res.data && res.data.current_weather) {
      const cw = res.data.current_weather;
      const hourly = res.data.hourly || {};
      const rainVal = hourly.rain ? hourly.rain[0] || 0 : 0;
      const visibilityVal = hourly.visibility ? hourly.visibility[0] || 10000 : 10000;

      return {
        temperature: cw.temperature,
        feelsLike: cw.temperature,
        humidity: 65,
        windSpeed: cw.windspeed,
        rain: rainVal,
        visibility: visibilityVal,
        main: cw.weathercode > 60 ? 'Rain' : cw.weathercode > 30 ? 'Clouds' : 'Clear',
        description: `Weather code ${cw.weathercode} (${cw.temperature}°C, Wind ${cw.windspeed} km/h)`,
        locationName: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`
      };
    }
  } catch (err) {
    console.warn(`[Weather] Open-Meteo query failed for [${lat}, ${lon}]:`, err.message);
  }
  return null;
};

/**
 * Get current weather for coordinates
 */
const getWeatherByCoordinates = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Try OpenWeatherMap if key is provided
  if (WEATHER_API_KEY) {
    try {
      const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
        params: { lat, lon, appid: WEATHER_API_KEY, units: 'metric' },
        timeout: 4000
      });

      if (response.data) {
        const data = {
          temperature: response.data.main.temp,
          feelsLike: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          pressure: response.data.main.pressure,
          description: response.data.weather[0].description,
          main: response.data.weather[0].main,
          windSpeed: response.data.wind.speed,
          visibility: response.data.visibility,
          rain: response.data.rain ? response.data.rain['1h'] || 0 : 0,
          locationName: response.data.name
        };
        weatherCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.warn('[Weather] OpenWeatherMap request failed. Using Open-Meteo fallback.');
    }
  }

  // Fallback to Open-Meteo
  const openMeteoData = await getWeatherByOpenMeteo(lat, lon);
  if (openMeteoData) {
    weatherCache.set(cacheKey, { data: openMeteoData, timestamp: Date.now() });
    return openMeteoData;
  }

  return null;
};

/**
 * Analyze weather risk for a route
 */
const analyzeRouteWeather = async (routeCoordinates) => {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return { available: false, reason: 'No route coordinates provided' };
  }

  try {
    const samplePoints = [];
    samplePoints.push(routeCoordinates[0]); // Start
    if (routeCoordinates.length > 2) {
      samplePoints.push(routeCoordinates[Math.floor(routeCoordinates.length / 2)]); // Mid
    }
    if (routeCoordinates.length > 1) {
      samplePoints.push(routeCoordinates[routeCoordinates.length - 1]); // End
    }

    const weatherSamples = [];
    for (let i = 0; i < samplePoints.length; i++) {
      const [lat, lon] = samplePoints[i];
      const w = await getWeatherByCoordinates(lat, lon);
      if (w) {
        weatherSamples.push({
          location: i === 0 ? 'Pickup Point' : i === samplePoints.length - 1 ? 'Destination Point' : 'En-route Corridor',
          coordinates: [lat, lon],
          ...w
        });
      }
    }

    if (weatherSamples.length === 0) {
      return { available: false, reason: 'Weather risk data unavailable' };
    }

    const avgRainfall = weatherSamples.reduce((sum, s) => sum + (s.rain || 0), 0) / weatherSamples.length;
    const maxRainfall = Math.max(...weatherSamples.map(s => s.rain || 0));
    const avgWindSpeed = weatherSamples.reduce((sum, s) => sum + (s.windSpeed || 0), 0) / weatherSamples.length;
    const maxWindSpeed = Math.max(...weatherSamples.map(s => s.windSpeed || 0));
    const hasHeavyRain = maxRainfall > 10;
    const hasStrongWind = maxWindSpeed > 15;
    
    let riskLevel = 'LOW';
    let riskScore = 10;

    if (hasHeavyRain) riskScore += 30;
    else if (maxRainfall > 2) riskScore += 15;

    if (hasStrongWind) riskScore += 20;
    else if (maxWindSpeed > 10) riskScore += 10;

    if (riskScore >= 45) riskLevel = 'HIGH';
    else if (riskScore >= 25) riskLevel = 'MEDIUM';

    return {
      available: true,
      samples: weatherSamples,
      analysis: {
        avgRainfall: avgRainfall.toFixed(1),
        maxRainfall: maxRainfall.toFixed(1),
        avgWindSpeed: avgWindSpeed.toFixed(1),
        maxWindSpeed: maxWindSpeed.toFixed(1),
        hasHeavyRain,
        hasStrongWind,
        riskLevel,
        riskScore
      }
    };
  } catch (error) {
    console.error('[Weather] Error analyzing route weather:', error.message);
    return { available: false, reason: 'Weather risk data unavailable' };
  }
};

module.exports = {
  getWeatherByCoordinates,
  analyzeRouteWeather
};
