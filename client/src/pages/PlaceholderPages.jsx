import React from 'react';
import { 
  FileText, 
  Shield, 
  Users, 
  Home, 
  UserCheck, 
  Clipboard 
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const createPlaceholderPage = (title, Icon, description) => {
  return () => (
    <div className="space-y-6 text-xs text-customText max-w-[1200px] mx-auto p-1">
      <div className="pb-4 border-b border-darkBorder">
        <h2 className="text-lg font-bold tracking-wider text-customText uppercase">
          {title}
        </h2>
        <p className="text-[10px] text-customMuted mt-0.5">
          System Module Registry
        </p>
      </div>

      <Card className="bg-darkCard border border-darkBorder">
        <CardHeader className="pb-3 border-b border-darkBorder">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
            <Icon className="w-4 h-4 text-customPrimary animate-pulse" />
            Module Status: UNDER DEVELOPMENT
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-customPrimary/5 border border-customPrimary/15 rounded-full text-customPrimary">
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="text-xs font-bold text-customText uppercase tracking-wider">{title} Registry</h3>
          <p className="text-[10px] text-customMuted max-w-sm leading-relaxed">
            {description}. This frontend route has been registered. The interactive metrics panel and Mongoose database bindings will be established during subsequent module integration phases.
          </p>
          <div className="text-[9px] text-customMuted/70 border border-darkBorder px-3 py-1.5 rounded bg-darkBgSecondary/30 select-none">
            Waiting for backend service link
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Clients = createPlaceholderPage(
  'Clients Database',
  UserCheck,
  'Manage commercial suppliers, NGOs, and hospitals distribution profiles'
);

export const Reports = createPlaceholderPage(
  'Reports & Audits',
  Clipboard,
  'Generate operational performance audits, transport efficiency metrics, and summaries'
);
