// src/components/ProtectedRoute.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading session...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // Renders the child routes if authenticated
};

export default ProtectedRoute;
