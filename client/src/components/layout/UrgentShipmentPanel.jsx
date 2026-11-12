import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight } from 'lucide-react';

const UrgentShipmentPanel = ({ shipments = [] }) => {
  const navigate = useNavigate();

  // Filter critical or urgent shipments
  const urgentItems = shipments.filter(s => s.priority === 'CRITICAL' || s.priority === 'URGENT');

  const getUrgentDetails = (s) => {
    const dest = s.destination?.locationName?.toLowerCase() || '';
    if (dest.includes('gangtok')) {
      return { risk: 'CRITICAL', status: 'NO_SAFE_ROUTE' };
    }
    if (dest.includes('aizawl') || dest.includes('shillong')) {
      return { risk: 'HIGH', status: 'RECOMMENDED' };
    }
    return { risk: 'MEDIUM', status: 'RECOMMENDED' };
  };

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full text-xs">
      <CardHeader className="pb-2.5 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-customDanger" />
          Urgent Operations Panel
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 overflow-y-auto space-y-2.5 max-h-[300px] flex-1">
        {urgentItems.length === 0 ? (
          <div className="p-4 text-center text-customMuted italic select-none">
            No urgent shipments require attention.
          </div>
        ) : (
          urgentItems.map(s => {
            const { risk, status } = getUrgentDetails(s);
            return (
              <div key={s._id} className="p-3 bg-darkBgSecondary/35 border border-darkBorder rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-customText text-[10px]">{s.shipmentId}</span>
                    <Badge variant="danger" className="text-[8px] py-0.5">URGENT</Badge>
                  </div>
                  <div className="text-[10px] text-customMuted">
                    <span>Cargo: <strong className="text-customText">{s.goodsType}</strong></span>
                    <span className="mx-1.5">•</span>
                    <span>To: <strong className="text-customText">{s.destination?.locationName}</strong></span>
                  </div>
                  <div className="text-[9px] text-customMuted">
                    <span>Route Risk: <strong className={risk === 'CRITICAL' ? 'text-customDanger' : 'text-orange-400'}>{risk}</strong></span>
                    <span className="mx-1.5">•</span>
                    <span>Status: <strong className="text-customText">{status.replace('_', ' ')}</strong></span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  className="font-bold uppercase tracking-wider text-[8px] py-1 flex items-center gap-0.5 self-end sm:self-center hover:bg-darkBgSecondary"
                  onClick={() => navigate(`/routes/analysis?shipment=${s._id}`)}
                >
                  <span>Review Route</span>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default UrgentShipmentPanel;
