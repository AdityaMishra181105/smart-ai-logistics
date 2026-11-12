const { AlertSeverities, AlertTypes } = require('./alertConstants');

/**
 * Deduplicates, prioritizes, and caps alerts at 10 items maximum.
 * Sort Order: Severity (descending) -> Actionable -> Route Relevance.
 */
const prioritizeAndFilterAlerts = (alerts = []) => {
  // Remove duplicates based on type, message, and target route
  const uniqueMap = {};
  const deduplicated = [];

  alerts.forEach((alert) => {
    const key = `${alert.type}-${alert.message}-${alert.routeId || 'global'}`;
    if (!uniqueMap[key]) {
      uniqueMap[key] = true;
      deduplicated.push(alert);
    }
  });

  // Sort
  const sorted = deduplicated.sort((a, b) => {
    const sevA = AlertSeverities[a.severity] || 1;
    const sevB = AlertSeverities[b.severity] || 1;

    if (sevA !== sevB) return sevB - sevA; // Severity first (Critical -> Info)
    if (a.actionable !== b.actionable) return b.actionable ? 1 : -1; // Actionable first
    return (a.routeId ? 1 : 0) - (b.routeId ? 1 : 0); // Route relevant first
  });

  // Cap at 10 alerts max
  return sorted.slice(0, 10);
};

module.exports = {
  prioritizeAndFilterAlerts
};
