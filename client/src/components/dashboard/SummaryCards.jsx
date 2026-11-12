import React from 'react';
import { Truck, Package, CheckCircle2, Clock, AlertTriangle, Shield } from 'lucide-react';
import Card from '../ui/Card';

const SummaryCards = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Active Vehicles',
      value: stats?.vehicles?.active || 0,
      total: stats?.vehicles?.total || 0,
      icon: Truck,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      description: 'vehicles on road'
    },
    {
      title: 'Active Deliveries',
      value: stats?.shipments?.active || 0,
      total: stats?.shipments?.total || 0,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'in transit now'
    },
    {
      title: 'Completed',
      value: stats?.shipments?.completed || 0,
      total: stats?.shipments?.total || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      description: 'delivered'
    },
    {
      title: 'Pending',
      value: stats?.shipments?.pending || 0,
      total: stats?.shipments?.total || 0,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      description: 'awaiting dispatch'
    },
    {
      title: 'Active Incidents',
      value: stats?.alerts?.active || 0,
      total: stats?.alerts?.critical || 0,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      description: 'alerts active',
      suffix: 'critical'
    },
    {
      title: 'High-Risk Areas',
      value: stats?.highRiskAreas || 0,
      icon: Shield,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      description: 'risk zones'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card
            key={index}
            className="bg-darkCard/40 border border-darkBorder/40 hover:border-customPrimary/30 transition-all p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.bgColor} border ${card.borderColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <div className="h-8 w-16 bg-darkBgSecondary animate-pulse rounded" />
                ) : (
                  <>
                    <span className="text-2xl font-black text-customText font-mono">
                      {card.value}
                    </span>
                    {card.total > 0 && (
                      <span className="text-[10px] text-customMuted font-semibold">
                        / {card.total}
                      </span>
                    )}
                  </>
                )}
              </div>
              
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-customMuted">
                {card.title}
              </h3>
              
              <p className="text-[9px] text-customMuted">
                {card.description}
                {card.suffix && card.total > 0 && ` (${card.total} ${card.suffix})`}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SummaryCards;
