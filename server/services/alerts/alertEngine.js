/**
 * Evaluates route accessibility scoring and concerns list.
 */
const evaluateAccessibility = (combinedRiskScore = 0, envRiskScore = 0, recommendationStatus = '', viableRoutesCount = 3) => {
  let score = 100;
  const concerns = [];

  // Deductions from Combined Risk
  if (combinedRiskScore > 75) {
    score -= 70;
    concerns.push('Selected route traverses geographic regions with critical disaster safety warnings.');
  } else if (combinedRiskScore > 50) {
    score -= 40;
    concerns.push('Route passes through high-risk safety zones.');
  } else if (combinedRiskScore > 25) {
    score -= 20;
    concerns.push('Moderate combined risk detected along transit corridor.');
  }

  // Deductions from Environmental Risk
  if (envRiskScore > 75) {
    score -= 30;
    concerns.push('Critical environmental conditions (torrential rainfall/storm) active.');
  } else if (envRiskScore > 50) {
    score -= 20;
    concerns.push('Heavy rainfall precipitation detected.');
  }

  // Deductions from Alternatives availability
  if (recommendationStatus === 'NO_SAFE_ROUTE' || viableRoutesCount === 0) {
    score -= 20;
    concerns.push('No alternative safe routes are currently available.');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine Level
  let level = 'GOOD';
  let summary = 'Route is fully accessible with nominal geographic and weather conditions.';

  if (score < 25) {
    level = 'BLOCKED';
    summary = 'Route accessibility is blocked. Safety parameters are severely compromised.';
  } else if (score < 55) {
    level = 'POOR';
    summary = 'Route accessibility is poor due to high geographic risk and inclement weather.';
  } else if (score < 85) {
    level = 'LIMITED';
    summary = 'Route accessibility is limited. Proceed with caution and expect delays.';
  }

  if (concerns.length === 0) {
    concerns.push('No active accessibility concerns reported.');
  }

  return {
    accessibilityLevel: level,
    accessibilityScore: score,
    concerns,
    summary
  };
};

/**
 * Evaluates connectivity classification (Estimated Logistics Connectivity).
 */
const evaluateConnectivity = (route = {}, accessibilityLevel = 'GOOD', geographicRiskScore = 0) => {
  let score = 100;
  const factors = [];

  // Check terrain condition
  const condition = (route.roadCondition || '').toUpperCase();
  const name = (route.name || '').toLowerCase();
  
  if (condition === 'MOUNTAIN' || name.includes('mountain') || name.includes('pass')) {
    score -= 25;
    factors.push('Mountainous high-altitude terrain corridors.');
  }

  // Hilly remote destination hubs (Tawang, Aizawl, Kohima, Gangtok)
  if (name.includes('tawang') || name.includes('aizawl') || name.includes('kohima') || name.includes('gangtok')) {
    score -= 20;
    factors.push('Remote regional terrain classification.');
  }

  // Deductions from Risk
  if (geographicRiskScore > 50) {
    score -= 15;
    factors.push('Elevated geographic hazard risk affecting physical communications.');
  }

  // Deductions from Accessibility
  if (accessibilityLevel === 'POOR') {
    score -= 15;
    factors.push('Poor route accessibility affecting logistical communications.');
  } else if (accessibilityLevel === 'BLOCKED') {
    score -= 30;
    factors.push('Blocked route: Logistics channel communications disrupted.');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine Level
  let level = 'GOOD';
  let summary = 'LOGISTICS CONNECTIVITY: Good. Normal communication and telemetry tracking channels operational.';

  if (score < 25) {
    level = 'UNKNOWN';
    summary = 'LOGISTICS CONNECTIVITY: Unknown. Complete communications blackout expected along remote mountainous corridors.';
  } else if (score < 55) {
    level = 'LIMITED';
    summary = 'LOGISTICS CONNECTIVITY: Limited. Expect frequent signal drops and delayed tracking telemetry updates.';
  } else if (score < 85) {
    level = 'MODERATE';
    summary = 'LOGISTICS CONNECTIVITY: Moderate. Hilly terrain may cause intermittent telemetry signal latency.';
  }

  if (factors.length === 0) {
    factors.push('Nominal communication and telemetry tracking channels operational.');
  }

  return {
    connectivityLevel: level,
    connectivityScore: score,
    factors,
    summary,
    source: 'DETERMINISTIC_LOCATION_ANALYSIS'
  };
};

module.exports = {
  evaluateAccessibility,
  evaluateConnectivity
};
