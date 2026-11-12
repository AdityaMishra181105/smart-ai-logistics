import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthRequired, AccessDenied, NotFound, UnexpectedError } from './pages/ErrorPages';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import CreateShipment from './pages/CreateShipment';
import ShipmentDetails from './pages/ShipmentDetails';
import ShipmentTracking from './pages/ShipmentTracking';
import RouteAnalysis from './pages/RouteAnalysis';
import LiveTracking from './pages/LiveTracking';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Vehicles from './pages/Vehicles';
import RouteMgmt from './pages/Routes';
import { Clients } from './pages/PlaceholderPages';
import Reports from './pages/Reports';
import NgoReports from './pages/NgoReports';
import AIAssistantPage from './pages/AIAssistantPage';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Views */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/auth-required" element={<AuthRequired />} />
          <Route path="/unexpected-error" element={<UnexpectedError />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

          {/* Redirect removed routes */}
          <Route path="/warehouses" element={<Navigate to="/dashboard" replace />} />
          <Route path="/drivers" element={<Navigate to="/dashboard" replace />} />
          <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Views Layout Shell */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Common Protected Routes (Admin, Driver, NGO) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DRIVER', 'NGO']} />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="ai-assistant" element={<AIAssistantPage />} />
            </Route>

            {/* Admin & Driver Shipments Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DRIVER']} />}>
              <Route path="shipments" element={<Shipments />} />
              <Route path="shipments/:id" element={<ShipmentDetails />} />
              <Route path="shipments/:id/track" element={<ShipmentTracking />} />
              <Route path="track" element={<ShipmentTracking />} />
            </Route>

            {/* Common Alerts & Reports Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DRIVER', 'NGO']} />}>
              <Route path="alerts" element={<Alerts />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DRIVER']} />}>
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* NGO & Admin Orders Route */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'NGO']} />}>
              <Route path="orders" element={<Orders />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['NGO']} />}>
              <Route path="reports/ngo" element={<NgoReports />} />
            </Route>

            {/* Admin-Only Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="routes" element={<RouteMgmt />} />
              <Route path="shipments/create" element={<CreateShipment />} />
              <Route path="tracking" element={<LiveTracking />} />
              <Route path="routes/analysis" element={<RouteAnalysis />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="clients" element={<Clients />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </LanguageProvider>
  );
}

export default App;
