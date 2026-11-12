import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import LogisticsMap from '../map/LogisticsMap';
import { Map, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const OperationalMapPanel = ({ shipments = [], alerts = [] }) => {
  const { t } = useLanguage();
  const [showShipments, setShowShipments] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showRecommended, setShowRecommended] = useState(true);
  
  // Clean mock routes mapping for map visual routes representation
  // We can pass the shipments list to LogisticsMap which handles rendering active pins.
  const activeShipments = showShipments ? shipments : [];

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-darkBorder flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <Map className="w-4 h-4 text-customPrimary" />
          {t('operationalGisMapPanel', 'Operational GIS Map Panel')}
        </CardTitle>

        {/* Map Layers Toggles - Keyboard Accessible */}
        <div className="flex flex-wrap items-center gap-4 bg-darkBgSecondary/35 border border-darkBorder/40 px-3 py-1.5 rounded-lg text-[10px]">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-customMuted" />
            <span className="font-bold text-customMuted uppercase mr-1">{t('layers', 'Layers')}:</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-customText select-none">
            <input
              type="checkbox"
              checked={showShipments}
              onChange={(e) => setShowShipments(e.target.checked)}
              className="rounded bg-darkCard border-darkBorder text-customPrimary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              aria-label="Toggle visible shipment pins on the map"
            />
            <span>{t('shipmentsLabel', 'Shipments')}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-customText select-none">
            <input
              type="checkbox"
              checked={showRiskZones}
              onChange={(e) => setShowRiskZones(e.target.checked)}
              className="rounded bg-darkCard border-darkBorder text-customPrimary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              aria-label="Toggle geo-hazard zones and alerts overlays"
            />
            <span>{t('riskZonesLabel', 'Risk Zones')}</span>
          </label>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-2 relative overflow-hidden min-h-[380px] lg:min-h-[460px]">
        <div className="w-full h-full rounded-lg overflow-hidden border border-darkBorder">
          <LogisticsMap
            mode="dashboard"
            shipments={activeShipments}
            alerts={alerts}
            height="100%"
            showEnvOverlay={showRiskZones}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationalMapPanel;
