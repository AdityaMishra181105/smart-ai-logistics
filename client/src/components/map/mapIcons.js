import L from 'leaflet';

// Leaflet default asset imports to override default packaging pathing bugs
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Overwrite Leaflet default icon URL paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

/**
 * Returns an HTML string representing an SVG Map Pin with a centered circular core
 * holding a white icon.
 */
const getSvgPin = (color, svgContent) => {
  return `
    <div class="marker-pin-wrapper" style="width: 30px; height: 42px; position: relative;">
      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0, 0, 0, 0.45));">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}"/>
        <circle cx="15" cy="15" r="9" fill="#0D131F"/>
        <g transform="translate(8, 8) scale(0.58)" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          ${svgContent}
        </g>
      </svg>
    </div>
  `;
};

// SVG Paths scaled down to scale(0.58) fitting inside the 18x18px circle container
const iconPaths = {
  warehouse: `
    <path d="M3 21h18"></path>
    <path d="M3 10v11"></path>
    <path d="M21 10v11"></path>
    <path d="M4 10h16"></path>
    <path d="M12 2v8"></path>
    <path d="m9 6 3-4 3 4"></path>
  `,
  cross: `
    <path d="M12 5v14"></path>
    <path d="M5 12h14"></path>
  `,
  leaf: `
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-13.9.2"></path>
    <path d="M9 22v-4"></path>
  `,
  box: `
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
    <path d="m3.3 7 8.7 5 8.7-5"></path>
    <path d="M12 22V12"></path>
  `,
  pickup: `
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  `,
  destination: `
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
    <line x1="4" y1="22" x2="4" y2="15"></line>
  `,
  alert: `
    <path d="m12 3 8 14H4L12 3z"></path>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="15" x2="12.01" y2="15"></line>
  `
};

/**
 * Returns a Leaflet DivIcon configured with custom SVGs.
 * @param {string} type 
 * @returns {L.DivIcon}
 */
export const getMapIcon = (type) => {
  let color = '#3B82F6';
  let path = iconPaths.box;

  if (type.startsWith('ALERT_')) {
    const severity = type.split('_')[1];
    color = '#3B82F6'; // Default Blue
    if (severity === 'LOW') color = '#10B981'; // Green
    if (severity === 'MEDIUM') color = '#F59E0B'; // Orange
    if (severity === 'HIGH') color = '#EF4444'; // Red
    if (severity === 'CRITICAL') color = '#B91C1C'; // Dark Red
    path = iconPaths.alert;
  } else {
    switch (type) {
      case 'LOGISTICS_HUB':
        color = '#06B6D4'; // Cyan
        path = iconPaths.warehouse;
        break;
      case 'MEDICAL_CENTER':
        color = '#EF4444'; // Red
        path = iconPaths.cross;
        break;
      case 'AGRICULTURAL_CENTER':
        color = '#10B981'; // Green
        path = iconPaths.leaf;
        break;
      case 'SUPPLY_DEPOT':
        color = '#F59E0B'; // Orange
        path = iconPaths.box;
        break;
      case 'PICKUP':
        color = '#6366F1'; // Indigo-blue
        path = iconPaths.pickup;
        break;
      case 'DESTINATION':
        color = '#10B981'; // Emerald-green
        path = iconPaths.destination;
        break;
    }
  }

  return L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: getSvgPin(color, path),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38]
  });
};
