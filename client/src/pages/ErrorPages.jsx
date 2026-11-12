import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  UserX, 
  MapPinOff, 
  AlertOctagon, 
  ArrowLeft, 
  RefreshCw 
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const createErrorPage = (title, code, Icon, description, actionText, actionPath, isReload = false) => {
  return () => {
    const navigate = useNavigate();
    
    const handleAction = () => {
      if (isReload) {
        window.location.reload();
      } else {
        navigate(actionPath);
      }
    };

    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center p-6 text-customText">
        {/* Page Identity Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-customPrimary/10 border border-customPrimary/35 rounded-2xl text-customPrimary">
            <Icon className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-customText">{title}</h2>
          <span className="text-[10px] text-customPrimary font-extrabold uppercase tracking-widest leading-none">
            Error Code {code}
          </span>
        </div>

        <div className="w-full max-w-md bg-darkCard border border-darkBorder rounded-card p-6 shadow-2xl">
          <Card className="bg-transparent border-none p-0 shadow-none">
            <CardHeader className="pb-3 border-b border-darkBorder/60 mb-4 p-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-customText flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-customDanger" />
                Access Interrupted
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-center space-y-4">
              <p className="text-[11px] text-customMuted leading-relaxed">
                {description}
              </p>
              <Button
                onClick={handleAction}
                variant="primary"
                className="w-full py-2.5 text-xs font-bold uppercase tracking-wider justify-center gap-1.5"
              >
                {isReload ? <RefreshCw className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{actionText}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
};

export const AuthRequired = createErrorPage(
  'Authentication Required',
  '401',
  UserX,
  'Accessing this logistics node requires secure authorization. Please sign in to verify your credentials.',
  'Sign In Portal',
  '/login'
);

export const AccessDenied = createErrorPage(
  'Access Denied',
  '403',
  ShieldAlert,
  'You do not have permission to view this operational area. Access is restricted to designated personnel only. No sensitive details have been exposed.',
  'Return to Dashboard',
  '/dashboard'
);

export const NotFound = createErrorPage(
  'Logistics Route Not Found',
  '404',
  MapPinOff,
  'The requested system coordinates could not be located. NH corridor address might be incorrect or out of registry scope.',
  'Back to Dashboard',
  '/dashboard'
);

export const UnexpectedError = createErrorPage(
  'Unexpected System Error',
  '500',
  AlertOctagon,
  'An unexpected application state error has occurred. System logs have recorded the incident. You can safely attempt a page refresh.',
  'Refresh Page',
  '',
  true
);
