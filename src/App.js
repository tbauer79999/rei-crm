import './lib/suppressLogs'; // 👈 Add this
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

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
import InvitationSignupPage from './pages/InvitationSignupPage';
import supabase from './lib/supabaseClient';
import HelpCenter from './components/HelpCenter';

// Component to handle root redirect with email confirmation check
function RootRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkConfirmationAndRedirect = async () => {
      console.log('🔍 RootRedirect - Checking URL params and session...');
      
      // Check for Supabase confirmation parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      const error = urlParams.get('error');
      const error_description = urlParams.get('error_description');
      
      // Also check hash params (Supabase sometimes uses these)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashType = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      console.log('URL params:', { type, error, hasAccessToken: !!accessToken });
      
      // Handle errors
      if (error) {
        console.error('❌ Supabase error:', error, error_description);
        navigate('/login', { 
          replace: true, 
          state: { error: error_description || error } 
        });
        return;
      }
      
      // Check if this is a confirmation callback
      if ((type === 'signup' || hashType === 'signup') && accessToken) {
        console.log('📧 Email confirmation callback detected, redirecting to handler...');
        navigate('/auth/callback' + window.location.hash + window.location.search);
        return;
      }
      
      // If we have type=signup in URL params but no access token, 
      // this might be a post-confirmation redirect
      if (type === 'signup') {
        console.log('📧 Post-email confirmation detected, checking session...');
        
        // Give Supabase a moment to establish the session
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/login', { replace: true });
          return;
        }
        
        if (session?.user) {
          console.log('✅ User confirmed and logged in:', session.user.email);
          
          // Check if this is an invited user
          const isInvitedUser = session.user.user_metadata?.invited_signup || 
                               session.user.user_metadata?.invitation_id;
          
          if (isInvitedUser) {
            console.log('🎯 Invited user detected, processing invitation...');
            
            // Call the edge function to process the invitation
            try {
              const { data, error: edgeError } = await supabase.functions.invoke('process-invitation', {
                body: {
                  user_id: session.user.id,
                  email: session.user.email,
                  invitation_id: session.user.user_metadata?.invitation_id || null
                }
              });

              if (edgeError) {
                console.error('❌ Edge Function error:', edgeError);
              } else {
                console.log('✅ Invitation processed successfully');
              }
            } catch (error) {
              console.error('Edge function error:', error);
            }
            
            // Navigate to dashboard for invited users
            navigate('/dashboard', { replace: true });
            return;
          } else {
            // Regular user, check onboarding
            try {
              const { data: tenant } = await supabase
                .from('tenants')
                .select('onboarding_complete')
                .eq('id', session.user.id)
                .single();

              if (tenant?.onboarding_complete) {
                navigate('/control-room', { replace: true });
              } else {
                navigate('/onboarding', { replace: true });
              }
            } catch (error) {
              navigate('/onboarding', { replace: true });
            }
            return;
          }
        }
      }

      // Normal redirect logic - no confirmation params
      console.log('🔄 Normal redirect logic...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('👤 User logged in:', session.user.email);
        
        // Check if invited user
        const isInvitedUser = session.user.user_metadata?.invited_signup || 
                             session.user.user_metadata?.invitation_id;
        
        if (isInvitedUser) {
          navigate('/dashboard', { replace: true });
        } else {
          // Check onboarding status
          try {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('onboarding_complete')
              .eq('id', session.user.id)
              .single();

            if (tenant?.onboarding_complete) {
              navigate('/control-room', { replace: true });
            } else {
              navigate('/onboarding', { replace: true });
            }
          } catch (error) {
            navigate('/control-room', { replace: true });
          }
        }
      } else {
        console.log('❌ No user session, redirecting to login');
        navigate('/login', { replace: true });
      }
    };

    checkConfirmationAndRedirect();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone routes for login and signup */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<WizardLayout />} />
        <Route path="/auth/callback" element={<EmailConfirmationHandler />} />
        <Route path="/auth/confirm" element={<EmailConfirmationHandler />} />
        <Route path="/invitation-signup" element={<InvitationSignupPage />} />
        
        {/* Protected Routes wrapped by Layout and OnboardingGuard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<RootRedirect />} />
          
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
            path="/help" 
            element={
              <OnboardingGuard>
                <Layout>
                  <HelpCenter />
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