// Defined weather conditions allowed in the system
const WeatherConditions = {
  CLEAR: 'CLEAR',
  CLOUDY: 'CLOUDY',
  LIGHT_RAIN: 'LIGHT_RAIN',
  MODERATE_RAIN: 'MODERATE_RAIN',
  HEAVY_RAIN: 'HEAVY_RAIN',
  STORM: 'STORM',
  FOG: 'FOG'
};

// Mappings for weather and geographic risk levels
const RiskLevels = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Weight configurations for environmental calculation
const RiskWeights = {
  RAINFALL: 0.25,
  FLOOD: 0.25,
  LANDSLIDE: 0.30,
  VISIBILITY: 0.20
};

// Predefined deterministic profiles for regional hubs in the North Eastern Region
const PredefinedLocationProfiles = {
  shillong: {
    condition: WeatherConditions.HEAVY_RAIN,
    rainfallMm: 82,
    temperatureC: 18,
    visibilityKm: 2.5,
    floodScore: 40, // Moderate risk
    landslideScore: 78 // Critical risk (High terrain)
  },
  guwahati: {
    condition: WeatherConditions.MODERATE_RAIN,
    rainfallMm: 15,
    temperatureC: 28,
    visibilityKm: 7.0,
    floodScore: 60, // High flood risk (Brahmaputra basin plains)
    landslideScore: 10 // Low landslide risk
  },
  imphal: {
    condition: WeatherConditions.CLOUDY,
    rainfallMm: 8,
    temperatureC: 22,
    visibilityKm: 9.0,
    floodScore: 30, // Medium risk
    landslideScore: 45 // Moderate landslide risk
  },
  agartala: {
    condition: WeatherConditions.HEAVY_RAIN,
    rainfallMm: 58,
    temperatureC: 27,
    visibilityKm: 4.0,
    floodScore: 82, // Critical flood risk
    landslideScore: 8 // Low landslide risk
  },
  itanagar: {
    condition: WeatherConditions.HEAVY_RAIN,
    rainfallMm: 48,
    temperatureC: 20,
    visibilityKm: 4.5,
    floodScore: 20, // Low flood
    landslideScore: 72 // High landslide risk (Foothills)
  },
  aizawl: {
    condition: WeatherConditions.FOG,
    rainfallMm: 55,
    temperatureC: 17,
    visibilityKm: 1.2, // Poor visibility (FOG)
    floodScore: 15,
    landslideScore: 88 // Critical landslide risk
  },
  kohima: {
    condition: WeatherConditions.LIGHT_RAIN,
    rainfallMm: 4,
    temperatureC: 19,
    visibilityKm: 8.5,
    floodScore: 10,
    landslideScore: 68 // High terrain/landslide risk
  },
  gangtok: {
    condition: WeatherConditions.STORM,
    rainfallMm: 94,
    temperatureC: 14,
    visibilityKm: 0.8, // Critical visibility
    floodScore: 25,
    landslideScore: 92 // Critical landslide risk
  }
};

module.exports = {
  WeatherConditions,
  RiskLevels,
  RiskWeights,
  PredefinedLocationProfiles
};
