import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

const RoleProtectedRoute = ({ allowedRoles = ['ADMIN'] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <LoadingSpinner size="lg" text="Authorizing credentials..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Safely normalize user role
  const userRole = (user.role || 'ADMIN').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  // Allow access if matching allowed roles or if user is ADMIN
  if (userRole === 'ADMIN' || normalizedAllowed.includes(userRole)) {
    return <Outlet />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default RoleProtectedRoute;
