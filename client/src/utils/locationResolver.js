import { nerLocations } from '../constants/nerLocations';

/**
 * Resolves text location names to pre-defined North Eastern Region locations and coordinates.
 * Supports exact match, prefix match, and substring match.
 * @param {string} locationName 
 * @returns {object|null} The resolved location containing latitude, longitude, name, and state
 */
export const resolveNERLocation = (locationName) => {
  if (!locationName) return null;
  const normalized = locationName.trim().toLowerCase();

  // Try exact or prefix match first (e.g. "Guw" -> "Guwahati")
  let match = nerLocations.find(
    (loc) =>
      loc.name.toLowerCase() === normalized ||
      loc.name.toLowerCase().startsWith(normalized)
  );

  // Fallback to substring matching (e.g. "center shillong" -> "Shillong")
  if (!match) {
    match = nerLocations.find((loc) =>
      normalized.includes(loc.name.toLowerCase()) ||
      loc.name.toLowerCase().includes(normalized)
    );
  }

  if (match) {
    return {
      latitude: match.latitude,
      longitude: match.longitude,
      name: match.name,
      state: match.state,
      type: match.type,
    };
  }

  return null;
};
