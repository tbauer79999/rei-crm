// src/pages/EmailConfirmationHandler.jsx - Complete Debug Version
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import { Card, CardContent } from '../components/ui/card';

const EmailConfirmationHandler = () => {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error', 'manual-close', 'debug'
  const [message, setMessage] = useState('Processing confirmation...');
  const [countdown, setCountdown] = useState(3);
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // ENHANCED LOGGING
        console.log('🔍 =========================');
        console.log('🔍 EmailConfirmationHandler mounted');
        console.log('📍 Current pathname:', location.pathname);
        console.log('🔗 Full URL:', window.location.href);
        console.log('❓ Search params:', window.location.search);
        console.log('# Hash:', window.location.hash);
        console.log('🔍 =========================');
        
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for auth tokens in either URL params or fragment
        const accessToken = urlParams.get('access_token') || fragment.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || fragment.get('refresh_token');
        const type = urlParams.get('type') || fragment.get('type');
        const error = urlParams.get('error') || fragment.get('error');
        const errorDescription = urlParams.get('error_description') || fragment.get('error_description');

        // Store debug info
        const debugData = {
          pathname: location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          urlParams: Object.fromEntries(urlParams),
          fragment: Object.fromEntries(fragment),
          extractedTokens: {
            accessToken: accessToken ? 'PRESENT' : 'MISSING',
            refreshToken: refreshToken ? 'PRESENT' : 'MISSING',
            type,
            error,
            errorDescription
          },
          timestamp: new Date().toISOString()
        };
        
        setDebugInfo(debugData);
        console.log('🐛 Debug data:', debugData);

        // If no tokens found, show debug info for 5 seconds then redirect
        if (!accessToken && !error && !type) {
          console.log('⚠️ No auth tokens found - might be direct access or wrong URL');
          setStatus('debug');
          setMessage('No authentication tokens found. Showing debug info...');
          
          setTimeout(() => {
            console.log('⚠️ Redirecting to login after debug display');
            navigate('/login');
          }, 5000);
          return;
        }

        console.log('Auth callback params:', { type, accessToken: !!accessToken, error });

        // Handle auth errors
        if (error) {
          console.error('Auth error:', error, errorDescription);
          setStatus('error');
          setMessage(`Authentication error: ${errorDescription || error}`);
          
          // Redirect to login after showing error
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Handle email confirmation
        if (type === 'signup' && accessToken) {
          console.log('✅ Email confirmation detected');
          setMessage('Confirming your email...');
          
          // Set the session using the tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setStatus('error');
            setMessage('Failed to establish session. Please try logging in.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          if (data?.user) {
            console.log('✅ Session established for user:', data.user.email);
            setStatus('success');
            setMessage('Email confirmed successfully!');

            // Check if this looks like a new tab (common scenario)
            const isLikelyNewTab = (
              !window.opener && // Not opened by JS
              window.history.length <= 2 && // Minimal history
              (document.referrer.includes('supabase') || document.referrer === '') // Came from Supabase or direct
            );

            console.log('🔍 Tab detection:', {
              hasOpener: !!window.opener,
              historyLength: window.history.length,
              referrer: document.referrer,
              isLikelyNewTab
            });

            if (isLikelyNewTab) {
              console.log('📋 Detected new tab from email link');
              setStatus('manual-close');
              setMessage('Email confirmed! Please close this tab and return to your original tab.');
              return;
            }

            // If it's the same tab or can redirect normally, proceed
            setTimeout(() => {
              // Check onboarding status and redirect appropriately
              checkOnboardingAndRedirect(data.user.id);
            }, 1500);
          }
        } else if (accessToken && !type) {
          // Has token but no type - might be other auth flow
          console.log('🔍 Has access token but no type, attempting session establishment');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!sessionError && data?.user) {
            console.log('✅ Session established, redirecting...');
            checkOnboardingAndRedirect(data.user.id);
          } else {
            console.log('❌ Could not establish session');
            setStatus('error');
            setMessage('Could not establish session. Please try logging in.');
            setTimeout(() => navigate('/login'), 2000);
          }
        } else {
          // Unknown auth callback type
          console.log('❓ Unknown auth callback type:', type);
          setStatus('error');
          setMessage('Unknown authentication type. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }

      } catch (error) {
        console.error('💥 Auth callback error:', error);
        setStatus('error');
        setMessage('An error occurred during authentication. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    const checkOnboardingAndRedirect = async (userId) => {
      try {
        console.log('🔍 Checking onboarding status for user:', userId);
        
        // Check if onboarding is complete
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('onboarding_complete')
          .eq('id', userId)
          .single();

        console.log('🔍 Tenant data:', tenant, 'Error:', error);

        if (error) {
          console.error('Error checking onboarding:', error);
          console.log('🔄 Defaulting to onboarding due to error');
          navigate('/onboarding');
          return;
        }

        if (tenant?.onboarding_complete) {
          console.log('✅ Onboarding complete, redirecting to dashboard');
          navigate('/dashboard');
        } else {
          console.log('🔄 Onboarding not complete, redirecting to onboarding');
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error during redirect check:', error);
        console.log('🔄 Defaulting to onboarding due to error');
        navigate('/onboarding');
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  // Auto-close countdown for new tabs
  useEffect(() => {
    if (status === 'manual-close') {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Attempt auto-close one more time
            try {
              console.log('🔄 Attempting auto-close...');
              window.close();
            } catch (e) {
              console.log('❌ Could not auto-close tab');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [status]);

  const handleManualClose = () => {
    try {
      console.log('🔄 Manual close requested');
      window.close();
    } catch (error) {
      console.log('❌ Manual close failed, navigating to onboarding');
      // If close fails, navigate to onboarding in this tab
      navigate('/onboarding');
    }
  };

  // Debug display
  if (status === 'debug') {
    return (
      <div className="min-h-screen bg-yellow-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-red-600">
            🔍 DEBUG: Auth Callback Handler
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Expected for email confirmation:</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>URL should contain access_token and refresh_token</li>
              <li>Type should be 'signup'</li>
              <li>This component should only load on /auth/callback</li>
              <li>URL typically looks like: /auth/callback#access_token=xxx&refresh_token=yyy&type=signup</li>
            </ul>
          </div>

          <div className="bg-red-100 border border-red-400 rounded p-4">
            <p className="text-red-800">
              <strong>Issue detected:</strong> No authentication tokens found. 
              This suggests the email confirmation link might not be working properly 
              or the redirect URL in Supabase might be incorrect.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Manual close UI for new tabs
  if (status === 'manual-close') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ✅ Email Confirmed!
            </h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                Your email has been successfully verified.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">
                  🎉 You're all set!
                </p>
                <p className="text-green-600 text-sm">
                  Please close this tab and return to your signup tab to continue.
                </p>
              </div>

              {countdown > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    Attempting auto-close in {countdown} seconds...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleManualClose}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02]"
              >
                Close This Tab
              </button>
              
              <p className="text-xs text-gray-500">
                Use Ctrl+W (Cmd+W on Mac) or click the X to close
              </p>
            </div>

            {/* Debug toggle */}
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              
              {showDebug && (
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded text-left overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </div>

            {/* Fallback link */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Can't close this tab?
              </p>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-blue-600 hover:text-blue-500 font-medium text-sm transition-colors"
              >
                Continue setup in this tab →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing/Success/Error states
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="text-center py-8">
          {/* Icon based on status */}
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
            status === 'processing' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
            status === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
            'bg-gradient-to-br from-red-500 to-pink-600'
          }`}>
            {status === 'processing' && (
              <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {status === 'success' && (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {status === 'processing' && '🔄 Processing...'}
            {status === 'success' && '✅ Success!'}
            {status === 'error' && '❌ Error'}
          </h2>
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-600">
              {message}
            </p>
            
            {status === 'processing' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Confirming your email...</span>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  Redirecting you to continue setup...
                </p>
              </div>
            )}
          </div>

          {/* Debug toggle for all states */}
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </button>
            
            {showDebug && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded text-left overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>

          <div className="text-xs text-gray-500 space-y-1 mt-4">
            <p>🔐 Securing your session...</p>
            <p>📱 Preparing your dashboard...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmationHandler;