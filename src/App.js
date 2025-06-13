import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import WizardLayout from './components/onboarding/WizardLayout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AIControlRoom from './pages/AIControlRoom';
import Settings from './pages/Settings';
import LeadDetail from './pages/LeadDetail';
import EnterpriseAnalytics from './pages/EnterpriseAnalytics';
import BusinessAnalytics from './pages/businessAnalytics';
import CampaignManagement from './pages/campaignManagement';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EmailConfirmationHandler from './pages/EmailConfirmationHandler';
import ProtectedRoute from './components/ProtectedRoute';
import EnterpriseRoute from './components/EnterpriseRoute';
import OnboardingGuard from './components/OnboardingGuard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone routes for login and signup */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<WizardLayout />} />
        <Route path="/auth/callback" element={<EmailConfirmationHandler />} />

        {/* Protected Routes wrapped by Layout and OnboardingGuard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/control-room" replace />} />
          
          <Route
            path="/control-room"
            element={
              <OnboardingGuard>
                <Layout>
                  <AIControlRoom />
                </Layout>
              </OnboardingGuard>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <OnboardingGuard>
                <Layout>
                  <Dashboard />
                </Layout>
              </OnboardingGuard>
            }
          />
          
          {/* Enterprise Analytics - only for global_admin and enterprise_admin */}
          <Route 
            path="/enterprise-analytics" 
            element={
              <OnboardingGuard>
                <Layout>
                  <EnterpriseRoute>
                    <EnterpriseAnalytics />
                  </EnterpriseRoute>
                </Layout>
              </OnboardingGuard>
            } 
          />
          
          {/* Business Analytics - available to all authenticated users */}
          <Route 
            path="/business-analytics" 
            element={
              <OnboardingGuard>
                <Layout>
                  <BusinessAnalytics />
                </Layout>
              </OnboardingGuard>
            } 
          />
          
          {/* Campaign Management - for admin roles */}
          <Route 
            path="/campaign-management" 
            element={
              <OnboardingGuard>
                <Layout>
                  <CampaignManagement />
                </Layout>
              </OnboardingGuard>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <OnboardingGuard>
                <Layout>
                  <Settings />
                </Layout>
              </OnboardingGuard>
            } 
          />
          
          <Route 
            path="/lead/:id" 
            element={
              <OnboardingGuard>
                <Layout>
                  <LeadDetail />
                </Layout>
              </OnboardingGuard>
            } 
          />
        </Route>
      </Routes>
    </Router>
  );
}