import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ChevronRight } from 'lucide-react';

const PriorityAttentionPanel = ({ shipments = [] }) => {
  const navigate = useNavigate();

  // Deterministic operational risk rank calculator
  const getRiskDetails = (s) => {
    let score = 0;
    if (s.priority === 'CRITICAL') score += 50;
    if (s.priority === 'HIGH') score += 30;
    
    const dest = s.destination?.locationName?.toLowerCase() || '';
    if (dest.includes('gangtok')) score += 40;
    if (dest.includes('aizawl')) score += 30;
    if (dest.includes('shillong')) score += 20;

    let level = 'LOW';
    let concern = 'Nominal transit conditions.';
    let statusColor = 'neutral';

    if (score >= 80) {
      level = 'CRITICAL';
      concern = 'Blocked route accessibility & active storm landslide warning.';
      statusColor = 'danger';
    } else if (score >= 60) {
      level = 'HIGH';
      concern = 'Corridor landslide risk warning active.';
      statusColor = 'warning';
    } else if (score >= 40) {
      level = 'MEDIUM';
      concern = 'Elevated rainfall inundation & visibility concerns.';
      statusColor = 'warning';
    }

    return { score, level, concern, statusColor };
  };

  // Sort and pick top 5
  const priorityItems = [...shipments]
    .map(s => ({ shipment: s, details: getRiskDetails(s) }))
    .sort((a, b) => b.details.score - a.details.score)
    .slice(0, 5);

  return (
    <Card className="bg-darkCard/80 border border-darkBorder flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-darkBorder">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-customDanger" />
          Priority Attention Panel
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[460px]">
        {priorityItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-customMuted italic">
            No shipments require priority attention.
          </div>
        ) : (
          priorityItems.map(({ shipment, details }) => (
            <div
              key={shipment._id}
              className={`p-3 border rounded-lg space-y-2 bg-darkBgSecondary/35 ${
                details.level === 'CRITICAL' ? 'border-customDanger/25' :
                details.level === 'HIGH' ? 'border-orange-500/25' : 'border-darkBorder'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-customText text-[10px]">
                  {shipment.shipmentId}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant={shipment.priority === 'CRITICAL' ? 'danger' : 'warning'} className="text-[8px] py-0.5">
                    {shipment.priority}
                  </Badge>
                  {details.level !== 'LOW' && (
                    <Badge variant={details.statusColor} className="text-[8px] py-0.5 uppercase">
                      {details.level} RISK
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-customMuted">Route:</span>
                  <span className="font-medium text-customText truncate max-w-[170px]">
                    {shipment.pickup?.locationName} → {shipment.destination?.locationName}
                  </span>
                </div>
                <div className="text-customMuted leading-relaxed bg-darkCard/40 p-1.5 rounded border border-darkBorder/40">
                  <strong className="text-customText text-[9px] uppercase block mb-0.5">Concern:</strong>
                  {details.concern}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="xs"
                  className="font-bold uppercase tracking-wider text-[8px] py-1 flex items-center gap-0.5 hover:bg-darkBgSecondary"
                  onClick={() => navigate(`/shipments/${shipment._id}`)}
                >
                  <span>Review</span>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default PriorityAttentionPanel;
