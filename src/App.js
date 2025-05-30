import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import WizardLayout from './components/onboarding/WizardLayout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AIControlRoom from './pages/AIControlRoom';
import Settings from './pages/Settings';
import LeadDetail from './pages/LeadDetail';
import EnterpriseAnalytics from './pages/EnterpriseAnalytics';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGuard from './components/OnboardingGuard'; // ✅ NEW

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone routes for login and signup */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<WizardLayout />} />

        {/* Protected Routes wrapped by Layout and OnboardingGuard */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <OnboardingGuard>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/control-room" replace />} />
                    <Route path="/control-room" element={<AIControlRoom />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/enterprise-analytics" element={<EnterpriseAnalytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/lead/:id" element={<LeadDetail />} />
                  </Routes>
                </Layout>
              </OnboardingGuard>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}