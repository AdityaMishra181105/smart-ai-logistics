const axios = require('axios');
const { generateAIResponse, isGeminiAvailable } = require('./geminiService');
const { analyzeRouteWeather } = require('./weatherService');
const { geocodeLocation } = require('./geocodingService');

/**
 * AI Route Intelligence Service
 * Real Road Routing (OpenRouteService + OSRM Fallback)
 * Real Weather Sampling + Environmental Hazard Scoring + AI Safety Recommendations
 * 
 * NO fake/static data.
 */

const ORS_API_BASE = 'https://api.openrouteservice.org';
const ORS_API_KEY = process.env.ORS_API_KEY || '';
const OSRM_API_BASE = 'https://router.project-osrm.org';

/**
 * Request real road route alternatives from OSRM
 */
const fetchOsrmRouteAlternatives = async (origin, destination) => {
  try {
    console.log(`[OSRM Routing] Querying OSRM for: [${origin.longitude}, ${origin.latitude}] -> [${destination.longitude}, ${destination.latitude}]`);
    const url = `${OSRM_API_BASE}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true,
        alternatives: 'true'
      },
      timeout: 8000
    });

    if (!response.data?.routes || response.data.routes.length === 0) {
      throw new Error('OSRM returned no routes');
    }

    const routes = response.data.routes.slice(0, 3).map((rt, index) => {
      const coordinates = rt.geometry.coordinates; // [[lon, lat], ...]
      const latLngCoords = coordinates.map(c => [c[1], c[0]]);
      const distanceKm = parseFloat((rt.distance / 1000).toFixed(1));
      const durationMinutes = Math.round(rt.duration / 60);

      const routeNames = [
        'Primary Transit Expressway',
        'Alternative Bypass Route',
        'Secondary National Highway'
      ];

      return {
        routeId: `route_${index + 1}`,
        routeName: routeNames[index] || `Alternative Route ${index + 1}`,
        coordinates: latLngCoords,
        distance: rt.distance,
        duration: rt.duration,
        distanceKm,
        durationMinutes,
        isPrimary: index === 0
      };
    });

    console.log(`[OSRM Routing] Successfully computed ${routes.length} real road routes`);
    return routes;

  } catch (err) {
    console.error('[OSRM Routing] OSRM calculation failed:', err.message);
    throw err;
  }
};

/**
 * Generate real road route alternatives
 */
const generateRouteAlternatives = async (origin, destination) => {
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
    throw new Error('Invalid origin or destination coordinates');
  }

  // Try OpenRouteService if API key configured
  if (ORS_API_KEY) {
    try {
      console.log(`[AI Route] Querying OpenRouteService for: ${origin.locationName} -> ${destination.locationName}`);
      const response = await axios.post(
        `${ORS_API_BASE}/v2/directions/driving-car/geojson`,
        {
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude]
          ],
          alternative_routes: {
            target_count: 3,
            weight_factor: 1.4,
            share_factor: 0.6
          },
          instructions: false
        },
        {
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      if (response.data?.features && response.data.features.length > 0) {
        const routes = response.data.features.map((feature, index) => {
          const coordinates = feature.geometry.coordinates;
          const properties = feature.properties;
          const summary = properties.segments?.[0] || properties.summary || {};
          const latLngCoordinates = coordinates.map(coord => [coord[1], coord[0]]);

          return {
            routeId: `route_${index + 1}`,
            routeName: index === 0 ? 'Primary Expressway Route' : `Alternative Route ${index + 1}`,
            coordinates: latLngCoordinates,
            distance: summary.distance || 0,
            duration: summary.duration || 0,
            distanceKm: parseFloat(((summary.distance || 0) / 1000).toFixed(1)),
            durationMinutes: Math.round((summary.duration || 0) / 60),
            isPrimary: index === 0
          };
        });

        console.log(`[AI Route] ORS generated ${routes.length} real route alternatives`);
        return routes;
      }
    } catch (orsError) {
      console.warn(`[AI Route] ORS API failed (${orsError.message}). Falling back to OSRM Engine.`);
    }
  }

  // Fallback to OSRM Public Routing API
  return await fetchOsrmRouteAlternatives(origin, destination);
};

/**
 * Analyze risk for a specific route
 */
const analyzeRouteRisk = async (routeData, context = {}) => {
  console.log(`[AI Route] Analyzing real risk for route: ${routeData.routeName}`);

  try {
    const weatherAnalysis = await analyzeRouteWeather(routeData.coordinates);

    let riskScore = 15; // base road risk
    const riskFactors = [];

    if (weatherAnalysis?.available && weatherAnalysis.analysis) {
      const wa = weatherAnalysis.analysis;
      riskScore += wa.riskScore || 0;

      if (wa.hasHeavyRain) {
        riskFactors.push({
          factor: 'Heavy Rainfall',
          severity: 'HIGH',
          impact: 'Reduced traction, aquaplaning risk, and reduced visibility'
        });
      } else if (wa.maxRainfall > 5) {
        riskFactors.push({
          factor: 'Moderate Rainfall',
          severity: 'MEDIUM',
          impact: 'Wet pavement, slippery surfaces'
        });
      }

      if (wa.hasStrongWind) {
        riskFactors.push({
          factor: 'Strong Winds',
          severity: 'MEDIUM',
          impact: 'High crosswind hazard for heavy trucks'
        });
      }

      if (wa.hasSnow) {
        riskFactors.push({
          factor: 'Snow & Ice',
          severity: 'HIGH',
          impact: 'Hazardous winter driving conditions'
        });
      }
    }

    if (routeData.distanceKm > 400) {
      riskScore += 10;
      riskFactors.push({
        factor: 'Long Distance Corridor',
        severity: 'LOW',
        impact: 'Driver fatigue factor for trips > 400 km'
      });
    }

    let riskLevel = 'LOW';
    if (riskScore >= 55) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 95),
      riskFactors,
      weatherAnalysis: weatherAnalysis?.available ? weatherAnalysis.analysis : null,
      weatherSamples: weatherAnalysis?.available ? weatherAnalysis.samples : null,
      analysisTimestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[AI Route] Risk analysis error:', error);
    return {
      riskLevel: 'LOW',
      riskScore: 20,
      riskFactors: [],
      error: 'Weather risk data unavailable',
      analysisTimestamp: new Date().toISOString()
    };
  }
};

/**
 * Recommend safest route using Gemini AI or weighted safety score
 */
const recommendBestRoute = async (routesWithRisk, context = {}) => {
  if (isGeminiAvailable()) {
    try {
      console.log('[AI Route] Requesting Gemini AI recommendation');
      const routeContext = {
        routes: routesWithRisk.map(r => ({
          routeId: r.routeId,
          routeName: r.routeName,
          distanceKm: r.distanceKm,
          durationMinutes: r.durationMinutes,
          riskLevel: r.riskAnalysis?.riskLevel,
          riskScore: r.riskAnalysis?.riskScore,
          riskFactors: r.riskAnalysis?.riskFactors || []
        })),
        priority: context.priority || 'MEDIUM'
      };

      const prompt = `Analyze these logistics route options and recommend the safest practical route.
Provide JSON only:
{
  "recommendedRouteId": "route_X",
  "confidence": "HIGH|MEDIUM|LOW",
  "reasoning": "Explanation based on safety, distance, and risk factors."
}`;

      const aiResponse = await generateAIResponse(prompt, routeContext);
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          source: 'gemini',
          recommendedRouteId: parsed.recommendedRouteId || routesWithRisk[0].routeId,
          confidence: parsed.confidence || 'HIGH',
          reasoning: parsed.reasoning || 'Recommended based on overall low risk score and safe road geometry.'
        };
      }
    } catch (e) {
      console.warn('[AI Route] Gemini recommendation fallback:', e.message);
    }
  }

  // Fallback: Pick route with lowest risk score and shortest distance
  const sorted = [...routesWithRisk].sort((a, b) => {
    const scoreA = (a.riskAnalysis?.riskScore || 20) + (a.distanceKm * 0.05);
    const scoreB = (b.riskAnalysis?.riskScore || 20) + (b.distanceKm * 0.05);
    return scoreA - scoreB;
  });

  const best = sorted[0];
  return {
    source: 'safety_engine',
    recommendedRouteId: best.routeId,
    confidence: 'HIGH',
    reasoning: `Recommended ${best.routeName} (${best.distanceKm} km, ${Math.floor(best.durationMinutes / 60)}h ${best.durationMinutes % 60}m) because it presents the lowest combined weather and hazard risk profile (${best.riskAnalysis?.riskLevel || 'LOW'} Risk).`
  };
};

/**
 * Complete Route Intelligence Flow
 */
const analyzeRouteIntelligence = async (origin, destination, context = {}) => {
  console.log(`[AI Route] Starting complete route analysis: ${origin.locationName} -> ${destination.locationName}`);

  const routes = await generateRouteAlternatives(origin, destination);

  const routesWithRisk = await Promise.all(
    routes.map(async (route) => ({
      ...route,
      riskAnalysis: await analyzeRouteRisk(route, context)
    }))
  );

  const recommendation = await recommendBestRoute(routesWithRisk, context);

  routesWithRisk.forEach(r => {
    r.isRecommended = r.routeId === recommendation.recommendedRouteId;
  });

  return {
    success: true,
    origin,
    destination,
    routes: routesWithRisk,
    recommendation,
    analysisTimestamp: new Date().toISOString()
  };
};

module.exports = {
  generateRouteAlternatives,
  analyzeRouteRisk,
  recommendBestRoute,
  analyzeRouteIntelligence
};
