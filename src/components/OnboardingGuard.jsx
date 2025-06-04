// src/components/OnboardingGuard.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuard({ children }) {
  const { user, loading, onboardingComplete, isGlobalAdmin, tenantId } = useAuth();
  const location = useLocation();

  // Show loading while auth is still loading
  if (loading) {
    return <div className="p-8">Loading session...</div>;
  }

  // If no user, let ProtectedRoute handle redirect to login
  if (!user) {
    return children;
  }

  // Global admins skip onboarding entirely
  if (isGlobalAdmin) {
    return children;
  }

  // Check if user needs onboarding
  const needsOnboarding = !tenantId || !onboardingComplete;

  // If needs onboarding and not already on onboarding page, redirect
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is complete but on onboarding page, redirect to dashboard
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}