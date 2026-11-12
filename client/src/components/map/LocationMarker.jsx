import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { getMapIcon } from './mapIcons';
import { MapPin } from 'lucide-react';

const LocationMarker = ({ locations = [], visibleTypes = {} }) => {
  // Filter locations by selected toggles
  const visibleLocs = locations.filter(loc => visibleTypes[loc.type]);

  const formatType = (type) => {
    return type.replace('_', ' ');
  };

  return (
    <>
      {visibleLocs.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.latitude, loc.longitude]}
          icon={getMapIcon(loc.type)}
        >
          <Popup>
            <div className="text-xs space-y-1.5 p-0.5 text-customText max-w-[200px]">
              <div className="flex items-center gap-1.5 border-b border-darkBorder pb-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-customPrimary" />
                <h4 className="font-bold text-customText text-xs truncate">{loc.name}</h4>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-customMuted">State:</span>
                <span className="font-semibold text-customText">{loc.state}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-customMuted">Type:</span>
                <span className="font-bold text-customPrimary uppercase text-[9px] tracking-wider bg-customPrimary/10 border border-customPrimary/20 px-1.5 py-0.5 rounded">
                  {formatType(loc.type)}
                </span>
              </div>
              <p className="text-[10px] text-customMuted leading-relaxed pt-1 border-t border-darkBorder/40">
                {loc.description}
              </p>
              <div className="text-[9px] text-customMuted bg-darkBgSecondary p-1 rounded font-mono text-center">
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default LocationMarker;
