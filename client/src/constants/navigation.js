import {
  LayoutDashboard,
  Truck,
  FileText,
  Shield,
  Route,
  BarChart3,
  AlertTriangle,
  Clipboard,
  Sparkles
} from 'lucide-react';

export const navigationConfig = {
  OVERVIEW: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'DRIVER', 'NGO']
    }
  ],
  OPERATIONS: [
    {
      name: 'Shipments',
      path: '/shipments',
      icon: Truck,
      roles: ['ADMIN', 'DRIVER']
    },
    {
      name: 'Orders',
      path: '/orders',
      icon: FileText,
      roles: ['ADMIN', 'NGO']
    },
    {
      name: 'Vehicles',
      path: '/vehicles',
      icon: Shield,
      roles: ['ADMIN']
    },
    {
      name: 'Routes',
      path: '/routes',
      icon: Route,
      roles: ['ADMIN']
    }
  ],
  INTELLIGENCE: [
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      roles: ['ADMIN']
    },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: AlertTriangle,
      roles: ['ADMIN', 'DRIVER', 'NGO']
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: Clipboard,
      roles: ['ADMIN', 'DRIVER']
    },
    {
      name: 'Reports',
      path: '/reports/ngo',
      icon: Clipboard,
      roles: ['NGO']
    },
    {
      name: 'AI Assistant',
      path: '/ai-assistant',
      icon: Sparkles,
      roles: ['ADMIN', 'DRIVER', 'NGO']
    }
  ]
};
