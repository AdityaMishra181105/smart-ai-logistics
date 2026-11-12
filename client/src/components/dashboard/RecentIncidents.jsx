import React from 'react';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';

const RecentIncidents = ({ incidents, loading }) => {
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="danger" className="text-[8px] animate-pulse">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-[8px]">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="neutral" className="text-[8px]">MEDIUM</Badge>;
      default:
        return <Badge variant="neutral" className="text-[8px]">LOW</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="danger" className="text-[8px]">ACTIVE</Badge>;
      case 'ACKNOWLEDGED':
        return <Badge variant="warning" className="text-[8px]">ACK</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" className="text-[8px]">RESOLVED</Badge>;
      default:
        return <Badge variant="neutral" className="text-[8px]">{status}</Badge>;
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="bg-darkCard/40 border border-darkBorder/40">
      <CardHeader className="pb-3 border-b border-darkBorder/40">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Recent Incidents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner size="sm" text="Loading incidents..." />
          </div>
        ) : !incidents || incidents.length === 0 ? (
          <div className="py-12 text-center text-customMuted italic text-[10px]">
            No recent incidents reported
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-darkBorder/30 text-customMuted font-bold bg-darkBgSecondary/20 select-none">
                  <th className="px-4 py-2.5">Incident Type</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/20">
                {incidents.map((incident) => (
                  <tr
                    key={incident._id}
                    className="hover:bg-darkBgSecondary/10 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 ${
                          incident.severity === 'CRITICAL' ? 'text-red-400' :
                          incident.severity === 'HIGH' ? 'text-orange-400' :
                          'text-amber-400'
                        }`} />
                        <span className="font-semibold text-customText truncate max-w-[150px]">
                          {incident.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-customMuted">
                        <MapPin className="w-3 h-3" />
                        <span>{incident.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getSeverityBadge(incident.severity)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(incident.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-customMuted">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px]">
                          {formatTimeAgo(incident.reportedAt)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentIncidents;
